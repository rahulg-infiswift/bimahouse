# backend/app/export_utils.py
from __future__ import annotations

import csv
import io
import os
from decimal import Decimal
from typing import Any, Dict, Iterable, List, Tuple, Optional

from openpyxl import Workbook
from openpyxl.utils import get_column_letter


# Commission configuration - loaded from grid_points.csv (keyed by partner_bhp_id)
_commission_config: Optional[Dict[str, Dict[str, Any]]] = None

# Default commission rates
DEFAULT_COMMISSION = {
    "base_for_po": "Net",
    "base_rate": Decimal("0.39"),
    "dev_rate": Decimal("0.03"),
}


def _load_commission_config() -> Dict[str, Dict[str, Any]]:
    """Load commission rates from grid_points.csv, keyed by partner_bhp_id"""
    global _commission_config
    if _commission_config is not None:
        return _commission_config
    
    _commission_config = {}
    
    # Try to load from file
    csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "grid_points.csv")
    if os.path.exists(csv_path):
        with open(csv_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                partner_id = row.get("partner_bhp_id", "").strip()
                if partner_id:
                    _commission_config[partner_id] = {
                        "base_for_po": row.get("base_for_po", "Net").strip(),
                        "base_rate": Decimal(row.get("base_rate", "0.39")),
                        "dev_rate": Decimal(row.get("dev_rate", "0.03")),
                    }
    
    return _commission_config


def get_commission_rates(partner_bhp_id: Optional[str] = None) -> Dict[str, Any]:
    """Get commission rates for a specific partner by their BHP ID"""
    config = _load_commission_config()
    if partner_bhp_id and partner_bhp_id in config:
        return config[partner_bhp_id]
    return DEFAULT_COMMISSION.copy()


def _stringify(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, (str, int, float, bool)):
        return str(v)
    # dict/list/etc
    import json
    return json.dumps(v, ensure_ascii=False)

def json_to_path_rows(data: Any) -> List[Tuple[str, str]]:
    """
    Flatten any JSON into rows of (path, value).
    Example paths:
      policy_number
      insured.name
      vehicles[0].registration_number
    """
    rows: List[Tuple[str, str]] = []

    def walk(node: Any, path: str):
        if isinstance(node, dict):
            if not node:
                rows.append((path, "")) if path else None
            for k, v in node.items():
                new_path = f"{path}.{k}" if path else str(k)
                walk(v, new_path)
        elif isinstance(node, list):
            if not node:
                rows.append((path, "")) if path else None
            for i, v in enumerate(node):
                new_path = f"{path}[{i}]"
                walk(v, new_path)
        else:
            rows.append((path, _stringify(node)))

    walk(data, "")
    return rows


def json_to_csv_bytes(data: Any) -> bytes:
    rows = json_to_path_rows(data)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["path", "value"])
    for p, v in rows:
        w.writerow([p, v])
    return buf.getvalue().encode("utf-8")


def _autosize_worksheet(ws) -> None:
    # Simple autosize by max string length in column
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            try:
                max_len = max(max_len, len(str(cell.value or "")))
            except Exception:
                pass
        ws.column_dimensions[col_letter].width = min(max(12, max_len + 2), 60)


def _write_kv_sheet(wb: Workbook, title: str, obj: Dict[str, Any]) -> None:
    ws = wb.create_sheet(title=title[:31])
    ws.append(["key", "value"])
    for k, v in obj.items():
        ws.append([k, _stringify(v)])
    _autosize_worksheet(ws)


def _write_table_sheet(wb: Workbook, title: str, rows: List[Dict[str, Any]]) -> None:
    ws = wb.create_sheet(title=title[:31])
    # union of keys
    keys = sorted({k for r in rows for k in r.keys()})
    ws.append(keys)
    for r in rows:
        ws.append([_stringify(r.get(k)) for k in keys])
    _autosize_worksheet(ws)


def json_to_xlsx_bytes(data: Any) -> bytes:
    """
    Creates an XLSX with:
      - Overview sheet: flattened path/value
      - For each top-level key:
          - dict => KeyValue sheet
          - list[dict] => table sheet
          - other => KeyValue row in a small sheet
    """
    wb = Workbook()
    # replace default active sheet with Overview
    ws0 = wb.active
    ws0.title = "Overview"
    ws0.append(["path", "value"])
    for p, v in json_to_path_rows(data):
        ws0.append([p, v])
    _autosize_worksheet(ws0)

    if isinstance(data, dict):
        for k, v in data.items():
            if isinstance(v, dict):
                _write_kv_sheet(wb, k, v)
            elif isinstance(v, list) and all(isinstance(x, dict) for x in v):
                _write_table_sheet(wb, k, v)  # type: ignore[arg-type]
            else:
                _write_kv_sheet(wb, k, {"value": v})

    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


def _flatten_json(data: Any, prefix: str = "") -> Dict[str, str]:
    """Flatten a nested JSON into a flat dict with dot-notation keys."""
    result: Dict[str, str] = {}
    
    if isinstance(data, dict):
        for k, v in data.items():
            new_key = f"{prefix}.{k}" if prefix else k
            result.update(_flatten_json(v, new_key))
    elif isinstance(data, list):
        for i, v in enumerate(data):
            new_key = f"{prefix}[{i}]"
            result.update(_flatten_json(v, new_key))
    else:
        result[prefix] = _stringify(data)
    
    return result


def _extract_premium_from_policy(extracted_json: Dict[str, Any]) -> Optional[Decimal]:
    """
    Extract premium value from policy extracted JSON.
    Looks for premium.total_premium_payable first, then falls back to other common fields.
    """
    if not extracted_json:
        return None
    
    # First, check for the structured premium object (from PolicyExtractV1)
    if "premium" in extracted_json and isinstance(extracted_json["premium"], dict):
        premium_obj = extracted_json["premium"]
        if "total_premium_payable" in premium_obj:
            try:
                val = premium_obj["total_premium_payable"]
                if val is not None and val != "":
                    if isinstance(val, str):
                        val = val.replace(",", "").replace("₹", "").replace("Rs.", "").replace("Rs", "").strip()
                    return Decimal(str(val))
            except (ValueError, TypeError):
                pass
        # Also try total_package_premium_A_plus_B as fallback
        if "total_package_premium_A_plus_B" in premium_obj:
            try:
                val = premium_obj["total_package_premium_A_plus_B"]
                if val is not None and val != "":
                    if isinstance(val, str):
                        val = val.replace(",", "").replace("₹", "").replace("Rs.", "").replace("Rs", "").strip()
                    return Decimal(str(val))
            except (ValueError, TypeError):
                pass
    
    # Fallback: check top-level premium field names
    premium_fields = [
        "total_premium_payable",
        "net_premium",
        "total_premium",
        "gross_premium",
        "policy_premium",
        "premium_amount",
    ]
    
    for field in premium_fields:
        if field in extracted_json:
            try:
                val = extracted_json[field]
                if val is not None and val != "":
                    if isinstance(val, str):
                        val = val.replace(",", "").replace("₹", "").replace("Rs.", "").replace("Rs", "").strip()
                    return Decimal(str(val))
            except (ValueError, TypeError):
                continue
    
    return None


def policies_to_xlsx_bytes(policies: List[Any], partners_map: Optional[Dict[str, Any]] = None) -> bytes:
    """
    Creates an XLSX with one row per policy.
    Includes partner details and commission calculations.
    
    Args:
        policies: List of Policy objects
        partners_map: Dict mapping user_id to PartnerLead objects (optional)
    """
    wb = Workbook()
    ws = wb.active
    ws.title = "Policies"
    
    # Collect all unique keys across all policies
    all_keys: set = set()
    flattened_policies: List[Dict[str, str]] = []
    
    for policy in policies:
        flat: Dict[str, str] = {}
        
        # Partner details (if available)
        partner = partners_map.get(policy.user_id) if partners_map else None
        partner_bhp_id = None
        if partner:
            flat["partner_name"] = partner.full_name or ""
            flat["partner_bhl_id"] = partner.lead_display_id or ""
            flat["partner_bhp_id"] = partner.partner_display_id or ""
            partner_bhp_id = partner.partner_display_id
            # Get city from profile_data
            if partner.profile_data:
                flat["partner_city"] = partner.profile_data.city or ""
            else:
                flat["partner_city"] = ""
        else:
            flat["partner_name"] = ""
            flat["partner_bhl_id"] = ""
            flat["partner_bhp_id"] = ""
            flat["partner_city"] = ""
        
        # Policy metadata
        flat["policy_id"] = str(policy.id)
        flat["original_filename"] = policy.original_filename
        flat["created_at"] = policy.created_at.isoformat() if policy.created_at else ""
        flat["schema_version"] = policy.schema_version or ""
        
        # Extract premium for commission calculations
        premium = _extract_premium_from_policy(policy.extracted_json)
        if premium is None:
            premium = Decimal("15000")
        
        # Get partner-specific commission rates from grid_points.csv
        commission_rates = get_commission_rates(partner_bhp_id)
        base_for_po = commission_rates["base_for_po"]
        base_rate = commission_rates["base_rate"]
        dev_rate = commission_rates["dev_rate"]
        out_rate = base_rate + dev_rate
        
        # Commission details
        flat["base_for_po_calculation"] = base_for_po
        flat["commissionable_premium"] = str(premium) if premium else ""
        flat["base_rate"] = f"{float(base_rate) * 100:.1f}%"
        flat["base_amount"] = str(round(premium * base_rate, 2)) if premium else ""
        flat["dev_rate"] = f"{float(dev_rate) * 100:.1f}%"
        flat["dev_amount"] = str(round(premium * dev_rate, 2)) if premium else ""
        flat["out_rate"] = f"{float(out_rate) * 100:.1f}%"
        flat["out_amount"] = str(round(premium * out_rate, 2)) if premium else ""
        
        # Add extracted JSON fields
        if policy.extracted_json:
            extracted_flat = _flatten_json(policy.extracted_json)
            flat.update(extracted_flat)
        
        all_keys.update(flat.keys())
        flattened_policies.append(flat)
    
    # Define column order: partner info first, then commission, then policy metadata, then extracted fields
    partner_keys = ["partner_name", "partner_bhl_id", "partner_bhp_id", "partner_city"]
    commission_keys = [
        "base_for_po_calculation", "commissionable_premium", 
        "base_rate", "base_amount", "dev_rate", "dev_amount", "out_rate", "out_amount"
    ]
    metadata_keys = ["policy_id", "original_filename", "created_at", "schema_version"]
    priority_keys = partner_keys + commission_keys + metadata_keys
    extracted_keys = sorted(k for k in all_keys if k not in priority_keys)
    ordered_keys = priority_keys + extracted_keys
    
    # Write header row
    ws.append(ordered_keys)
    
    # Write data rows
    for flat in flattened_policies:
        row = [flat.get(k, "") for k in ordered_keys]
        ws.append(row)
    
    _autosize_worksheet(ws)
    
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


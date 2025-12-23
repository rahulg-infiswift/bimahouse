# backend/app/export_utils.py
from __future__ import annotations

import csv
import io
from typing import Any, Dict, Iterable, List, Tuple

from openpyxl import Workbook
from openpyxl.utils import get_column_letter


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

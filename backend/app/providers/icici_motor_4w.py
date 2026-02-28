from __future__ import annotations

import time
from typing import Any

from app.core.config import settings
from app.providers.base import QuoteProvider


class IciciMotor4WProvider(QuoteProvider):
    insurer_code = "icici"

    def get_quote(self, canonical_request: dict[str, Any], *, is_live: bool) -> dict[str, Any]:
        payload = self._to_provider_request(canonical_request)
        fallback = self._compute_fallback(canonical_request)
        raw = self._post_or_fallback(settings.icici_motor_4w_get_quote_url, payload, fallback, is_live=is_live)
        return self._normalize(raw)

    def _compute_fallback(self, canonical_request: dict[str, Any]) -> dict[str, Any]:
        coverage = canonical_request.get("coverage") or {}
        policy_history = canonical_request.get("policy_history") or {}

        idv = float(coverage.get("idv") or 600000)
        base_od = round(idv * 0.0300)
        tp = 7897
        ncb_pct = int(policy_history.get("previous_policy_ncb_percentage") or 0)
        ncb = round(base_od * ncb_pct / 100)
        od_after_ncb = base_od - ncb
        premium = od_after_ncb + tp
        gst = round(premium * 0.18)
        final = premium + gst

        return {
            "BaseOdPremium": base_od,
            "BaseTPPremium": tp,
            "NcbAmount": ncb,
            "NcbPercentage": ncb_pct,
            "OdPremium": od_after_ncb,
            "GST": gst,
            "Premium": premium,
            "FinalPremium": final,
            "IDV": idv,
            "MinIDV": round(idv * 0.9),
            "MaxIDV": round(idv * 1.1),
            "Success": True,
            "ErrorMessage": "",
        }

    def _to_provider_request(self, canonical_request: dict[str, Any]) -> dict[str, Any]:
        vehicle = canonical_request.get("vehicle") or {}
        policy_history = canonical_request.get("policy_history") or {}
        coverage = canonical_request.get("coverage") or {}
        proposer = canonical_request.get("proposer") or {}

        return {
            "ProductCode": 22,
            "RegistrationNo": vehicle.get("registration_no") or "",
            "OwnerType": vehicle.get("owner_type") or 1,
            "MakeCode": vehicle.get("make_code") or 10,
            "ModelCode": vehicle.get("model_code") or 11846,
            "RTOCode": vehicle.get("rto_code") or 12621,
            "RegistrationDate": vehicle.get("registration_date") or "2020-01-01T00:00:00Z",
            "IDVType": coverage.get("idv_type") or 1,
            "HasExistingPACover": bool(coverage.get("has_existing_pa_cover", True)),
            "PreviousPolicyClaimed": bool(policy_history.get("previous_policy_claimed", False)),
            "PreviousPolicyNcbPercentage": int(policy_history.get("previous_policy_ncb_percentage") or 0),
            "PreviousPolicyExpiryDate": policy_history.get("previous_policy_expiry_date") or "2024-12-31T00:00:00Z",
            "PreviousPolicyType": int(policy_history.get("previous_policy_type") or 1),
            "IDV": float(coverage.get("idv") or 600000.0),
            "Pincode": proposer.get("pincode") or "",
            "RequestId": canonical_request.get("request_id") or str(int(time.time() * 1000)),
            "IsLive": bool(canonical_request.get("is_live", False)),
        }

    def _normalize(self, raw: dict[str, Any]) -> dict[str, Any]:
        return {
            "success": bool(raw.get("Success", False)),
            "insurer_code": self.insurer_code,
            "premium": raw.get("Premium"),
            "final_premium": raw.get("FinalPremium"),
            "gst": raw.get("GST"),
            "idv": raw.get("IDV"),
            "min_idv": raw.get("MinIDV"),
            "max_idv": raw.get("MaxIDV"),
            "error_message": raw.get("ErrorMessage") or None,
            "provider_response": raw,
        }

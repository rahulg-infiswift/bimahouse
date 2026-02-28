from __future__ import annotations

from typing import Any

from app.providers.base import QuoteProvider


class HdfcErgoHomeProvider(QuoteProvider):
    insurer_code = "hdfc_ergo"

    def get_quote(self, canonical_request: dict[str, Any], *, is_live: bool) -> dict[str, Any]:
        fallback = self._compute_fallback(canonical_request)
        raw = self._post_or_fallback(None, {}, fallback, is_live=is_live)
        return self._normalize(raw)

    def _compute_fallback(self, canonical_request: dict[str, Any]) -> dict[str, Any]:
        property_ = canonical_request.get("property") or {}
        location = canonical_request.get("location") or {}
        coverage = canonical_request.get("coverage") or {}

        property_value = float(property_.get("property_value") or 5000000)
        contents_value = float(coverage.get("contents_value") or 500000)
        construction = property_.get("construction_type") or "rcc"
        property_type = property_.get("property_type") or "owned"
        flood_zone = bool(location.get("flood_zone", False))
        eq_zone = location.get("earthquake_zone") or "II"
        age = int(property_.get("age_of_building_years") or 5)

        construction_loading = {"rcc": 1.0, "load_bearing": 1.15, "prefab": 1.30}.get(construction, 1.0)
        flood_loading = 1.25 if flood_zone else 1.0
        eq_loading = {"I": 1.0, "II": 1.05, "III": 1.15, "IV": 1.30}.get(eq_zone, 1.0)
        age_loading = 1 + max(0, (age - 10) // 10) * 0.05

        building_premium = 0.0
        if property_type == "owned" and coverage.get("building_cover", True):
            building_premium = round(property_value * 0.0005 * construction_loading * flood_loading * eq_loading * age_loading)

        contents_premium = 0.0
        if coverage.get("contents_cover", True):
            contents_premium = round(contents_value * 0.0008 * flood_loading)

        resettlement = 500 if coverage.get("temporary_resettlement") else 0

        provider_factor = 0.96  # HDFC ERGO: competitive on home
        premium = round((building_premium + contents_premium + resettlement) * provider_factor)
        gst = round(premium * 0.18)
        final = premium + gst

        return {
            "Premium": premium,
            "GST": gst,
            "FinalPremium": final,
            "PlanName": "HDFC ERGO Home Shield",
            "Success": True,
            "ErrorMessage": "",
        }

    def _normalize(self, raw: dict[str, Any]) -> dict[str, Any]:
        return {
            "success": bool(raw.get("Success", False)),
            "insurer_code": self.insurer_code,
            "premium": raw.get("Premium"),
            "final_premium": raw.get("FinalPremium"),
            "gst": raw.get("GST"),
            "idv": None,
            "min_idv": None,
            "max_idv": None,
            "error_message": raw.get("ErrorMessage") or None,
            "provider_response": raw,
        }

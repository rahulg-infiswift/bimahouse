from __future__ import annotations

from typing import Any

from app.providers.base import QuoteProvider


class StarHealthProvider(QuoteProvider):
    insurer_code = "star_health"

    def get_quote(self, canonical_request: dict[str, Any], *, is_live: bool) -> dict[str, Any]:
        fallback = self._compute_fallback(canonical_request)
        raw = self._post_or_fallback(None, {}, fallback, is_live=is_live)
        return self._normalize(raw)

    def _compute_fallback(self, canonical_request: dict[str, Any]) -> dict[str, Any]:
        coverage = canonical_request.get("coverage") or {}
        members = canonical_request.get("members") or {}
        proposer = canonical_request.get("proposer") or {}

        sum_insured = float(coverage.get("sum_insured") or 500000)
        member_count = int(members.get("member_count") or 1)
        oldest_age = int(members.get("oldest_age") or 30)
        pre_existing = bool(coverage.get("pre_existing_conditions", False))
        city_tier = proposer.get("city_tier") or "metro"

        base_rate = 0.012
        age_loading = max(0, (oldest_age - 30) // 10) * 0.0015
        member_multiplier = 1 + (member_count - 1) * 0.30
        pec_loading = 1.20 if pre_existing else 1.0
        city_multiplier = {"metro": 1.15, "tier1": 1.05, "tier2": 1.0, "rural": 0.90}.get(city_tier, 1.0)
        provider_factor = 0.97  # Star Health: slightly below market

        premium = round(
            sum_insured * (base_rate + age_loading) * member_multiplier * pec_loading * city_multiplier * provider_factor
        )
        gst = round(premium * 0.18)
        final = premium + gst

        return {
            "Premium": premium,
            "GST": gst,
            "FinalPremium": final,
            "SumInsured": sum_insured,
            "PlanName": "Star Comprehensive",
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

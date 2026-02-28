from __future__ import annotations

from typing import Any

from app.providers.base import QuoteProvider


class IciciTravelProvider(QuoteProvider):
    insurer_code = "icici"

    def get_quote(self, canonical_request: dict[str, Any], *, is_live: bool) -> dict[str, Any]:
        fallback = self._compute_fallback(canonical_request)
        raw = self._post_or_fallback(None, {}, fallback, is_live=is_live)
        return self._normalize(raw)

    def _compute_fallback(self, canonical_request: dict[str, Any]) -> dict[str, Any]:
        trip = canonical_request.get("trip") or {}
        travellers = canonical_request.get("travellers") or {}
        coverage = canonical_request.get("coverage") or {}

        duration = int(trip.get("trip_duration_days") or 7)
        count = int(travellers.get("count") or 1)
        oldest_age = int(travellers.get("oldest_age") or 30)
        is_international = trip.get("destination_type") == "international"
        coverage_amount = float(coverage.get("coverage_amount_usd") or 50000)

        daily_base = 80.0 if is_international else 20.0
        baseline = 50000 if is_international else 500000
        coverage_loading = 1 + max(0, (coverage_amount - baseline) / baseline) * 0.3

        if oldest_age >= 70:
            age_factor = 1.80
        elif oldest_age >= 60:
            age_factor = 1.40
        else:
            age_factor = 1.0

        addon_loading = 1.0
        if coverage.get("trip_cancellation"):
            addon_loading += 0.15
        if coverage.get("baggage_loss"):
            addon_loading += 0.10

        provider_factor = 1.00  # ICICI: market average

        premium = round(daily_base * duration * count * coverage_loading * age_factor * addon_loading * provider_factor)
        gst = round(premium * 0.18)
        final = premium + gst

        return {
            "Premium": premium,
            "GST": gst,
            "FinalPremium": final,
            "PlanName": "ICICI Lombard Travel Shield",
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

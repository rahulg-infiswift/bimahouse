from __future__ import annotations

import uuid
from typing import Any

from app.providers.registry import get_travel_providers
from app.quotes.common_schemas import QuoteItemOut, QuoteResultOut
from app.quotes.travel_schemas import TravelQuoteRequestIn

DISCLAIMER = (
    "Comparison is indicative for advisory use only. "
    "Final premium, coverage, and issuance are subject to insurer underwriting and policy terms."
)


def _build_canonical_request(req: TravelQuoteRequestIn, *, is_live: bool) -> dict[str, Any]:
    oldest_age = max(req.travellers.ages) if req.travellers.ages else 30

    return {
        "request_id": str(uuid.uuid4()),
        "product": "travel",
        "is_live": is_live,
        "trip": {
            "destination_type": req.trip.destination_type,
            "destination_country": req.trip.destination_country,
            "trip_duration_days": req.trip.trip_duration_days,
            "trip_purpose": req.trip.trip_purpose,
        },
        "travellers": {
            "count": req.travellers.count,
            "ages": req.travellers.ages,
            "oldest_age": oldest_age,
        },
        "coverage": {
            "coverage_amount_usd": req.coverage.coverage_amount_usd,
            "medical_cover": req.coverage.medical_cover,
            "trip_cancellation": req.coverage.trip_cancellation,
            "baggage_loss": req.coverage.baggage_loss,
        },
    }


def fetch_travel_quotes(request: TravelQuoteRequestIn, *, is_live: bool) -> QuoteResultOut:
    canonical = _build_canonical_request(request, is_live=is_live)

    raw_quotes: list[dict[str, Any]] = []
    for provider in get_travel_providers():
        raw_quotes.append(provider.get_quote(canonical, is_live=is_live))

    sorted_quotes = sorted(
        raw_quotes,
        key=lambda q: (
            not bool(q.get("success")),
            float(q.get("final_premium")) if isinstance(q.get("final_premium"), (int, float)) else float("inf"),
        ),
    )

    successful = [q for q in sorted_quotes if q.get("success") and isinstance(q.get("final_premium"), (int, float))]
    best = successful[0].get("insurer_code") if successful else None

    items = [
        QuoteItemOut(
            insurer_code=q.get("insurer_code", "unknown"),
            premium=q.get("premium"),
            final_premium=q.get("final_premium"),
            gst=q.get("gst"),
            idv=q.get("idv"),
            min_idv=q.get("min_idv"),
            max_idv=q.get("max_idv"),
            success=bool(q.get("success")),
            error_message=q.get("error_message"),
        )
        for q in sorted_quotes
    ]

    return QuoteResultOut(quotes=items, best_value_insurer=best, disclaimer=DISCLAIMER)

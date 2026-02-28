from __future__ import annotations

import uuid
from typing import Any

from app.providers.registry import get_home_providers
from app.quotes.common_schemas import QuoteItemOut, QuoteResultOut
from app.quotes.home_schemas import HomeQuoteRequestIn

DISCLAIMER = (
    "Comparison is indicative for advisory use only. "
    "Final premium, coverage, and issuance are subject to insurer underwriting and policy terms."
)


def _build_canonical_request(req: HomeQuoteRequestIn, *, is_live: bool) -> dict[str, Any]:
    return {
        "request_id": str(uuid.uuid4()),
        "product": "home",
        "is_live": is_live,
        "property": {
            "property_type": req.property.property_type,
            "construction_type": req.property.construction_type,
            "built_up_area_sqft": req.property.built_up_area_sqft,
            "property_value": req.property.property_value,
            "age_of_building_years": req.property.age_of_building_years,
        },
        "location": {
            "city": req.location.city,
            "pincode": req.location.pincode,
            "flood_zone": req.location.flood_zone,
            "earthquake_zone": req.location.earthquake_zone,
        },
        "coverage": {
            "building_cover": req.coverage.building_cover,
            "contents_value": req.coverage.contents_value,
            "contents_cover": req.coverage.contents_cover,
            "temporary_resettlement": req.coverage.temporary_resettlement,
        },
    }


def fetch_home_quotes(request: HomeQuoteRequestIn, *, is_live: bool) -> QuoteResultOut:
    canonical = _build_canonical_request(request, is_live=is_live)

    raw_quotes: list[dict[str, Any]] = []
    for provider in get_home_providers():
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

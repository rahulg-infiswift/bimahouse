from __future__ import annotations

import uuid
from typing import Any

from app.providers.registry import get_health_providers
from app.quotes.common_schemas import QuoteItemOut, QuoteResultOut
from app.quotes.health_schemas import HealthQuoteRequestIn

DISCLAIMER = (
    "Comparison is indicative for advisory use only. "
    "Final premium, coverage, and issuance are subject to insurer underwriting and policy terms."
)


def _build_canonical_request(req: HealthQuoteRequestIn, *, is_live: bool) -> dict[str, Any]:
    all_ages = [req.members.self_age]
    if req.members.spouse and req.members.spouse_age:
        all_ages.append(req.members.spouse_age)
    all_ages.extend(req.members.children_ages)
    member_count = len(all_ages)
    oldest_age = max(all_ages)

    return {
        "request_id": str(uuid.uuid4()),
        "product": "health",
        "is_live": is_live,
        "members": {
            "self_age": req.members.self_age,
            "spouse": req.members.spouse,
            "spouse_age": req.members.spouse_age,
            "children_count": req.members.children_count,
            "children_ages": req.members.children_ages,
            "member_count": member_count,
            "oldest_age": oldest_age,
        },
        "coverage": {
            "sum_insured": req.coverage.sum_insured,
            "room_type": req.coverage.room_type,
            "pre_existing_conditions": req.coverage.pre_existing_conditions,
            "maternity_cover": req.coverage.maternity_cover,
        },
        "proposer": {
            "city_tier": req.proposer.city_tier,
            "pincode": req.proposer.pincode,
        },
    }


def fetch_health_quotes(request: HealthQuoteRequestIn, *, is_live: bool) -> QuoteResultOut:
    canonical = _build_canonical_request(request, is_live=is_live)

    raw_quotes: list[dict[str, Any]] = []
    for provider in get_health_providers():
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

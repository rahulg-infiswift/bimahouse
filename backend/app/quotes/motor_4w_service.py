from __future__ import annotations

import uuid
from typing import Any

from app.providers.registry import get_motor_4w_providers
from app.quotes.common_schemas import QuoteItemOut, QuoteResultOut
from app.quotes.motor_4w_schemas import Motor4WQuoteRequestIn

DISCLAIMER = (
    "Comparison is indicative for advisory use only. "
    "Final premium, coverage, and issuance are subject to insurer underwriting and policy terms."
)


def _build_canonical_request(req: Motor4WQuoteRequestIn, *, is_live: bool) -> dict[str, Any]:
    return {
        "request_id": str(uuid.uuid4()),
        "vehicle_category": "4w",
        "is_live": is_live,
        "proposer": {
            "pincode": req.proposer.pincode,
            "age": req.proposer.age,
            "city": req.proposer.city,
        },
        "vehicle": {
            "registration_no": req.vehicle.registration_no,
            "owner_type": req.vehicle.owner_type,
            "make_code": req.vehicle.make_code,
            "model_code": req.vehicle.model_code,
            "rto_code": req.vehicle.rto_code,
            "registration_date": req.vehicle.registration_date,
        },
        "policy_history": {
            "previous_policy_claimed": req.policy_history.previous_policy_claimed,
            "previous_policy_ncb_percentage": req.policy_history.previous_policy_ncb_percentage,
            "previous_policy_expiry_date": req.policy_history.previous_policy_expiry_date,
            "previous_policy_type": req.policy_history.previous_policy_type,
            "previous_policy_has_zd_cover": req.policy_history.previous_policy_has_zd_cover,
            "previous_insurer_code": req.policy_history.previous_insurer_code,
            "previous_policy_number": req.policy_history.previous_policy_number,
        },
        "coverage": {
            "idv_type": req.coverage.idv_type,
            "idv": req.coverage.idv,
            "addons": req.coverage.addons,
            "has_existing_pa_cover": req.coverage.has_existing_pa_cover,
            "number_of_driver": req.coverage.number_of_driver,
            "number_of_employee": req.coverage.number_of_employee,
            "electrical_accessories_si": req.coverage.electrical_accessories_si,
            "non_electrical_accessories_si": req.coverage.non_electrical_accessories_si,
            "has_anti_theft_device": req.coverage.has_anti_theft_device,
        },
    }


def fetch_motor_4w_quotes(request: Motor4WQuoteRequestIn, *, is_live: bool) -> QuoteResultOut:
    canonical = _build_canonical_request(request, is_live=is_live)

    raw_quotes: list[dict[str, Any]] = []
    for provider in get_motor_4w_providers():
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

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_posp_application_id
from app.core.db import get_db
from app.partners.models import PospApplication
from app.quotes.common_schemas import QuoteResultOut

# Motor 2W
from app.quotes.motor_2w_schemas import QuoteRequestIn
from app.quotes.motor_2w_service import fetch_motor_2w_quotes

# Motor 4W
from app.quotes.motor_4w_schemas import Motor4WQuoteRequestIn
from app.quotes.motor_4w_service import fetch_motor_4w_quotes

# Health
from app.quotes.health_schemas import HealthQuoteRequestIn
from app.quotes.health_service import fetch_health_quotes

# Travel
from app.quotes.travel_schemas import TravelQuoteRequestIn
from app.quotes.travel_service import fetch_travel_quotes

# Home
from app.quotes.home_schemas import HomeQuoteRequestIn
from app.quotes.home_service import fetch_home_quotes

router = APIRouter(tags=["Quotes"])


def _get_current_approved_posp_application(
    posp_application_id: uuid.UUID = Depends(get_current_posp_application_id),
    db: Session = Depends(get_db),
) -> PospApplication:
    posp_application = db.query(PospApplication).filter(PospApplication.id == posp_application_id).first()
    if not posp_application:
        raise HTTPException(status_code=401, detail="Invalid partner session")
    if posp_application.status != "approved":
        raise HTTPException(status_code=403, detail="Partner account is not approved")
    return posp_application


# ─── Motor 2W (existing, backward compatible) ───────────────────────────────


@router.post("/v1/partner/quotes", response_model=QuoteResultOut)
def partner_get_quotes(
    payload: QuoteRequestIn,
    posp: PospApplication = Depends(_get_current_approved_posp_application),
):
    """Fetch insurance quotes for an approved partner (live mode)."""
    return fetch_motor_2w_quotes(payload, is_live=True)


@router.post("/v1/public/quotes", response_model=QuoteResultOut)
def public_get_quotes(payload: QuoteRequestIn):
    """Fetch simulated insurance quotes (no auth required)."""
    return fetch_motor_2w_quotes(payload, is_live=False)


# ─── Motor 4W ────────────────────────────────────────────────────────────────


@router.post("/v1/partner/motor-4w/quotes", response_model=QuoteResultOut)
def partner_get_motor_4w_quotes(
    payload: Motor4WQuoteRequestIn,
    posp: PospApplication = Depends(_get_current_approved_posp_application),
):
    """Fetch car (4W) insurance quotes for an approved partner (live mode)."""
    return fetch_motor_4w_quotes(payload, is_live=True)


@router.post("/v1/public/motor-4w/quotes", response_model=QuoteResultOut)
def public_get_motor_4w_quotes(payload: Motor4WQuoteRequestIn):
    """Fetch car (4W) insurance quotes (no auth, simulated)."""
    return fetch_motor_4w_quotes(payload, is_live=False)


# ─── Health ───────────────────────────────────────────────────────────────────


@router.post("/v1/partner/health/quotes", response_model=QuoteResultOut)
def partner_get_health_quotes(
    payload: HealthQuoteRequestIn,
    posp: PospApplication = Depends(_get_current_approved_posp_application),
):
    """Fetch health insurance quotes for an approved partner."""
    return fetch_health_quotes(payload, is_live=True)


@router.post("/v1/public/health/quotes", response_model=QuoteResultOut)
def public_get_health_quotes(payload: HealthQuoteRequestIn):
    """Fetch health insurance quotes (no auth, simulated)."""
    return fetch_health_quotes(payload, is_live=False)


# ─── Travel ───────────────────────────────────────────────────────────────────


@router.post("/v1/partner/travel/quotes", response_model=QuoteResultOut)
def partner_get_travel_quotes(
    payload: TravelQuoteRequestIn,
    posp: PospApplication = Depends(_get_current_approved_posp_application),
):
    """Fetch travel insurance quotes for an approved partner."""
    return fetch_travel_quotes(payload, is_live=True)


@router.post("/v1/public/travel/quotes", response_model=QuoteResultOut)
def public_get_travel_quotes(payload: TravelQuoteRequestIn):
    """Fetch travel insurance quotes (no auth, simulated)."""
    return fetch_travel_quotes(payload, is_live=False)


# ─── Home ─────────────────────────────────────────────────────────────────────


@router.post("/v1/partner/home/quotes", response_model=QuoteResultOut)
def partner_get_home_quotes(
    payload: HomeQuoteRequestIn,
    posp: PospApplication = Depends(_get_current_approved_posp_application),
):
    """Fetch home insurance quotes for an approved partner."""
    return fetch_home_quotes(payload, is_live=True)


@router.post("/v1/public/home/quotes", response_model=QuoteResultOut)
def public_get_home_quotes(payload: HomeQuoteRequestIn):
    """Fetch home insurance quotes (no auth, simulated)."""
    return fetch_home_quotes(payload, is_live=False)

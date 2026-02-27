from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_posp_application_id
from app.core.db import get_db
from app.partners.models import PospApplication
from app.quotes.schemas import QuoteRequestIn, QuoteResultOut
from app.quotes.service import fetch_quotes

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


@router.post("/v1/partner/quotes", response_model=QuoteResultOut)
def partner_get_quotes(
    payload: QuoteRequestIn,
    posp: PospApplication = Depends(_get_current_approved_posp_application),
):
    """Fetch insurance quotes for an approved partner (live mode)."""
    return fetch_quotes(payload, is_live=True)


@router.post("/v1/public/quotes", response_model=QuoteResultOut)
def public_get_quotes(payload: QuoteRequestIn):
    """Fetch simulated insurance quotes (no auth required)."""
    return fetch_quotes(payload, is_live=False)

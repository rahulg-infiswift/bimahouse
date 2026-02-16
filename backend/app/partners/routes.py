# backend/app/partners/routes.py
from datetime import datetime, timezone, timedelta
from typing import Optional
import secrets
import hashlib
import re
import uuid

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text, or_ as sqlalchemy_or
from jose import jwt

from app.core.config import settings
from app.core.db import get_db
from app.core.auth import require_any_employee_role
from app.employees.models import Employee, EmployeeRole
from app.partners.models import PospApplication, PospApplicationDocument, LeadStatus, LeadSource, DocType
from app.partners.schemas import (
    PospApplicationCreateIn, PospApplicationCreateOut,
    PospApplicationSummaryOut, PospApplicationListItem, PospApplicationDetailOut,
    OtpSendOut, OtpVerifyIn, OtpVerifyOut, AdminPospApplicationUpdateIn,
    PartnerLoginRequestIn, PartnerLoginRequestOut,
    PartnerLoginVerifyIn, PartnerLoginVerifyOut,
    PartnerRefreshIn, PartnerRefreshOut
)
from app.partners.storage import save_partner_doc_bytes
from app.partners.email_utils import send_email  # existing helper
from app.partners.sms_utils import send_sms

import logging
logger = logging.getLogger(__name__)


router = APIRouter(tags=["Partners"])


def utcnow():
    return datetime.now(timezone.utc)


def _otp_bypass_enabled() -> bool:
    return bool(getattr(settings, "otp_bypass", False))


def _fmt(dt):
    return dt.isoformat() if dt else None


def _hash_otp(otp: str) -> str:
    # Never store raw OTP
    secret = getattr(settings, "otp_secret", None)
    if not secret:
        raise HTTPException(status_code=500, detail="OTP not configured: OTP_SECRET missing")
    raw = f"{secret}:{otp}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _generate_otp() -> str:
    # 6-digit numeric OTP
    return f"{secrets.randbelow(1_000_000):06d}"


def _normalize_phone(raw_phone: str) -> str:
    # `INPhoneNumber` already validates/normalizes to E.164.
    e164 = str(raw_phone or "").strip()
    if not e164.startswith("+"):
        raise HTTPException(status_code=400, detail="Phone number must be in E.164 format.")

    digits = re.sub(r"\D", "", e164)
    if len(digits) < 11:
        raise HTTPException(status_code=400, detail="Phone number is invalid.")

    return f"+{digits}"


def _find_approved_posp_application_by_phone(db: Session, phone: str) -> Optional[PospApplication]:
    normalized_phone = _normalize_phone(phone)
    return (
        db.query(PospApplication)
        .filter(
            PospApplication.status == LeadStatus.APPROVED,
            PospApplication.phone == normalized_phone,
        )
        .first()
    )


def _issue_partner_token(partner_application_id: uuid.UUID) -> tuple[str, int]:
    secret = settings.partner_jwt_secret
    if not secret:
        raise HTTPException(status_code=500, detail="Partner auth not configured: PARTNER_JWT_SECRET missing")
    exp_minutes = max(5, int(settings.partner_jwt_exp_minutes))
    now = int(datetime.now(timezone.utc).timestamp())
    exp = now + (exp_minutes * 60)
    payload = {
        "sub": str(partner_application_id),
        "role": "partner",
        "typ": "partner",
        "iat": now,
        "exp": exp,
    }
    token = jwt.encode(payload, secret, algorithm="HS256")
    return token, exp_minutes * 60


def _partner_refresh_secret() -> str:
    secret = settings.partner_refresh_jwt_secret or settings.partner_jwt_secret
    if not secret:
        raise HTTPException(
            status_code=500,
            detail="Partner refresh not configured: PARTNER_REFRESH_JWT_SECRET or PARTNER_JWT_SECRET missing",
        )
    return secret


def _issue_partner_refresh_token(partner_application_id: uuid.UUID) -> tuple[str, int]:
    secret = _partner_refresh_secret()
    exp_minutes = max(60, int(settings.partner_refresh_exp_minutes))
    now = int(datetime.now(timezone.utc).timestamp())
    exp = now + (exp_minutes * 60)
    payload = {
        "sub": str(partner_application_id),
        "role": "partner",
        "typ": "partner_refresh",
        "iat": now,
        "exp": exp,
    }
    token = jwt.encode(payload, secret, algorithm="HS256")
    return token, exp_minutes * 60


def _apply_profile_update(posp_application: PospApplication, payload: object) -> None:
    """Update flattened application fields from a payload with matching attributes."""
    from datetime import date as date_type

    date_of_birth = getattr(payload, "date_of_birth", None)
    if date_of_birth:
        try:
            posp_application.date_of_birth = date_type.fromisoformat(date_of_birth)
        except ValueError:
            pass  # Invalid date format, skip

    gender = getattr(payload, "gender", None)
    if gender is not None:
        posp_application.gender = gender
    pan_number = getattr(payload, "pan_number", None)
    if pan_number is not None:
        posp_application.pan_number = pan_number.upper().strip() if pan_number else None
    aadhaar_number = getattr(payload, "aadhaar_number", None)
    if aadhaar_number is not None:
        posp_application.aadhaar_number = aadhaar_number.replace(" ", "").strip() if aadhaar_number else None
    address_line1 = getattr(payload, "address_line1", None)
    if address_line1 is not None:
        posp_application.address_line1 = address_line1
    address_line2 = getattr(payload, "address_line2", None)
    if address_line2 is not None:
        posp_application.address_line2 = address_line2
    city = getattr(payload, "city", None)
    if city is not None:
        posp_application.city = city
    state = getattr(payload, "state", None)
    if state is not None:
        posp_application.state = state
    pincode = getattr(payload, "pincode", None)
    if pincode is not None:
        posp_application.pincode = pincode.strip() if pincode else None
    business_location = getattr(payload, "business_location", None)
    if business_location is not None:
        posp_application.business_location = business_location
    current_insurance_experience = getattr(payload, "current_insurance_experience", None)
    if current_insurance_experience is not None:
        posp_application.current_insurance_experience = current_insurance_experience
    preferred_products = getattr(payload, "preferred_products", None)
    if preferred_products is not None:
        posp_application.preferred_products = preferred_products
    bank_name = getattr(payload, "bank_name", None)
    if bank_name is not None:
        posp_application.bank_name = bank_name
    branch_name = getattr(payload, "branch_name", None)
    if branch_name is not None:
        posp_application.branch_name = branch_name
    account_holder_name = getattr(payload, "account_holder_name", None)
    if account_holder_name is not None:
        posp_application.account_holder_name = account_holder_name
    account_number = getattr(payload, "account_number", None)
    if account_number is not None:
        posp_application.account_number = account_number.strip() if account_number else None
    ifsc_code = getattr(payload, "ifsc_code", None)
    if ifsc_code is not None:
        posp_application.ifsc_code = ifsc_code.upper().strip() if ifsc_code else None

    posp_application.updated_at = utcnow()


def _lead_to_detail(db: Session, posp_application: PospApplication) -> PospApplicationDetailOut:
    docs = (
        db.query(PospApplicationDocument)
        .filter(PospApplicationDocument.lead_id == posp_application.id)
        .order_by(PospApplicationDocument.uploaded_at.desc())
        .all()
    )
    return PospApplicationDetailOut(
        application_id=str(posp_application.id),
        display_id=posp_application.display_id,
        lead_display_id=posp_application.lead_display_id,
        partner_display_id=posp_application.partner_display_id,
        full_name=posp_application.full_name,
        email=posp_application.lead_email,
        phone=posp_application.phone,
        status=posp_application.status,
        created_via=posp_application.created_via,
        email_verified=bool(posp_application.email_verified_at),
        email_verified_at=_fmt(posp_application.email_verified_at),
        otp_last_sent_at=_fmt(posp_application.otp_last_sent_at),
        otp_expires_at=_fmt(posp_application.otp_expires_at),
        date_of_birth=posp_application.date_of_birth.isoformat() if posp_application.date_of_birth else None,
        gender=posp_application.gender,
        pan_number=posp_application.pan_number,
        aadhaar_number=posp_application.aadhaar_number,
        address_line1=posp_application.address_line1,
        address_line2=posp_application.address_line2,
        city=posp_application.city,
        state=posp_application.state,
        pincode=posp_application.pincode,
        business_location=posp_application.business_location,
        current_insurance_experience=posp_application.current_insurance_experience,
        preferred_products=posp_application.preferred_products,
        bank_name=posp_application.bank_name,
        branch_name=posp_application.branch_name,
        account_holder_name=posp_application.account_holder_name,
        account_number=posp_application.account_number,
        ifsc_code=posp_application.ifsc_code,
        documents=[
            {
                "doc_id": str(d.id),
                "doc_type": d.doc_type,
                "original_filename": d.original_filename,
                "uploaded_at": d.uploaded_at.isoformat(),
                "verification_status": d.verification_status,
            }
            for d in docs
        ],
    )


def _create_posp_application_record(
    db: Session,
    *,
    full_name: str,
    email: str,
    phone: str,
    pan_number: Optional[str],
    payload: Optional[object],
    created_via: str,
    status: str,
) -> PospApplicationCreateOut:
    email_normalized = str(email).strip().lower()
    phone_e164 = _normalize_phone(str(phone))
    profile_pan = getattr(payload, "pan_number", None) if payload else None
    pan_value = profile_pan if profile_pan else pan_number
    pan_normalized = pan_value.strip().upper() if pan_value else None

    filters = [
        func.lower(PospApplication.lead_email) == email_normalized,
        PospApplication.phone == phone_e164,
    ]
    if pan_normalized:
        filters.append(PospApplication.pan_number == pan_normalized)

    existing = (
        db.query(PospApplication)
        .filter(sqlalchemy_or(*filters))
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="A lead with this email, phone, or PAN already exists.")

    posp_application = PospApplication(
        full_name=full_name.strip(),
        lead_email=email_normalized,
        phone=phone_e164,
        created_via=created_via,
        status=status,
        created_at=utcnow(),
        updated_at=utcnow(),
        email_verified_at=None,
        otp_hash=None,
        otp_expires_at=None,
        otp_last_sent_at=None,
        otp_attempts=0,
    )
    db.add(posp_application)
    db.flush()

    if payload is not None:
        if pan_normalized:
            setattr(payload, "pan_number", pan_normalized)
        _apply_profile_update(posp_application, payload)
    elif pan_normalized:
        posp_application.pan_number = pan_normalized
    db.commit()
    db.refresh(posp_application)

    return PospApplicationCreateOut(
        application_id=str(posp_application.id),
        display_id=posp_application.display_id,
        lead_display_id=posp_application.lead_display_id,
        partner_display_id=posp_application.partner_display_id,
        status=posp_application.status,
        email_verified=False,
        created_via=posp_application.created_via,
    )


def _validate_posp_application_payload(payload: PospApplicationCreateIn) -> None:
    """Shared field validation for both internal and public POSP application creation."""
    if payload.aadhaar_number and not payload.aadhaar_number.isdigit():
        raise HTTPException(status_code=422, detail="Aadhaar number must contain only digits.")
    if payload.aadhaar_number and len(payload.aadhaar_number) != 12:
        raise HTTPException(status_code=422, detail="Aadhaar number must be 12 digits.")
    if payload.pincode and (not payload.pincode.isdigit() or len(payload.pincode) != 6):
        raise HTTPException(status_code=422, detail="Pincode must be 6 digits.")


# -------------------------
# Admin endpoints
# -------------------------

@router.get("/v1/posp-applications/summary", response_model=PospApplicationSummaryOut)
def posp_applications_summary(
    employee: Employee = Depends(require_any_employee_role()),
    db: Session = Depends(get_db),
):

    counts = dict(
        db.query(PospApplication.status, func.count(PospApplication.id))
        .group_by(PospApplication.status)
        .all()
    )

    return PospApplicationSummaryOut(
        submitted=int(counts.get(LeadStatus.SUBMITTED, 0)),
        in_review=int(counts.get(LeadStatus.IN_REVIEW, 0)),
        approved=int(counts.get(LeadStatus.APPROVED, 0)),
        rejected=int(counts.get(LeadStatus.REJECTED, 0)),
    )


@router.get("/v1/posp-applications", response_model=list[PospApplicationListItem])
def list_posp_applications(
    status: Optional[str] = Query(default=None),
    employee: Employee = Depends(require_any_employee_role()),
    db: Session = Depends(get_db),
):

    q = db.query(PospApplication).order_by(PospApplication.created_at.desc())
    if status:
        q = q.filter(PospApplication.status == status)

    rows = q.limit(200).all()
    return [
        PospApplicationListItem(
            application_id=str(r.id),
            display_id=r.display_id,
            lead_display_id=r.lead_display_id,
            partner_display_id=r.partner_display_id,
            full_name=r.full_name,
            email=r.lead_email,
            phone=r.phone,
            status=r.status,
            created_via=r.created_via,
            email_verified=bool(r.email_verified_at),
            created_at=r.created_at.isoformat(),
            updated_at=r.updated_at.isoformat(),
        )
        for r in rows
    ]


@router.post("/v1/posp-applications", response_model=PospApplicationCreateOut)
def create_posp_application(
    payload: PospApplicationCreateIn,
    employee: Employee = Depends(require_any_employee_role()),
    db: Session = Depends(get_db),
):
    _validate_posp_application_payload(payload)
    return _create_posp_application_record(
        db,
        full_name=payload.full_name,
        email=str(payload.email),
        phone=str(payload.phone),
        pan_number=payload.pan_number,
        payload=payload,
        created_via=LeadSource.SALES_ASSISTED,
        status=LeadStatus.SUBMITTED,
    )


@router.post("/v1/public/partner-applications", response_model=PospApplicationCreateOut, tags=["Public"])
def create_public_posp_application(
    payload: PospApplicationCreateIn,
    db: Session = Depends(get_db),
):
    _validate_posp_application_payload(payload)

    # Public applications are considered submitted for internal review.
    return _create_posp_application_record(
        db,
        full_name=payload.full_name,
        email=str(payload.email),
        phone=str(payload.phone),
        pan_number=payload.pan_number,
        payload=payload,
        created_via=LeadSource.SELF_SERVE,
        status=LeadStatus.SUBMITTED,
    )


@router.post("/v1/partner-auth/request-otp", response_model=PartnerLoginRequestOut, tags=["Partner Auth"])
def request_partner_login_otp(
    payload: PartnerLoginRequestIn,
    db: Session = Depends(get_db),
):
    posp_application = _find_approved_posp_application_by_phone(db, str(payload.phone))
    logger.info(
        "Partner login OTP request for phone: %s, found application_id: %s, lead_number: %s",
        payload.phone,
        str(posp_application.id) if posp_application else "None",
        str(posp_application.lead_number) if posp_application else "None",
    )
    if not posp_application:
        # Do not reveal approval/account existence details.
        return PartnerLoginRequestOut(
            message="If your partner account is approved, an OTP has been sent to your registered phone number."
        )

    if not _otp_bypass_enabled():
        # Rate limit resend
        if posp_application.otp_last_sent_at and (utcnow() - posp_application.otp_last_sent_at).total_seconds() < 45:
            raise HTTPException(status_code=429, detail="OTP recently sent. Please wait before resending.")

        otp = _generate_otp()
        posp_application.otp_hash = _hash_otp(otp)
        posp_application.otp_expires_at = utcnow() + timedelta(minutes=10)
        posp_application.otp_last_sent_at = utcnow()
        posp_application.otp_attempts = 0
        posp_application.updated_at = utcnow()
        db.commit()

        sms_text = (
            f"Bima House OTP: {otp} "
            "Valid for 10 minutes. "
            "If you did not request this, ignore this message."
        )
        send_sms(to_phone=posp_application.phone, body_text=sms_text)
    else:
        posp_application.otp_hash = None
        posp_application.otp_expires_at = None
        posp_application.otp_last_sent_at = utcnow()
        posp_application.otp_attempts = 0
        posp_application.updated_at = utcnow()
        db.commit()

    return PartnerLoginRequestOut(
        message="If your partner account is approved, an OTP has been sent to your registered phone number."
    )


@router.post("/v1/partner-auth/verify-otp", response_model=PartnerLoginVerifyOut, tags=["Partner Auth"])
def verify_partner_login_otp(
    payload: PartnerLoginVerifyIn,
    db: Session = Depends(get_db),
):
    posp_application = _find_approved_posp_application_by_phone(db, str(payload.phone))
    if not posp_application:
        raise HTTPException(status_code=401, detail="Invalid login or OTP")

    if not _otp_bypass_enabled():
        if not posp_application.otp_hash or not posp_application.otp_expires_at:
            raise HTTPException(status_code=409, detail="OTP not requested yet")

        if utcnow() > posp_application.otp_expires_at:
            raise HTTPException(status_code=401, detail="OTP expired")

        posp_application.otp_attempts = (posp_application.otp_attempts or 0) + 1
        if posp_application.otp_attempts > 8:
            db.commit()
            raise HTTPException(status_code=429, detail="Too many attempts. Please request a new OTP.")

        if _hash_otp(payload.otp.strip()) != posp_application.otp_hash:
            posp_application.updated_at = utcnow()
            db.commit()
            raise HTTPException(status_code=401, detail="Invalid OTP")

    posp_application.otp_hash = None
    posp_application.otp_expires_at = None
    posp_application.otp_last_sent_at = None
    posp_application.otp_attempts = 0
    posp_application.updated_at = utcnow()
    access_token, expires_in = _issue_partner_token(posp_application.id)
    refresh_token, refresh_expires_in = _issue_partner_refresh_token(posp_application.id)
    posp_application.refresh_token_hash = _hash_refresh_token(refresh_token)
    posp_application.refresh_expires_at = utcnow() + timedelta(seconds=refresh_expires_in)
    posp_application.refresh_last_issued_at = utcnow()
    db.commit()

    return PartnerLoginVerifyOut(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        refresh_expires_in=refresh_expires_in,
        partner_application_id=str(posp_application.id),
        partner_display_id=posp_application.partner_display_id,
        full_name=posp_application.full_name,
        email=posp_application.lead_email,
    )


@router.post("/v1/partner-auth/refresh", response_model=PartnerRefreshOut, tags=["Partner Auth"])
def refresh_partner_token(
    payload: PartnerRefreshIn,
    db: Session = Depends(get_db),
):
    token = payload.refresh_token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="Refresh token required")

    try:
        decoded = jwt.decode(token, _partner_refresh_secret(), algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if decoded.get("typ") != "partner_refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    partner_application_id = decoded.get("sub")
    if not partner_application_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    posp_application = (
        db.query(PospApplication)
        .filter(PospApplication.id == partner_application_id, PospApplication.status == LeadStatus.APPROVED)
        .first()
    )
    if not posp_application:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if not posp_application.refresh_token_hash or not posp_application.refresh_expires_at:
        raise HTTPException(status_code=401, detail="Refresh token expired")

    if utcnow() > posp_application.refresh_expires_at:
        posp_application.refresh_token_hash = None
        posp_application.refresh_expires_at = None
        posp_application.refresh_last_issued_at = None
        posp_application.updated_at = utcnow()
        db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expired")

    if _hash_refresh_token(token) != posp_application.refresh_token_hash:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    access_token, expires_in = _issue_partner_token(posp_application.id)
    refresh_token, refresh_expires_in = _issue_partner_refresh_token(posp_application.id)
    posp_application.refresh_token_hash = _hash_refresh_token(refresh_token)
    posp_application.refresh_expires_at = utcnow() + timedelta(seconds=refresh_expires_in)
    posp_application.refresh_last_issued_at = utcnow()
    posp_application.updated_at = utcnow()
    db.commit()

    return PartnerRefreshOut(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        refresh_expires_in=refresh_expires_in,
        partner_application_id=str(posp_application.id),
        partner_display_id=posp_application.partner_display_id,
        full_name=posp_application.full_name,
        email=posp_application.lead_email,
    )


@router.get("/v1/posp-applications/{application_id}", response_model=PospApplicationDetailOut)
def get_posp_application(
    application_id: str,
    employee: Employee = Depends(require_any_employee_role()),
    db: Session = Depends(get_db),
):

    posp_application = db.query(PospApplication).filter(PospApplication.id == application_id).first()
    if not posp_application:
        raise HTTPException(status_code=404, detail="Lead not found")

    return _lead_to_detail(db, posp_application)


# Email OTP verfication
@router.post("/v1/posp-applications/{application_id}/send-otp", response_model=OtpSendOut)
def send_posp_application_email_otp(
    application_id: str,
    employee: Employee = Depends(require_any_employee_role()),
    db: Session = Depends(get_db),
):

    posp_application = db.query(PospApplication).filter(PospApplication.id == application_id).first()
    if not posp_application:
        raise HTTPException(status_code=404, detail="Lead not found")

    # rate limit resend (e.g., 45 sec)
    if posp_application.otp_last_sent_at and (utcnow() - posp_application.otp_last_sent_at).total_seconds() < 45:
        raise HTTPException(status_code=429, detail="OTP recently sent. Please wait before resending.")

    otp = _generate_otp()
    posp_application.otp_hash = _hash_otp(otp)
    posp_application.otp_expires_at = utcnow() + timedelta(minutes=10)
    posp_application.otp_last_sent_at = utcnow()
    posp_application.otp_attempts = 0
    posp_application.updated_at = utcnow()
    db.commit()

    # Send email (prod: SMTP/Resend; dev: console mode)
    subject = "BimaHouse Partner Verification OTP"
    body = (
        f"Hello {posp_application.full_name},\n\n"
        f"Your OTP for verification is: {otp}\n\n"
        "This OTP expires in 10 minutes.\n\n"
        "If you did not request this, you can ignore this message.\n"
        "— BimaHouse Insurance\n"
    )
    send_email(to_email=posp_application.lead_email, subject=subject, body_text=body)

    return OtpSendOut(
        application_id=str(posp_application.id),
        status=posp_application.status,
        email=posp_application.lead_email,
        otp_expires_at=posp_application.otp_expires_at.isoformat(),
    )


@router.post("/v1/posp-applications/{application_id}/verify-otp", response_model=OtpVerifyOut)
def verify_posp_application_email_otp(
    application_id: str,
    payload: OtpVerifyIn,
    employee: Employee = Depends(require_any_employee_role()),
    db: Session = Depends(get_db),
):

    posp_application = db.query(PospApplication).filter(PospApplication.id == application_id).first()
    if not posp_application:
        raise HTTPException(status_code=404, detail="Lead not found")

    if posp_application.email_verified_at:
        return OtpVerifyOut(application_id=str(posp_application.id), status=posp_application.status, email_verified=True)

    if not posp_application.otp_hash or not posp_application.otp_expires_at:
        raise HTTPException(status_code=409, detail="OTP not sent yet")

    if utcnow() > posp_application.otp_expires_at:
        raise HTTPException(status_code=401, detail="OTP expired")

    # attempt limiting
    posp_application.otp_attempts = (posp_application.otp_attempts or 0) + 1
    if posp_application.otp_attempts > 8:
        db.commit()
        raise HTTPException(status_code=429, detail="Too many attempts. Please resend OTP.")

    if _hash_otp(payload.otp.strip()) != posp_application.otp_hash:
        posp_application.updated_at = utcnow()
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid OTP")

    # success
    posp_application.email_verified_at = utcnow()
    posp_application.otp_hash = None
    posp_application.otp_expires_at = None
    posp_application.otp_last_sent_at = None
    posp_application.otp_attempts = 0

    posp_application.updated_at = utcnow()
    db.commit()

    return OtpVerifyOut(application_id=str(posp_application.id), status=posp_application.status, email_verified=True)


@router.patch("/v1/posp-applications/{application_id}", response_model=PospApplicationDetailOut)
def update_posp_application(
    application_id: str,
    payload: AdminPospApplicationUpdateIn,
    employee: Employee = Depends(require_any_employee_role()),
    db: Session = Depends(get_db),
):

    partner_application = db.query(PospApplication).filter(PospApplication.id == application_id).first()
    if not partner_application:
        raise HTTPException(status_code=404, detail="Lead not found")

    assign_partner_number = False
    is_admin = employee.role == EmployeeRole.ADMIN
    is_sales = employee.role == EmployeeRole.SALES
    is_reviewer = employee.role in {EmployeeRole.ARM_RM, EmployeeRole.MANAGER, EmployeeRole.AREA_MANAGER, EmployeeRole.ZONAL_HEAD, EmployeeRole.ADMIN}

    if payload.status is not None:
        allowed = {
            LeadStatus.SUBMITTED,
            LeadStatus.IN_REVIEW,
            LeadStatus.APPROVED,
            LeadStatus.REJECTED,
        }
        if payload.status not in allowed:
            raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {sorted(list(allowed))}")

        if is_sales and payload.status not in {LeadStatus.SUBMITTED}:
            raise HTTPException(status_code=403, detail="Sales can only move leads up to submitted")

        if is_sales and partner_application.status not in {LeadStatus.SUBMITTED}:
            raise HTTPException(status_code=403, detail="Sales cannot change status after submission")

        if is_reviewer and not is_admin:
            if partner_application.status not in {LeadStatus.SUBMITTED, LeadStatus.IN_REVIEW}:
                raise HTTPException(status_code=403, detail="Application must be submitted for review")
            if payload.status in {LeadStatus.SUBMITTED}:
                raise HTTPException(status_code=403, detail="Reviewer can only move leads after submission")

        # Assign partner_number when lead is first approved (done atomically in commit below)
        assign_partner_number = payload.status == LeadStatus.APPROVED and partner_application.partner_number is None

        partner_application.status = payload.status

    if (
        payload.date_of_birth is not None
        or payload.gender is not None
        or payload.pan_number is not None
        or payload.aadhaar_number is not None
        or payload.address_line1 is not None
        or payload.address_line2 is not None
        or payload.city is not None
        or payload.state is not None
        or payload.pincode is not None
        or payload.business_location is not None
        or payload.current_insurance_experience is not None
        or payload.preferred_products is not None
        or payload.bank_name is not None
        or payload.branch_name is not None
        or payload.account_holder_name is not None
        or payload.account_number is not None
        or payload.ifsc_code is not None
    ):
        if is_admin or is_sales:
            _apply_profile_update(partner_application, payload)
        else:
            raise HTTPException(status_code=403, detail="Only sales/admin can edit lead details")

    if payload.internal_notes is not None:
        if is_admin:
            partner_application.internal_notes = payload.internal_notes
        else:
            raise HTTPException(status_code=403, detail="Only admin can edit internal notes")

    if payload.rejection_reason is not None:
        if is_admin or is_reviewer:
            partner_application.rejection_reason = payload.rejection_reason
        else:
            raise HTTPException(status_code=403, detail="Only reviewers/admin can set rejection reason")

    partner_application.updated_at = utcnow()
    
    # Atomically assign partner_number using nextval only if approval succeeds
    if assign_partner_number:
        db.flush()  # Flush other changes first
        result = db.execute(
            text("UPDATE posp_applications SET partner_number = nextval('partner_number_seq') WHERE id = :application_id RETURNING partner_number"),
            {"application_id": str(partner_application.id)}
        )
        partner_application.partner_number = result.scalar()
    
    db.commit()

    return _lead_to_detail(db, partner_application)


@router.post("/v1/posp-applications/{application_id}/documents")
async def upload_doc(
    application_id: str,
    doc_type: str = Query(..., description="aadhaar|pan|marksheet_10|cancelled_cheque|photo|other"),
    file: UploadFile = File(...),
    employee: Employee = Depends(require_any_employee_role()),
    db: Session = Depends(get_db),
):

    posp_application = db.query(PospApplication).filter(PospApplication.id == application_id).first()
    if not posp_application:
        raise HTTPException(status_code=404, detail="Lead not found")

    allowed = {
        DocType.AADHAAR,
        DocType.PAN,
        DocType.MARKSHEET_10,
        DocType.CANCELLED_CHEQUE,
        DocType.PHOTO,
        DocType.OTHER,
    }
    if doc_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid doc_type. Allowed: {sorted(list(allowed))}")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")

    storage_path, _stored = save_partner_doc_bytes(str(posp_application.id), doc_type, file.filename, content)

    doc = PospApplicationDocument(
        lead_id=posp_application.id,
        doc_type=doc_type,
        storage_key=storage_path,
        original_filename=file.filename,
        content_type=file.content_type,
        size_bytes=len(content),
    )
    db.add(doc)

    posp_application.updated_at = utcnow()
    db.commit()

    return {"doc_id": str(doc.id), "ok": True}


@router.post("/v1/public/partner-applications/{application_id}/documents", tags=["Public"])
async def upload_public_doc(
    application_id: str,
    doc_type: str = Query(..., description="aadhaar|pan|marksheet_10|cancelled_cheque|photo|other"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    posp_application = db.query(PospApplication).filter(PospApplication.id == application_id).first()
    if not posp_application:
        raise HTTPException(status_code=404, detail="Lead not found")

    allowed = {
        DocType.AADHAAR,
        DocType.PAN,
        DocType.MARKSHEET_10,
        DocType.CANCELLED_CHEQUE,
        DocType.PHOTO,
        DocType.OTHER,
    }
    if doc_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid doc_type. Allowed: {sorted(list(allowed))}")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")

    storage_path, _stored = save_partner_doc_bytes(str(posp_application.id), doc_type, file.filename, content)

    doc = PospApplicationDocument(
        lead_id=posp_application.id,
        doc_type=doc_type,
        storage_key=storage_path,
        original_filename=file.filename,
        content_type=file.content_type,
        size_bytes=len(content),
    )
    db.add(doc)

    posp_application.updated_at = utcnow()
    db.commit()

    return {"doc_id": str(doc.id), "ok": True}

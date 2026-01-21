# backend/app/partner_routes.py
from datetime import datetime, timezone, timedelta
from typing import Optional
import secrets
import hashlib

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text, or_ as sqlalchemy_or

from .config import settings
from .db import get_db
from .auth import get_current_user
from .partner_models import PartnerLead, PartnerLeadDocument, PartnerProfile, LeadStatus, DocType
from .partner_schemas import (
    LeadCreateIn, LeadCreateOut, LeadSummaryOut, LeadListItem, LeadDetailOut,
    KycUpdateIn, OtpSendOut, OtpVerifyIn, OtpVerifyOut, AdminLeadUpdateIn,
    PartnerProfileOut, PartnerProfileIn
)
from .storage import save_partner_doc_bytes
from .email_utils import send_email  # NEW helper file below

router = APIRouter()


def require_admin(user_id: str):
    if user_id not in (settings.admin_user_ids or []):
        raise HTTPException(status_code=403, detail="Admin access required")


def utcnow():
    return datetime.now(timezone.utc)


def _fmt(dt):
    return dt.isoformat() if dt else None


def _hash_otp(otp: str) -> str:
    # Never store raw OTP
    secret = getattr(settings, "otp_secret", None)
    if not secret:
        raise HTTPException(status_code=500, detail="OTP not configured: OTP_SECRET missing")
    raw = f"{secret}:{otp}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _generate_otp() -> str:
    # 6-digit numeric OTP
    return f"{secrets.randbelow(1_000_000):06d}"


def _profile_to_out(profile: Optional[PartnerProfile]) -> Optional[PartnerProfileOut]:
    """Convert PartnerProfile model to output schema"""
    if not profile:
        return None
    return PartnerProfileOut(
        date_of_birth=profile.date_of_birth.isoformat() if profile.date_of_birth else None,
        gender=profile.gender,
        father_name=profile.father_name,
        pan_number=profile.pan_number,
        aadhaar_number=profile.aadhaar_number,
        address_line1=profile.address_line1,
        address_line2=profile.address_line2,
        city=profile.city,
        state=profile.state,
        pincode=profile.pincode,
        bank_name=profile.bank_name,
        branch_name=profile.branch_name,
        account_holder_name=profile.account_holder_name,
        account_number=profile.account_number,
        ifsc_code=profile.ifsc_code,
    )


def _update_profile(db: Session, lead: PartnerLead, profile_in: PartnerProfileIn) -> PartnerProfile:
    """Create or update PartnerProfile for a lead"""
    from datetime import date as date_type
    
    profile = lead.profile_data
    if not profile:
        profile = PartnerProfile(lead_id=lead.id)
        db.add(profile)
    
    # Update fields if provided
    if profile_in.date_of_birth:
        try:
            profile.date_of_birth = date_type.fromisoformat(profile_in.date_of_birth)
        except ValueError:
            pass  # Invalid date format, skip
    
    if profile_in.gender is not None:
        profile.gender = profile_in.gender
    if profile_in.father_name is not None:
        profile.father_name = profile_in.father_name
    if profile_in.pan_number is not None:
        profile.pan_number = profile_in.pan_number.upper().strip() if profile_in.pan_number else None
    if profile_in.aadhaar_number is not None:
        profile.aadhaar_number = profile_in.aadhaar_number.replace(" ", "").strip() if profile_in.aadhaar_number else None
    if profile_in.address_line1 is not None:
        profile.address_line1 = profile_in.address_line1
    if profile_in.address_line2 is not None:
        profile.address_line2 = profile_in.address_line2
    if profile_in.city is not None:
        profile.city = profile_in.city
    if profile_in.state is not None:
        profile.state = profile_in.state
    if profile_in.pincode is not None:
        profile.pincode = profile_in.pincode.strip() if profile_in.pincode else None
    if profile_in.bank_name is not None:
        profile.bank_name = profile_in.bank_name
    if profile_in.branch_name is not None:
        profile.branch_name = profile_in.branch_name
    if profile_in.account_holder_name is not None:
        profile.account_holder_name = profile_in.account_holder_name
    if profile_in.account_number is not None:
        profile.account_number = profile_in.account_number.strip() if profile_in.account_number else None
    if profile_in.ifsc_code is not None:
        profile.ifsc_code = profile_in.ifsc_code.upper().strip() if profile_in.ifsc_code else None
    
    profile.updated_at = utcnow()
    return profile


def _lead_to_detail(db: Session, lead: PartnerLead) -> LeadDetailOut:
    docs = (
        db.query(PartnerLeadDocument)
        .filter(PartnerLeadDocument.lead_id == lead.id)
        .order_by(PartnerLeadDocument.uploaded_at.desc())
        .all()
    )
    return LeadDetailOut(
        lead_id=str(lead.id),
        display_id=lead.display_id,
        lead_display_id=lead.lead_display_id,
        partner_display_id=lead.partner_display_id,
        full_name=lead.full_name,
        email=lead.lead_email,
        phone=lead.phone,
        status=lead.status,
        email_verified=bool(lead.email_verified_at),
        email_verified_at=_fmt(lead.email_verified_at),
        otp_last_sent_at=_fmt(lead.otp_last_sent_at),
        otp_expires_at=_fmt(lead.otp_expires_at),
        profile=_profile_to_out(lead.profile_data),
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


# -------------------------
# Admin endpoints
# -------------------------

@router.get("/v1/admin/leads/summary", response_model=LeadSummaryOut)
def admin_leads_summary(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(user_id)

    counts = dict(
        db.query(PartnerLead.status, func.count(PartnerLead.id))
        .group_by(PartnerLead.status)
        .all()
    )

    return LeadSummaryOut(
        in_progress=int(counts.get(LeadStatus.IN_PROGRESS, 0)),
        submitted=int(counts.get(LeadStatus.SUBMITTED, 0)),
        in_review=int(counts.get(LeadStatus.IN_REVIEW, 0)),
        approved=int(counts.get(LeadStatus.APPROVED, 0)),
        rejected=int(counts.get(LeadStatus.REJECTED, 0)),
    )


@router.get("/v1/admin/leads", response_model=list[LeadListItem])
def admin_list_leads(
    status: Optional[str] = Query(default=None),
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(user_id)

    q = db.query(PartnerLead).order_by(PartnerLead.created_at.desc())
    if status:
        q = q.filter(PartnerLead.status == status)

    rows = q.limit(200).all()
    return [
        LeadListItem(
            lead_id=str(r.id),
            display_id=r.display_id,
            lead_display_id=r.lead_display_id,
            partner_display_id=r.partner_display_id,
            full_name=r.full_name,
            email=r.lead_email,
            phone=r.phone,
            status=r.status,
            email_verified=bool(r.email_verified_at),
            created_at=r.created_at.isoformat(),
            updated_at=r.updated_at.isoformat(),
        )
        for r in rows
    ]


@router.post("/v1/admin/leads", response_model=LeadCreateOut)
def admin_create_lead(
    payload: LeadCreateIn,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(user_id)

    # Check for duplicate email, phone, or PAN (if provided)
    filters = [
        PartnerLead.lead_email == str(payload.email).strip().lower(),
        PartnerLead.phone == payload.phone.strip()
    ]
    if payload.pan_number:
        filters.append(PartnerLead.profile["pan_number"].astext == payload.pan_number.strip().upper())
    existing = db.query(PartnerLead).filter(
        sqlalchemy_or(*filters)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A lead with this email, phone, or PAN already exists.")

    lead = PartnerLead(
        full_name=payload.full_name.strip(),
        lead_email=str(payload.email).strip().lower(),
        phone=(payload.phone.strip() if payload.phone else None),
        status=LeadStatus.IN_PROGRESS,  # Start as IN_PROGRESS
        created_at=utcnow(),
        updated_at=utcnow(),
        profile={"pan_number": payload.pan_number.strip().upper()} if payload.pan_number else None,
        email_verified_at=None,
        otp_hash=None,
        otp_expires_at=None,
        otp_last_sent_at=None,
        otp_attempts=0,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)  # Refresh to get the generated lead_number

    return LeadCreateOut(
        lead_id=str(lead.id),
        display_id=lead.display_id,
        lead_display_id=lead.lead_display_id,
        partner_display_id=lead.partner_display_id,
        status=lead.status,
        email_verified=False,
    )


@router.get("/v1/admin/leads/{lead_id}", response_model=LeadDetailOut)
def admin_get_lead(
    lead_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(user_id)

    lead = db.query(PartnerLead).filter(PartnerLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    return _lead_to_detail(db, lead)


@router.post("/v1/admin/leads/{lead_id}/send-otp", response_model=OtpSendOut)
def admin_send_otp(
    lead_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(user_id)

    lead = db.query(PartnerLead).filter(PartnerLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # rate limit resend (e.g., 45 sec)
    if lead.otp_last_sent_at and (utcnow() - lead.otp_last_sent_at).total_seconds() < 45:
        raise HTTPException(status_code=429, detail="OTP recently sent. Please wait before resending.")

    otp = _generate_otp()
    lead.otp_hash = _hash_otp(otp)
    lead.otp_expires_at = utcnow() + timedelta(minutes=10)
    lead.otp_last_sent_at = utcnow()
    lead.otp_attempts = 0
    lead.updated_at = utcnow()
    db.commit()

    # Send email (prod: SMTP/Resend; dev: console mode)
    subject = "BimaHouse Partner Verification OTP"
    body = (
        f"Hello {lead.full_name},\n\n"
        f"Your OTP for verification is: {otp}\n\n"
        "This OTP expires in 10 minutes.\n\n"
        "If you did not request this, you can ignore this message.\n"
        "— BimaHouse Insurance\n"
    )
    send_email(to_email=lead.lead_email, subject=subject, body_text=body)

    return OtpSendOut(
        lead_id=str(lead.id),
        status=lead.status,
        email=lead.lead_email,
        otp_expires_at=lead.otp_expires_at.isoformat(),
    )


@router.post("/v1/admin/leads/{lead_id}/verify-otp", response_model=OtpVerifyOut)
def admin_verify_otp(
    lead_id: str,
    payload: OtpVerifyIn,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(user_id)

    lead = db.query(PartnerLead).filter(PartnerLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if lead.email_verified_at:
        return OtpVerifyOut(lead_id=str(lead.id), status=lead.status, email_verified=True)

    if not lead.otp_hash or not lead.otp_expires_at:
        raise HTTPException(status_code=409, detail="OTP not sent yet")

    if utcnow() > lead.otp_expires_at:
        raise HTTPException(status_code=401, detail="OTP expired")

    # attempt limiting
    lead.otp_attempts = (lead.otp_attempts or 0) + 1
    if lead.otp_attempts > 8:
        db.commit()
        raise HTTPException(status_code=429, detail="Too many attempts. Please resend OTP.")

    if _hash_otp(payload.otp.strip()) != lead.otp_hash:
        lead.updated_at = utcnow()
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid OTP")

    # success
    lead.email_verified_at = utcnow()
    lead.otp_hash = None
    lead.otp_expires_at = None
    lead.otp_last_sent_at = None
    lead.otp_attempts = 0

    lead.updated_at = utcnow()
    db.commit()

    return OtpVerifyOut(lead_id=str(lead.id), status=lead.status, email_verified=True)


@router.patch("/v1/admin/leads/{lead_id}", response_model=LeadDetailOut)
def admin_update_lead(
    lead_id: str,
    payload: AdminLeadUpdateIn,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(user_id)

    lead = db.query(PartnerLead).filter(PartnerLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    assign_partner_number = False
    
    if payload.status is not None:
        allowed = {
            LeadStatus.IN_PROGRESS,
            LeadStatus.SUBMITTED,
            LeadStatus.IN_REVIEW,
            LeadStatus.APPROVED,
            LeadStatus.REJECTED,
        }
        if payload.status not in allowed:
            raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {sorted(list(allowed))}")
        
        # Assign partner_number when lead is first approved (done atomically in commit below)
        assign_partner_number = payload.status == LeadStatus.APPROVED and lead.partner_number is None
        
        lead.status = payload.status

    if payload.profile is not None:
        _update_profile(db, lead, payload.profile)

    if payload.internal_notes is not None:
        lead.internal_notes = payload.internal_notes

    if payload.rejection_reason is not None:
        lead.rejection_reason = payload.rejection_reason

    lead.updated_at = utcnow()
    
    # Atomically assign partner_number using nextval only if approval succeeds
    if assign_partner_number:
        db.flush()  # Flush other changes first
        result = db.execute(
            text("UPDATE partner_leads SET partner_number = nextval('partner_number_seq') WHERE id = :lead_id RETURNING partner_number"),
            {"lead_id": str(lead.id)}
        )
        lead.partner_number = result.scalar()
    
    db.commit()

    return _lead_to_detail(db, lead)


@router.post("/v1/admin/leads/{lead_id}/documents")
async def admin_upload_doc(
    lead_id: str,
    doc_type: str = Query(..., description="aadhaar|pan|marksheet_10|cancelled_cheque|photo|other"),
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(user_id)

    lead = db.query(PartnerLead).filter(PartnerLead.id == lead_id).first()
    if not lead:
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

    storage_path, _stored = save_partner_doc_bytes(str(lead.id), doc_type, file.filename, content)

    doc = PartnerLeadDocument(
        lead_id=lead.id,
        doc_type=doc_type,
        storage_key=storage_path,
        original_filename=file.filename,
        content_type=file.content_type,
        size_bytes=len(content),
    )
    db.add(doc)

    lead.updated_at = utcnow()
    db.commit()

    return {"doc_id": str(doc.id), "ok": True}

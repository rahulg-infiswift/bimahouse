# backend/app/partner_models.py
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from .db import Base


def utcnow():
    return datetime.now(timezone.utc)


class LeadStatus:
    INVITED = "invited"          # created by admin, waiting for partner to sign in/claim
    IN_PROGRESS = "in_progress"  # claimed + filling KYC
    SUBMITTED = "submitted"      # ready for review
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class PartnerLead(Base):
    __tablename__ = "partner_leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Entered by admin
    full_name = Column(String, nullable=False)
    lead_email = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=False)

    status = Column(String, nullable=False, default=LeadStatus.INVITED, index=True)

    # Email OTP verification fields (admin-driven)
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    otp_hash = Column(String, nullable=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)
    otp_last_sent_at = Column(DateTime(timezone=True), nullable=True)
    otp_attempts = Column(Integer, nullable=False, default=0)
    
    # Flexible KYC/form data
    profile = Column(JSONB, nullable=True)

    internal_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    documents = relationship("PartnerLeadDocument", back_populates="lead", cascade="all, delete-orphan")


class DocType:
    AADHAAR = "aadhaar"
    PAN = "pan"
    MARKSHEET_10 = "marksheet_10"
    CANCELLED_CHEQUE = "cancelled_cheque"
    PHOTO = "photo"
    OTHER = "other"


class VerificationStatus:
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class PartnerLeadDocument(Base):
    __tablename__ = "partner_lead_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("partner_leads.id"), nullable=False, index=True)

    doc_type = Column(String, nullable=False, index=True)
    storage_key = Column(String, nullable=False)  # local path or S3 key later
    original_filename = Column(String, nullable=False)
    content_type = Column(String, nullable=True)
    size_bytes = Column(Integer, nullable=True)

    verification_status = Column(String, nullable=False, default=VerificationStatus.VERIFIED, index=True)
    verification_notes = Column(Text, nullable=True)

    uploaded_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    lead = relationship("PartnerLead", back_populates="documents")

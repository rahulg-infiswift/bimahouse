# backend/app/partner_models.py
import uuid
from datetime import datetime, timezone, date
from decimal import Decimal
from typing import Optional

from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey, Integer, Date, Sequence
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


# Separate sequences for leads and partners
lead_number_seq = Sequence('lead_number_seq', start=1)      # BHL-0001, BHL-0002, ...
partner_number_seq = Sequence('partner_number_seq', start=1)  # BHP-0001, BHP-0002, ...


class PartnerLead(Base):
    __tablename__ = "partner_leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Human-readable sequential Lead ID (BHL-0001, BHL-0002, etc.)
    lead_number = Column(Integer, lead_number_seq, server_default=lead_number_seq.next_value(), unique=True, nullable=False, index=True)
    
    # Human-readable sequential Partner ID (BHP-0001, BHP-0002, etc.)
    # Assigned when lead is approved - separate counter from lead_number
    partner_number = Column(Integer, nullable=True, unique=True, index=True)
    
    # Clerk user ID - set when partner logs in via Clerk (links policies to partner)
    clerk_user_id = Column(String, nullable=True, unique=True, index=True)

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
    
    # Flexible KYC/form data (kept for backward compatibility, but prefer PartnerProfile)
    profile = Column(JSONB, nullable=True)

    internal_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    # Relationships
    documents = relationship("PartnerLeadDocument", back_populates="lead", cascade="all, delete-orphan")
    profile_data = relationship("PartnerProfile", back_populates="lead", uselist=False, cascade="all, delete-orphan")

    @property
    def display_id(self) -> str:
        """
        Returns human-readable ID:
        - BHL-0001 for leads (using lead_number counter)
        - BHP-0001 for approved partners (using partner_number counter)
        """
        if self.status == LeadStatus.APPROVED and self.partner_number:
            return f"BHP-{self.partner_number:04d}"
        
        if self.lead_number:
            return f"BHL-{self.lead_number:04d}"
        
        return str(self.id)
    
    @property
    def lead_display_id(self) -> str:
        """Always returns the lead ID (BHL-XXXX)"""
        if self.lead_number:
            return f"BHL-{self.lead_number:04d}"
        return str(self.id)
    
    @property
    def partner_display_id(self) -> Optional[str]:
        """Returns partner ID (BHP-XXXX) if approved, else None"""
        if self.partner_number:
            return f"BHP-{self.partner_number:04d}"
        return None


class PartnerProfile(Base):
    """Structured partner profile data - personal details, address, bank info"""
    __tablename__ = "partner_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("partner_leads.id"), nullable=False, unique=True, index=True)

    # Personal Details
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)  # male, female, other
    father_name = Column(String(255), nullable=True)

    # Identity Documents
    pan_number = Column(String(10), nullable=True, index=True)
    aadhaar_number = Column(String(12), nullable=True)  # Store without spaces

    # Address
    address_line1 = Column(String(500), nullable=True)
    address_line2 = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(6), nullable=True)

    # Bank Details
    bank_name = Column(String(255), nullable=True)
    branch_name = Column(String(255), nullable=True)
    account_holder_name = Column(String(255), nullable=True)
    account_number = Column(String(20), nullable=True)
    ifsc_code = Column(String(11), nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    lead = relationship("PartnerLead", back_populates="profile_data")


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

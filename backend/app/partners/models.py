# backend/app/partners/models.py
import uuid
from datetime import datetime, timezone, date
from typing import Optional

from sqlalchemy import String, DateTime, Text, ForeignKey, Integer, Date, Sequence
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class LeadStatus:
    IN_PROGRESS = "in_progress"  # optional pre-submit state
    SUBMITTED = "submitted"      # ready for review
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class LeadSource:
    SELF_SERVE = "self_serve"
    SALES_ASSISTED = "sales_assisted"


# Separate sequences for leads and partners
lead_number_seq = Sequence("lead_number_seq", start=1)      # BHL-0001, BHL-0002, ...
partner_number_seq = Sequence("partner_number_seq", start=1)  # BHP-0001, BHP-0002, ...


class PospApplication(Base):
    __tablename__ = "posp_applications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Human-readable sequential Lead ID (BHL-0001, BHL-0002, etc.)
    lead_number: Mapped[int] = mapped_column(
        Integer,
        lead_number_seq,
        server_default=lead_number_seq.next_value(),
        unique=True,
        nullable=False,
        index=True,
    )

    # Human-readable sequential Partner ID (BHP-0001, BHP-0002, etc.)
    # Assigned when application is approved - separate counter from lead_number
    partner_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, unique=True, index=True)

    # Clerk user ID - set when partner logs in via Clerk (links policies to partner)
    clerk_user_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, unique=True, index=True)

    # Core applicant info
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    lead_email: Mapped[str] = mapped_column(String, nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String, nullable=False)
    created_via: Mapped[str] = mapped_column(String, nullable=False, default=LeadSource.SALES_ASSISTED, index=True)

    status: Mapped[str] = mapped_column(String, nullable=False, default=LeadStatus.SUBMITTED, index=True)

    # Email OTP verification fields (admin-driven)
    email_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    otp_hash: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    otp_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    otp_last_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    otp_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    internal_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # POSP application details (flattened)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    pan_number: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)
    aadhaar_number: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)

    address_line1: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    address_line2: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    pincode: Mapped[Optional[str]] = mapped_column(String(6), nullable=True)

    bank_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    branch_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    account_holder_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    account_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    ifsc_code: Mapped[Optional[str]] = mapped_column(String(11), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)

    documents: Mapped[list["PospApplicationDocument"]] = relationship(
        "PospApplicationDocument",
        back_populates="lead",
        cascade="all, delete-orphan",
    )

    @property
    def display_id(self) -> str:
        """
        Returns human-readable ID:
        - BHL-0001 for applications (using lead_number counter)
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


class PospApplicationDocument(Base):
    __tablename__ = "posp_application_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("posp_applications.id"),
        nullable=False,
        index=True,
    )

    doc_type: Mapped[str] = mapped_column(String, nullable=False, index=True)
    storage_key: Mapped[str] = mapped_column(String, nullable=False)  # local path or S3 key later
    original_filename: Mapped[str] = mapped_column(String, nullable=False)
    content_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    verification_status: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default=VerificationStatus.VERIFIED,
        index=True,
    )
    verification_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)

    lead: Mapped["PospApplication"] = relationship("PospApplication", back_populates="documents")

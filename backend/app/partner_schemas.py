# backend/app/partner_schemas.py
from typing import Any, Dict, List, Optional
from datetime import date
from pydantic import BaseModel, Field, EmailStr
from pydantic_extra_types.phone_numbers import PhoneNumber

class INPhoneNumber(PhoneNumber):
    default_region_code = "IN"     # parse numbers without +country as India
    phone_format = "RFC3966"       # store as +91XXXXXXXXXX (instead of tel:+...)
    supported_regions = ["IN"]     # restrict to India only


# -------------------------
# Partner Profile Schemas
# -------------------------

class PartnerProfileIn(BaseModel):
    """Input schema for creating/updating partner profile"""
    # Personal Details
    date_of_birth: Optional[str] = None  # YYYY-MM-DD format
    gender: Optional[str] = None
    father_name: Optional[str] = None

    # Identity Documents
    pan_number: Optional[str] = Field(None, max_length=10)
    aadhaar_number: Optional[str] = Field(None, max_length=12)

    # Address
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = Field(None, max_length=6)

    # Bank Details
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    account_holder_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = Field(None, max_length=11)


class PartnerProfileOut(BaseModel):
    """Output schema for partner profile"""
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    father_name: Optional[str] = None

    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None

    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    account_holder_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None


# -------------------------
# Lead Schemas
# -------------------------

class LeadCreateIn(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: EmailStr
    phone: INPhoneNumber


class LeadCreateOut(BaseModel):
    lead_id: str
    display_id: str  # Human-readable ID (BHL-0001 for lead, BHP-0001 for partner)
    lead_display_id: str  # Always the lead ID (BHL-XXXX)
    partner_display_id: Optional[str] = None  # Partner ID if approved (BHP-XXXX)
    status: str
    email_verified: bool


class LeadSummaryOut(BaseModel):
    invited: int = 0
    in_progress: int = 0
    submitted: int = 0
    in_review: int = 0
    approved: int = 0
    rejected: int = 0


class LeadListItem(BaseModel):
    lead_id: str
    display_id: str  # Human-readable ID (BHL-0001 for lead, BHP-0001 for partner)
    lead_display_id: str  # Always the lead ID (BHL-XXXX)
    partner_display_id: Optional[str] = None  # Partner ID if approved (BHP-XXXX)
    full_name: str
    email: str
    phone: str
    status: str
    email_verified: bool
    created_at: str
    updated_at: str


class LeadDetailOut(BaseModel):
    lead_id: str
    display_id: str  # Human-readable ID (BHL-0001 for lead, BHP-0001 for partner)
    lead_display_id: str  # Always the lead ID (BHL-XXXX)
    partner_display_id: Optional[str] = None  # Partner ID if approved (BHP-XXXX)
    full_name: str
    email: str
    phone: str
    status: str

    email_verified: bool
    email_verified_at: Optional[str] = None

    otp_last_sent_at: Optional[str] = None
    otp_expires_at: Optional[str] = None

    profile: Optional[PartnerProfileOut] = None
    documents: List[Dict[str, Any]]


class OtpSendOut(BaseModel):
    lead_id: str
    status: str
    email: str
    otp_expires_at: str


class OtpVerifyIn(BaseModel):
    otp: str = Field(..., min_length=4, max_length=10)


class OtpVerifyOut(BaseModel):
    lead_id: str
    status: str
    email_verified: bool


class KycUpdateIn(BaseModel):
    profile: PartnerProfileIn


class AdminLeadUpdateIn(BaseModel):
    # Optional updates by admin
    status: Optional[str] = None
    profile: Optional[PartnerProfileIn] = None
    internal_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
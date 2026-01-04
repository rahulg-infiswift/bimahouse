# backend/app/partner_schemas.py
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, EmailStr
from pydantic_extra_types.phone_numbers import PhoneNumber

class INPhoneNumber(PhoneNumber):
    default_region_code = "IN"     # parse numbers without +country as India :contentReference[oaicite:1]{index=1}
    phone_format = "RFC3966"          # store as +91XXXXXXXXXX (instead of tel:+...) :contentReference[oaicite:2]{index=2}
    supported_regions = ["IN"]   # restrict to India only :contentReference[oaicite:3]{index=3}

class LeadCreateIn(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: EmailStr
    phone: INPhoneNumber


class LeadCreateOut(BaseModel):
    lead_id: str
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
    full_name: str
    email: str
    phone: str
    status: str
    email_verified: bool
    created_at: str
    updated_at: str


class LeadDetailOut(BaseModel):
    lead_id: str
    full_name: str
    email: str
    phone: str
    status: str

    email_verified: bool
    email_verified_at: Optional[str] = None

    otp_last_sent_at: Optional[str] = None
    otp_expires_at: Optional[str] = None

    profile: Optional[Dict[str, Any]]
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
    profile: Dict[str, Any]


class AdminLeadUpdateIn(BaseModel):
    # Optional updates by admin
    status: Optional[str] = None
    profile: Optional[Dict[str, Any]] = None
    internal_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
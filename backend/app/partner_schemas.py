# backend/app/partner_schemas.py
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, EmailStr
from pydantic_extra_types.phone_numbers import PhoneNumber



class LeadCreateIn(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: EmailStr
    phone: PhoneNumber


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
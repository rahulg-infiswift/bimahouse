from pydantic import BaseModel, Field
from pydantic_extra_types.phone_numbers import PhoneNumber


class INUSPhoneNumber(PhoneNumber):
    default_region_code = "US"
    phone_format = "E164"
    supported_regions = ["US", "IN"]


class EmployeeOut(BaseModel):
    employee_id: str
    full_name: str | None
    primary_email: str | None
    phone: str
    role: str
    is_active: bool
    created_at: str
    updated_at: str


class EmployeeRoleUpdateIn(BaseModel):
    role: str


class EmployeePhoneUpdateIn(BaseModel):
    phone: INUSPhoneNumber


class EmployeeCreateIn(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    phone: INUSPhoneNumber
    role: str
    primary_email: str | None = None


class EmployeeOtpRequestIn(BaseModel):
    phone: INUSPhoneNumber


class EmployeeOtpRequestOut(BaseModel):
    message: str


class EmployeeOtpVerifyIn(BaseModel):
    phone: INUSPhoneNumber
    otp: str = Field(..., min_length=4, max_length=10)


class EmployeeOtpVerifyOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    role: str
    employee_id: str
    full_name: str | None = None
    primary_email: str | None = None

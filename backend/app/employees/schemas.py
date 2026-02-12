from pydantic import BaseModel, Field
from pydantic_extra_types.phone_numbers import PhoneNumber


class INPhoneNumber(PhoneNumber):
    default_region_code = "IN"
    phone_format = "E164"
    supported_regions = ["IN"]


class EmployeeOut(BaseModel):
    employee_id: str
    primary_email: str | None
    phone: str
    role: str
    is_active: bool
    created_at: str
    updated_at: str


class EmployeeRoleUpdateIn(BaseModel):
    role: str


class EmployeePhoneUpdateIn(BaseModel):
    phone: INPhoneNumber


class EmployeeCreateIn(BaseModel):
    phone: INPhoneNumber
    role: str
    primary_email: str | None = None


class EmployeeOtpRequestIn(BaseModel):
    phone: INPhoneNumber


class EmployeeOtpRequestOut(BaseModel):
    message: str


class EmployeeOtpVerifyIn(BaseModel):
    phone: INPhoneNumber
    otp: str = Field(..., min_length=4, max_length=10)


class EmployeeOtpVerifyOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    role: str
    employee_id: str
    primary_email: str | None = None

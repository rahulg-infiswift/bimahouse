from datetime import datetime, timedelta, timezone
import hashlib
import re
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from sqlalchemy.orm import Session

from app.core.auth import get_current_active_employee_record, require_employee_roles
from app.core.config import settings
from app.core.db import get_db
from app.employees.models import Employee, EmployeeRole
from app.employees.schemas import (
    EmployeeCreateIn,
    EmployeeOtpRequestIn,
    EmployeeOtpRequestOut,
    EmployeeOtpVerifyIn,
    EmployeeOtpVerifyOut,
    EmployeeOut,
    EmployeePhoneUpdateIn,
    EmployeeRoleUpdateIn,
)
from app.partners.sms_utils import send_sms

router = APIRouter()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_phone_parts(raw_phone: str) -> tuple[str, str, str]:
    e164 = str(raw_phone or "").strip()
    if not e164.startswith("+"):
        raise HTTPException(status_code=400, detail="Phone number must be in E.164 format.")

    digits = re.sub(r"\D", "", e164)
    if len(digits) < 11:
        raise HTTPException(status_code=400, detail="Phone number is invalid.")

    national = digits[-10:]
    country_digits = digits[:-10]
    country_code = f"+{country_digits}"
    return country_code, national, e164


def _hash_otp(otp: str) -> str:
    secret = getattr(settings, "otp_secret", None)
    if not secret:
        raise HTTPException(status_code=500, detail="OTP not configured: OTP_SECRET missing")
    raw = f"{secret}:{otp}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _issue_employee_token(employee: Employee) -> tuple[str, int]:
    secret = settings.employee_jwt_secret
    if not secret:
        raise HTTPException(status_code=500, detail="Employee auth not configured: EMPLOYEE_JWT_SECRET missing")

    if employee.role not in EmployeeRole.all_roles():
        raise HTTPException(status_code=403, detail="Insufficient role")

    exp_minutes = max(5, int(settings.employee_jwt_exp_minutes))
    now = int(datetime.now(timezone.utc).timestamp())
    exp = now + (exp_minutes * 60)
    payload = {
        "sub": str(employee.id),
        "role": employee.role,
        "typ": "employee",
        "iat": now,
        "exp": exp,
    }
    token = jwt.encode(payload, secret, algorithm="HS256")
    return token, exp_minutes * 60


def _employee_to_out(employee: Employee) -> EmployeeOut:
    return EmployeeOut(
        employee_id=str(employee.id),
        primary_email=employee.primary_email,
        phone=f"{employee.phone_country_code}{employee.phone_national_number}",
        role=employee.role,
        is_active=bool(employee.is_active),
        created_at=employee.created_at.isoformat(),
        updated_at=employee.updated_at.isoformat(),
    )


@router.get("/v1/employees/me", response_model=EmployeeOut, tags=["Employees"])
def get_current_employee_profile(
    employee: Employee = Depends(get_current_active_employee_record),
):
    return _employee_to_out(employee)


@router.get("/v1/admin/employees", response_model=list[EmployeeOut], tags=["Admin"])
def list_employees(
    role: str | None = None,
    is_active: bool | None = None,
    limit: int = 100,
    offset: int = 0,
    _: Employee = Depends(require_employee_roles(EmployeeRole.ADMIN)),
    db: Session = Depends(get_db),
):
    q = db.query(Employee)
    if role:
        q = q.filter(Employee.role == role)
    if is_active is not None:
        q = q.filter(Employee.is_active.is_(is_active))
    employees = q.order_by(Employee.created_at.desc()).offset(offset).limit(limit).all()
    return [_employee_to_out(employee) for employee in employees]


@router.post("/v1/admin/employees", response_model=EmployeeOut, tags=["Admin"])
def create_employee(
    payload: EmployeeCreateIn,
    _: Employee = Depends(require_employee_roles(EmployeeRole.ADMIN)),
    db: Session = Depends(get_db),
):
    if payload.role not in EmployeeRole.all_roles():
        raise HTTPException(status_code=400, detail=f"Role must be one of: {sorted(EmployeeRole.all_roles())}")

    country_code, national_number, _e164 = _normalize_phone_parts(str(payload.phone))

    existing = (
        db.query(Employee)
        .filter(Employee.phone_country_code == country_code, Employee.phone_national_number == national_number)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Phone number is already mapped to another employee account")

    employee = Employee(
        primary_email=payload.primary_email,
        role=payload.role,
        phone_country_code=country_code,
        phone_national_number=national_number,
        is_active=True,
        otp_hash=None,
        otp_expires_at=None,
        otp_last_sent_at=None,
        otp_attempts=0,
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return _employee_to_out(employee)


@router.patch("/v1/admin/employees/{employee_id}/role", tags=["Admin"])
def update_employee_role(
    employee_id: uuid.UUID,
    payload: EmployeeRoleUpdateIn,
    _: Employee = Depends(require_employee_roles(EmployeeRole.ADMIN)),
    db: Session = Depends(get_db),
):
    if payload.role not in EmployeeRole.all_roles():
        raise HTTPException(status_code=400, detail=f"Invalid employee role. Allowed: {sorted(EmployeeRole.all_roles())}")

    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    employee.role = payload.role
    employee.updated_at = utcnow()
    db.commit()
    return {"employee_id": str(employee.id), "role": employee.role}


@router.patch("/v1/admin/employees/{employee_id}/phone", response_model=EmployeeOut, tags=["Admin"])
def update_employee_phone(
    employee_id: uuid.UUID,
    payload: EmployeePhoneUpdateIn,
    _: Employee = Depends(require_employee_roles(EmployeeRole.ADMIN)),
    db: Session = Depends(get_db),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    country_code, national_number, _e164 = _normalize_phone_parts(str(payload.phone))

    existing = (
        db.query(Employee)
        .filter(
            Employee.phone_country_code == country_code,
            Employee.phone_national_number == national_number,
            Employee.id != employee.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Phone number is already mapped to another employee account")

    employee.phone_country_code = country_code
    employee.phone_national_number = national_number
    employee.updated_at = utcnow()
    db.commit()
    db.refresh(employee)
    return _employee_to_out(employee)


@router.post("/v1/employee-auth/request-otp", response_model=EmployeeOtpRequestOut, tags=["Employee Auth"])
def request_employee_login_otp(
    payload: EmployeeOtpRequestIn,
    db: Session = Depends(get_db),
):
    country_code, national_number, _e164 = _normalize_phone_parts(str(payload.phone))
    employee = (
        db.query(Employee)
        .filter(
            Employee.phone_country_code == country_code,
            Employee.phone_national_number == national_number,
            Employee.is_active.is_(True),
        )
        .first()
    )

    if not employee or employee.role not in EmployeeRole.all_roles():
        return EmployeeOtpRequestOut(message="If your employee account exists, OTP has been sent to your registered number.")

    if employee.otp_last_sent_at and (utcnow() - employee.otp_last_sent_at).total_seconds() < 45:
        raise HTTPException(status_code=429, detail="OTP recently sent. Please wait before resending.")

    otp = _generate_otp()
    employee.otp_hash = _hash_otp(otp)
    employee.otp_expires_at = utcnow() + timedelta(minutes=10)
    employee.otp_last_sent_at = utcnow()
    employee.otp_attempts = 0
    employee.updated_at = utcnow()
    db.commit()

    sms_text = (
        f"Bima House Employee OTP: {otp} "
        "Valid for 10 minutes. "
        "If you did not request this, ignore this message."
    )
    send_sms(to_phone=f"{country_code}{national_number}", body_text=sms_text)

    return EmployeeOtpRequestOut(message="If your employee account exists, OTP has been sent to your registered number.")


@router.post("/v1/employee-auth/verify-otp", response_model=EmployeeOtpVerifyOut, tags=["Employee Auth"])
def verify_employee_login_otp(
    payload: EmployeeOtpVerifyIn,
    db: Session = Depends(get_db),
):
    country_code, national_number, _e164 = _normalize_phone_parts(str(payload.phone))
    employee = (
        db.query(Employee)
        .filter(
            Employee.phone_country_code == country_code,
            Employee.phone_national_number == national_number,
            Employee.is_active.is_(True),
        )
        .first()
    )

    if not employee or employee.role not in EmployeeRole.all_roles():
        raise HTTPException(status_code=401, detail="Invalid login or OTP")

    if not employee.otp_hash or not employee.otp_expires_at:
        raise HTTPException(status_code=409, detail="OTP not requested yet")

    if utcnow() > employee.otp_expires_at:
        raise HTTPException(status_code=401, detail="OTP expired")

    employee.otp_attempts = (employee.otp_attempts or 0) + 1
    if employee.otp_attempts > 8:
        db.commit()
        raise HTTPException(status_code=429, detail="Too many attempts. Please request a new OTP.")

    if _hash_otp(payload.otp.strip()) != employee.otp_hash:
        employee.updated_at = utcnow()
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid OTP")

    employee.otp_hash = None
    employee.otp_expires_at = None
    employee.otp_last_sent_at = None
    employee.otp_attempts = 0
    employee.updated_at = utcnow()
    db.commit()

    access_token, expires_in = _issue_employee_token(employee)

    return EmployeeOtpVerifyOut(
        access_token=access_token,
        expires_in=expires_in,
        role=employee.role,
        employee_id=str(employee.id),
        primary_email=employee.primary_email,
    )

from dataclasses import dataclass
import logging
from typing import Optional
import uuid

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwk, jwt
from jose.utils import base64url_decode
import requests
from sqlalchemy.orm import Session

from app.core.clerk_client import get_primary_email_and_verified
from app.core.config import settings
from app.core.db import get_db
from app.employees.models import Employee, EmployeeRole
from app.users.models import Role, User

logger = logging.getLogger(__name__)

_jwks_cache = {"keys": None}
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v1/employee-auth/verify-otp", auto_error=False)


# -----------------------------
# Token verification helpers
# -----------------------------

def _get_jwks():
    if not settings.clerk_jwks_url:
        return None
    if _jwks_cache["keys"] is None:
        resp = requests.get(settings.clerk_jwks_url, timeout=10)
        resp.raise_for_status()
        _jwks_cache["keys"] = resp.json().get("keys", [])
    return _jwks_cache["keys"]


def _verify_clerk_jwt(token: str) -> str:
    keys = _get_jwks()
    if not keys:
        raise HTTPException(status_code=500, detail="Auth not configured: CLERK_JWKS_URL not set")

    headers = jwt.get_unverified_header(token)
    kid = headers.get("kid")
    key = next((k for k in keys if k.get("kid") == kid), None)

    if not key:
        _jwks_cache["keys"] = None
        keys = _get_jwks()
        key = next((k for k in keys if k.get("kid") == kid), None)

    if not key:
        raise HTTPException(status_code=401, detail="Invalid token (kid not found)")

    public_key = jwk.construct(key)
    message, encoded_sig = token.rsplit(".", 1)
    decoded_sig = base64url_decode(encoded_sig.encode("utf-8"))

    if not public_key.verify(message.encode("utf-8"), decoded_sig):
        raise HTTPException(status_code=401, detail="Invalid token (bad signature)")

    claims = jwt.get_unverified_claims(token)
    if settings.clerk_issuer and claims.get("iss") != settings.clerk_issuer:
        raise HTTPException(status_code=401, detail="Invalid token (issuer mismatch)")

    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token (missing subject)")
    return user_id


def _verify_employee_jwt(token: str) -> uuid.UUID:
    secret = settings.employee_jwt_secret
    if not secret:
        raise HTTPException(status_code=500, detail="Employee auth not configured: EMPLOYEE_JWT_SECRET missing")
    try:
        claims = jwt.decode(token, secret, algorithms=["HS256"], options={"verify_aud": False})
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid employee token") from exc

    if claims.get("typ") != "employee":
        raise HTTPException(status_code=401, detail="Invalid employee token type")

    employee_id = claims.get("sub")
    if not employee_id:
        raise HTTPException(status_code=401, detail="Invalid employee token (missing subject)")

    try:
        return uuid.UUID(str(employee_id))
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid employee token (bad subject)") from exc


def _verify_partner_jwt(token: str) -> uuid.UUID:
    secret = settings.partner_jwt_secret
    if not secret:
        raise HTTPException(status_code=500, detail="Partner auth not configured: PARTNER_JWT_SECRET missing")
    try:
        claims = jwt.decode(token, secret, algorithms=["HS256"], options={"verify_aud": False})
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid partner token") from exc

    if claims.get("typ") != "partner":
        raise HTTPException(status_code=401, detail="Invalid partner token type")

    partner_application_id = claims.get("sub")
    if not partner_application_id:
        raise HTTPException(status_code=401, detail="Invalid partner token (missing subject)")
    try:
        return uuid.UUID(str(partner_application_id))
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid partner token (bad subject)") from exc


# -----------------------------
# Record helpers
# -----------------------------

def _ensure_user_record(user_id: str, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.primary_email:
        return user

    email = None
    verified = False
    if settings.clerk_secret_key:
        try:
            email, verified = get_primary_email_and_verified(user_id)
        except HTTPException as exc:
            logger.warning("Clerk lookup failed for user %s: %s", user_id, exc.detail)

    if user:
        if email:
            user.primary_email = email
            user.email_verified = verified
            db.commit()
        return user

    user = User(id=user_id, primary_email=email, email_verified=verified, role=Role.CUSTOMER)
    db.add(user)
    db.commit()
    return user


def _get_active_employee_by_id(employee_id: uuid.UUID, db: Session) -> Optional[Employee]:
    return db.query(Employee).filter(Employee.id == employee_id, Employee.is_active.is_(True)).first()


# -----------------------------
# User auth dependencies (Clerk)
# -----------------------------

async def get_current_user_id(
    token: Optional[str] = Depends(oauth2_scheme),
) -> str:
    if settings.env == "dev" and settings.dev_user_id and not token:
        return settings.dev_user_id

    if not token:
        raise HTTPException(status_code=401, detail="Missing Authorization Bearer token")
    return _verify_clerk_jwt(token)


async def get_current_user_record(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> User:
    return _ensure_user_record(user_id, db)


# -----------------------------
# Employee auth dependencies
# -----------------------------

async def get_current_active_employee_record(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Employee:
    if not token:
        raise HTTPException(status_code=401, detail="Missing Authorization Bearer token")

    employee_id = _verify_employee_jwt(token)
    employee = _get_active_employee_by_id(employee_id, db)
    if not employee:
        raise HTTPException(status_code=401, detail="Employee account not found")
    return employee


def require_employee_roles(*roles: str):
    async def _require(employee: Employee = Depends(get_current_active_employee_record)) -> Employee:
        if employee.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return employee

    return _require


def require_any_employee_role():
    return require_employee_roles(*EmployeeRole.all_roles())


# -----------------------------
# Partner auth dependency
# -----------------------------

async def get_current_posp_application_id(
    token: Optional[str] = Depends(oauth2_scheme),
) -> uuid.UUID:
    if not token:
        raise HTTPException(status_code=401, detail="Missing Authorization Bearer token")
    return _verify_partner_jwt(token)


# -----------------------------
# Shared policy access
# -----------------------------

@dataclass
class PolicyAccess:
    """Represents who is accessing policies - either an employee or a partner."""

    employee: Optional[Employee] = None
    posp_application_id: Optional[uuid.UUID] = None

    @property
    def is_employee(self) -> bool:
        return self.employee is not None

    @property
    def is_partner(self) -> bool:
        return self.posp_application_id is not None


async def get_policy_access(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> PolicyAccess:
    """
    Flexible auth dependency for policies that handles both:
    - Employee tokens (view all policies)
    - Partner tokens (view own policies)
    """
    if not token:
        raise HTTPException(status_code=401, detail="Missing Authorization Bearer token")

    try:
        employee_id = _verify_employee_jwt(token)
        employee = _get_active_employee_by_id(employee_id, db)
        if not employee:
            raise HTTPException(status_code=401, detail="Employee account not found")
        if employee.role not in EmployeeRole.all_roles():
            raise HTTPException(status_code=403, detail="Insufficient role")
        return PolicyAccess(employee=employee)
    except HTTPException as employee_exc:
        if employee_exc.status_code == 403:
            raise

    try:
        posp_application_id = _verify_partner_jwt(token)
        return PolicyAccess(posp_application_id=posp_application_id)
    except HTTPException as partner_exc:
        raise HTTPException(status_code=401, detail="Invalid token") from partner_exc

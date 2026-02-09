from typing import Optional, Union
from dataclasses import dataclass
import logging
import requests
from jose import jwk, jwt, JWTError
from jose.utils import base64url_decode
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.db import get_db
from app.users.models import User, Role
from app.core.clerk_client import get_primary_email_and_verified

logger = logging.getLogger(__name__)

_jwks_cache = {"keys": None}

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


def _verify_partner_jwt(token: str) -> str:
    secret = settings.partner_jwt_secret
    if not secret:
        raise HTTPException(status_code=500, detail="Partner auth not configured: PARTNER_JWT_SECRET missing")
    try:
        claims = jwt.decode(token, secret, algorithms=["HS256"], options={"verify_aud": False})
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid partner token") from exc

    token_type = claims.get("typ")
    if token_type != "partner":
        raise HTTPException(status_code=401, detail="Invalid partner token type")

    partner_application_id = claims.get("sub")
    if not partner_application_id:
        raise HTTPException(status_code=401, detail="Invalid partner token (missing subject)")
    return partner_application_id

async def get_current_user_id(
    authorization: Optional[str] = Header(default=None),
) -> str:
    if settings.env == "dev" and settings.dev_user_id and not authorization:
        return settings.dev_user_id

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization Bearer token")

    token = authorization.split(" ", 1)[1].strip()
    return _verify_clerk_jwt(token)

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

async def get_current_user(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> str:
    _ensure_user_record(user_id, db)
    return user_id

async def get_current_user_record(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> User:
    return _ensure_user_record(user_id, db)

def require_roles(*roles: str):
    async def _require(user: User = Depends(get_current_user_record)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return user
    return _require

def require_employee_user():
    return require_roles(*Role.employee_roles())


async def get_current_posp_application_id(
    authorization: Optional[str] = Header(default=None),
) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization Bearer token")
    token = authorization.split(" ", 1)[1].strip()
    return _verify_partner_jwt(token)


@dataclass
class PolicyAccess:
    """Represents who is accessing policies - either an employee (User) or a partner (posp_application_id)."""
    user: Optional[User] = None
    posp_application_id: Optional[str] = None

    @property
    def is_employee(self) -> bool:
        return self.user is not None and self.user.role in Role.employee_roles()

    @property
    def is_partner(self) -> bool:
        return self.posp_application_id is not None


async def get_policy_access(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> PolicyAccess:
    """
    Flexible auth dependency for policies that handles both:
    - Clerk tokens (for employees viewing all policies)
    - Partner tokens (for partners viewing their own policies)
    
    First tries Clerk, then partner JWT.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization Bearer token")

    token = authorization.split(" ", 1)[1].strip()

    # Try Clerk token first (for employees)
    try:
        user_id = _verify_clerk_jwt(token)
        user = _ensure_user_record(user_id, db)
        # Check if user has employee role - they can see all policies
        if user.role in Role.employee_roles():
            return PolicyAccess(user=user)
        # Non-employee Clerk users (customers) shouldn't see policies via this route
        # They would need their own policy purchase flow in the future
        raise HTTPException(status_code=403, detail="Customers cannot access partner policies")
    except HTTPException as clerk_exc:
        # If it's not a Clerk token or user doesn't have access, try partner token
        if clerk_exc.status_code == 403:
            raise  # Re-raise permission errors immediately
        pass  # Continue to try partner token

    # Try partner token
    try:
        posp_application_id = _verify_partner_jwt(token)
        return PolicyAccess(posp_application_id=posp_application_id)
    except HTTPException as partner_exc:
        raise HTTPException(status_code=401, detail="Invalid token") from partner_exc

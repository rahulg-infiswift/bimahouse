from typing import Optional
import logging
import requests
from jose import jwk, jwt
from jose.utils import base64url_decode
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from .config import settings
from .db import get_db
from .models import User
from .clerk_client import get_primary_email_and_verified

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

async def get_current_user_id(
    authorization: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
) -> str:
    # DEV shortcut
    if settings.allow_dev_user_header and x_user_id:
        return x_user_id

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization Bearer token")

    token = authorization.split(" ", 1)[1].strip()
    return _verify_clerk_jwt(token)

def _ensure_user_record(user_id: str, db: Session) -> None:
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.primary_email:
        return

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
        return

    user = User(id=user_id, primary_email=email, email_verified=verified)
    db.add(user)
    db.commit()

async def get_current_user(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> str:
    _ensure_user_record(user_id, db)
    return user_id

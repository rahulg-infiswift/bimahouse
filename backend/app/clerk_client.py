# backend/app/clerk_client.py
from typing import Optional, Tuple
import requests
from fastapi import HTTPException

from .config import settings

CLERK_API_BASE = "https://api.clerk.com/v1"


def get_primary_email_and_verified(user_id: str) -> Tuple[Optional[str], bool]:
    """
    Returns (primary_email, is_verified) for a Clerk user_id by calling Clerk Backend API.
    Requires CLERK_SECRET_KEY in env.
    """
    if not settings.clerk_secret_key:
        raise HTTPException(status_code=500, detail="Auth not configured: CLERK_SECRET_KEY missing")

    headers = {"Authorization": f"Bearer {settings.clerk_secret_key}"}
    url = f"{CLERK_API_BASE}/users/{user_id}"

    try:
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Clerk API error: {type(e).__name__}: {str(e)}")

    primary_email_id = data.get("primary_email_address_id")
    emails = data.get("email_addresses", []) or []

    primary = next((e for e in emails if e.get("id") == primary_email_id), None)
    if not primary:
        # fallback: pick first email if primary not found
        primary = emails[0] if emails else None

    if not primary:
        return None, False

    email = primary.get("email_address")
    verification = primary.get("verification") or {}
    verified = verification.get("status") == "verified"

    return email, verified

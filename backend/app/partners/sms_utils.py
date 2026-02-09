import logging
from typing import Optional

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)


def _twilio_send_sms(*, to_phone: str, body_text: str) -> None:
    sid = settings.twilio_account_sid
    token = settings.twilio_auth_token
    from_number = settings.twilio_from_number
    if not sid or not token or not from_number:
        raise RuntimeError(
            "Twilio SMS not configured. Set TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER."
        )

    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    data = {
        "To": _normalize_phone(to_phone),
        "From": from_number,
        "Body": body_text,
    }
    resp = requests.post(url, data=data, auth=(sid, token), timeout=20)
    if not resp.ok:
        raise RuntimeError(f"Twilio SMS failed: {resp.status_code} {resp.text}")


def send_sms(*, to_phone: str, body_text: str) -> None:
    """
    SMS modes:
      - SMS_MODE=console -> logs SMS content (dev)
      - SMS_MODE=twilio  -> sends via Twilio API
    """
    mode = (settings.sms_mode or "console").lower().strip()

    if mode == "console":
        logger.warning("SMS_MODE=console: Would send SMS to=%s\n%s", _normalize_phone(to_phone), body_text)
        return

    if mode == "twilio":
        _twilio_send_sms(to_phone=to_phone, body_text=body_text)
        return

    raise RuntimeError(f"Unsupported SMS_MODE={mode}")


def _normalize_phone(phone: str) -> str:
    phone = (phone or "").strip()
    if phone.startswith("tel:"):
        phone = phone[4:]
    return phone

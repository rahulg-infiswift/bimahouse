import logging

from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client

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

    client = Client(sid, token)
    try:
        client.messages.create(
            body=body_text,
            from_=from_number,
            to=_normalize_phone(to_phone),
        )
    except TwilioRestException as exc:
        raise RuntimeError(f"Twilio SMS failed: {exc.status} {exc.msg}") from exc


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

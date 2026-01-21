# backend/app/partners/email_utils.py
import os
import smtplib
from email.message import EmailMessage
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(*, to_email: str, subject: str, body_text: str) -> None:
    """
    Email modes:
      - EMAIL_MODE=console  -> prints OTP to logs (dev)
      - EMAIL_MODE=smtp     -> sends via SMTP (prod)
    """
    mode = getattr(settings, "email_mode", "console") or "console"
    mode = mode.lower().strip()

    if mode == "console":
        logger.warning("EMAIL_MODE=console: Would send email to=%s subject=%s\n%s", to_email, subject, body_text)
        return

    if mode != "smtp":
        raise RuntimeError(f"Unsupported EMAIL_MODE={mode}")

    host = getattr(settings, "smtp_host", None)
    port = int(getattr(settings, "smtp_port", 587) or 587)
    user = getattr(settings, "smtp_user", None)
    password = getattr(settings, "smtp_password", None)
    from_email = getattr(settings, "smtp_from", None) or user

    if not host or not user or not password or not from_email:
        raise RuntimeError("SMTP not configured. Set SMTP_HOST/SMTP_USER/SMTP_PASSWORD/SMTP_FROM")

    msg = EmailMessage()
    msg["From"] = from_email
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body_text)

    with smtplib.SMTP(host, port, timeout=20) as server:
        server.starttls()
        server.login(user, password)
        server.send_message(msg)

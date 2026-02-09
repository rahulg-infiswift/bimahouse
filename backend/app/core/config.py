# backend/app/config.py
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    env: str = "dev"
    database_url: str
    redis_url: str = "redis://localhost:6379/0"
    rq_queue_name: str = "policy-extract"
    storage_dir: str = "./storage/pdfs"
    openai_model: str = "gpt-5-nano"
    openai_api_key: str  # required

    # Auth
    clerk_jwks_url: str = "https://sincere-akita-46.clerk.accounts.dev/.well-known/jwks.json"
    clerk_issuer: str = "https://sincere-akita-46.clerk.accounts.dev"
    clerk_secret_key: Optional[str] = None  # set in env in backend/.env (NOT committed)
    dev_user_id: Optional[str] = None
    partner_jwt_secret: Optional[str] = None
    partner_jwt_exp_minutes: int = 1440


    # Email OTP + Email sending
    otp_secret: Optional[str] = None  # required if using OTP routes

    # "console" prints email content in logs; "smtp" sends real email
    email_mode: str = "console"

    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from: Optional[str] = None

    # SMS OTP delivery
    # "console" logs SMS content; "twilio" sends real SMS.
    sms_mode: str = "console"
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_from_number: Optional[str] = None


settings = Settings()

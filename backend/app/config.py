# backend/app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

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
    openai_model: str = "gpt-5-mini"
    openai_api_key: str  # required

    # Auth
    clerk_jwks_url: str = "https://sincere-akita-46.clerk.accounts.dev/.well-known/jwks.json"
    clerk_issuer: str = "https://sincere-akita-46.clerk.accounts.dev"
    allow_dev_user_header: bool = True

settings = Settings()

from datetime import datetime, timezone
from typing import Optional
import uuid

from sqlalchemy import Boolean, DateTime, Integer, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class EmployeeRole:
    SALES = "sales"
    ARM_RM = "arm_rm"
    MANAGER = "manager"
    AREA_MANAGER = "area_manager"
    ZONAL_HEAD = "zonal_head"
    ADMIN = "admin"

    @classmethod
    def all_roles(cls) -> set[str]:
        return {cls.SALES, cls.ARM_RM, cls.MANAGER, cls.AREA_MANAGER, cls.ZONAL_HEAD, cls.ADMIN}


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    full_name: Mapped[Optional[str]] = mapped_column(String(length=255), nullable=True, index=True)
    primary_email: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    phone_country_code: Mapped[str] = mapped_column(String(5), nullable=False, index=True)
    phone_national_number: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))

    otp_hash: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    otp_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    otp_last_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    otp_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        server_default=text("now()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        server_default=text("now()"),
        onupdate=utcnow,
    )

# backend/app/users/models.py
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)

class Role:
    CUSTOMER = "customer"
    PARTNER = "partner"
    SALES = "sales"
    ARM_RM = "arm_rm"
    MANAGER = "manager"
    AREA_MANAGER = "area_manager"
    ZONAL_HEAD = "zonal_head"
    ADMIN = "admin"

    @classmethod
    def employee_roles(cls) -> set[str]:
        return {cls.SALES, cls.ARM_RM, cls.MANAGER, cls.AREA_MANAGER, cls.ZONAL_HEAD, cls.ADMIN}


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    primary_email: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    role: Mapped[str] = mapped_column(String, nullable=False, default=Role.CUSTOMER, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
    )

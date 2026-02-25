import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class AdvisorThread(Base):
    __tablename__ = "advisor_threads"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    partner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("posp_applications.id"),
        nullable=False,
        index=True,
    )
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active", index=True)
    is_live: Mapped[bool] = mapped_column(nullable=False, default=False)
    customer_profile: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    quotes_cache: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)

    messages: Mapped[list["AdvisorMessage"]] = relationship(
        "AdvisorMessage",
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="AdvisorMessage.created_at",
    )


class AdvisorMessage(Base):
    __tablename__ = "advisor_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("advisor_threads.id"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(16), nullable=False)  # "user" or "assistant"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    profile_snapshot: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    quotes_snapshot: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)

    thread: Mapped["AdvisorThread"] = relationship("AdvisorThread", back_populates="messages")

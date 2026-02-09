# backend/app/policies/models.py
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base

class JobStatus:
    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    posp_application_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("posp_applications.id"),
        nullable=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(String, nullable=False, default=JobStatus.QUEUED, index=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    policy_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("policies.id"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)

    policy: Mapped[Optional["Policy"]] = relationship("Policy", back_populates="job", uselist=False)

class Policy(Base):
    __tablename__ = "policies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    posp_application_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("posp_applications.id"),
        nullable=True,
        index=True,
    )

    original_filename: Mapped[str] = mapped_column(String, nullable=False)
    pdf_storage_key: Mapped[str] = mapped_column(String, nullable=False)   # local path
    schema_version: Mapped[str] = mapped_column(String, nullable=False, default="v1")

    extracted_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)

    job: Mapped[Optional["Job"]] = relationship("Job", back_populates="policy", uselist=False)

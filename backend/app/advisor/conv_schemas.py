from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CreateThreadIn(BaseModel):
    is_live: bool = False
    initial_message: Optional[str] = Field(default=None, max_length=4000)


class SendMessageIn(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)


class MessageOut(BaseModel):
    id: UUID
    thread_id: UUID
    role: str
    content: str
    profile_snapshot: Optional[dict[str, Any]] = None
    quotes_snapshot: Optional[dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ThreadOut(BaseModel):
    id: UUID
    title: Optional[str] = None
    status: str
    is_live: bool
    message_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ThreadDetailOut(BaseModel):
    id: UUID
    title: Optional[str] = None
    status: str
    is_live: bool
    customer_profile: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    messages: list[MessageOut]

    model_config = {"from_attributes": True}


class ThreadListOut(BaseModel):
    threads: list[ThreadOut]

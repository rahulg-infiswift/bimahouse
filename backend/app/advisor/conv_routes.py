from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.advisor.conv_schemas import (
    CreateThreadIn,
    MessageOut,
    SendMessageIn,
    ThreadDetailOut,
    ThreadListOut,
    ThreadOut,
)
from app.advisor.conv_service import (
    has_pending_interrupt,
    resume_from_interrupt,
    run_conversational_turn,
)
from app.advisor.models import AdvisorMessage, AdvisorThread
from app.core.auth import get_current_posp_application_id
from app.core.db import get_db
from app.partners.models import PospApplication

router = APIRouter(tags=["Advisor Conversations"])


def _get_current_approved_posp_application(
    posp_application_id: uuid.UUID = Depends(get_current_posp_application_id),
    db: Session = Depends(get_db),
) -> PospApplication:
    posp_application = db.query(PospApplication).filter(PospApplication.id == posp_application_id).first()
    if not posp_application:
        raise HTTPException(status_code=401, detail="Invalid partner session")
    if posp_application.status != "approved":
        raise HTTPException(status_code=403, detail="Partner account is not approved")
    return posp_application

# Phrases that count as user approval for HITL
_APPROVAL_PHRASES = frozenset(
    {"yes", "y", "confirm", "proceed", "go ahead", "ok", "sure", "do it", "fetch", "go", "yep", "yeah"}
)


def _utcnow():
    return datetime.now(timezone.utc)


def _is_approval(text: str) -> bool:
    return text.strip().lower().rstrip(".!") in _APPROVAL_PHRASES


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/v1/partner/advisor/threads", response_model=ThreadDetailOut)
def create_thread(
    payload: CreateThreadIn,
    posp: PospApplication = Depends(_get_current_approved_posp_application),
    db: Session = Depends(get_db),
):
    thread = AdvisorThread(
        id=uuid.uuid4(),
        partner_id=posp.id,
        status="active",
        is_live=payload.is_live,
        customer_profile={},
    )
    db.add(thread)
    db.flush()

    messages: list[AdvisorMessage] = []

    if payload.initial_message:
        user_msg, assistant_msg = _process_turn(db, thread, payload.initial_message)
        messages.extend([user_msg, assistant_msg])

    db.commit()
    db.refresh(thread)

    return _thread_detail(thread, messages or list(thread.messages))


@router.post("/v1/partner/advisor/threads/{thread_id}/messages", response_model=list[MessageOut])
def send_message(
    thread_id: uuid.UUID,
    payload: SendMessageIn,
    posp: PospApplication = Depends(_get_current_approved_posp_application),
    db: Session = Depends(get_db),
):
    thread = (
        db.query(AdvisorThread)
        .filter(AdvisorThread.id == thread_id, AdvisorThread.partner_id == posp.id)
        .first()
    )
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    # ── Check for pending HITL interrupt ────────────────────────
    interrupt_data = has_pending_interrupt(str(thread.id))
    if interrupt_data:
        return _handle_interrupt_response(db, thread, payload.message, interrupt_data)
    # ────────────────────────────────────────────────────────────

    user_msg, assistant_msg = _process_turn(db, thread, payload.message)
    db.commit()
    db.refresh(user_msg)
    db.refresh(assistant_msg)

    return [
        MessageOut.model_validate(user_msg),
        MessageOut.model_validate(assistant_msg),
    ]


@router.get("/v1/partner/advisor/threads", response_model=ThreadListOut)
def list_threads(
    posp: PospApplication = Depends(_get_current_approved_posp_application),
    db: Session = Depends(get_db),
):
    threads = (
        db.query(AdvisorThread)
        .filter(AdvisorThread.partner_id == posp.id)
        .order_by(AdvisorThread.updated_at.desc())
        .all()
    )

    counts = dict(
        db.query(AdvisorMessage.thread_id, func.count(AdvisorMessage.id))
        .filter(AdvisorMessage.thread_id.in_([t.id for t in threads]))
        .group_by(AdvisorMessage.thread_id)
        .all()
    ) if threads else {}

    return ThreadListOut(
        threads=[
            ThreadOut(
                id=t.id,
                title=t.title,
                status=t.status,
                is_live=t.is_live,
                message_count=counts.get(t.id, 0),
                created_at=t.created_at,
                updated_at=t.updated_at,
            )
            for t in threads
        ]
    )


@router.get("/v1/partner/advisor/threads/{thread_id}", response_model=ThreadDetailOut)
def get_thread(
    thread_id: uuid.UUID,
    posp: PospApplication = Depends(_get_current_approved_posp_application),
    db: Session = Depends(get_db),
):
    thread = (
        db.query(AdvisorThread)
        .filter(AdvisorThread.id == thread_id, AdvisorThread.partner_id == posp.id)
        .first()
    )
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    return _thread_detail(thread, list(thread.messages))


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _handle_interrupt_response(
    db: Session,
    thread: AdvisorThread,
    user_text: str,
    interrupt_data: dict,
) -> list[MessageOut]:
    """Handle a user response to a pending HITL interrupt (approve / decline)."""
    now = _utcnow()

    # Save the user's confirmation/rejection message
    user_msg = AdvisorMessage(
        id=uuid.uuid4(),
        thread_id=thread.id,
        role="user",
        content=user_text,
        created_at=now,
    )
    db.add(user_msg)
    db.flush()

    approved = _is_approval(user_text)
    result = resume_from_interrupt(str(thread.id), approved)

    # Update thread state
    updated_profile = result.get("updated_profile") or thread.customer_profile or {}
    thread.customer_profile = {**updated_profile}
    thread.updated_at = now

    quotes_result = result.get("quotes_result")
    if quotes_result:
        thread.quotes_cache = {**quotes_result}

    assistant_msg = AdvisorMessage(
        id=uuid.uuid4(),
        thread_id=thread.id,
        role="assistant",
        content=result["assistant_reply"],
        profile_snapshot={**updated_profile},
        quotes_snapshot={**quotes_result} if quotes_result else None,
        created_at=_utcnow(),
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(user_msg)
    db.refresh(assistant_msg)

    return [
        MessageOut.model_validate(user_msg),
        MessageOut.model_validate(assistant_msg),
    ]


def _process_turn(
    db: Session,
    thread: AdvisorThread,
    user_text: str,
) -> tuple[AdvisorMessage, AdvisorMessage]:
    """Process a normal conversational turn (no pending interrupt)."""
    now = _utcnow()

    # Save user message
    user_msg = AdvisorMessage(
        id=uuid.uuid4(),
        thread_id=thread.id,
        role="user",
        content=user_text,
        created_at=now,
    )
    db.add(user_msg)
    db.flush()

    # Build history from existing DB messages
    existing = (
        db.query(AdvisorMessage)
        .filter(AdvisorMessage.thread_id == thread.id)
        .order_by(AdvisorMessage.created_at)
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in existing]

    # Run agent
    result = run_conversational_turn(
        thread_id=str(thread.id),
        history=history,
        customer_profile=thread.customer_profile or {},
        user_message=user_text,
        is_live=thread.is_live,
        quotes_cache=thread.quotes_cache,
    )

    # Update thread state (new dict for JSONB mutation detection)
    updated_profile = result.get("updated_profile") or thread.customer_profile or {}
    thread.customer_profile = {**updated_profile}
    thread.updated_at = now

    quotes_result = result.get("quotes_result")
    if quotes_result:
        thread.quotes_cache = {**quotes_result}

    # Auto-generate title from first user message
    if not thread.title:
        thread.title = user_text[:100].strip()

    # Determine assistant reply — may include HITL confirmation prompt
    assistant_reply = result["assistant_reply"]

    # Save assistant message
    assistant_msg = AdvisorMessage(
        id=uuid.uuid4(),
        thread_id=thread.id,
        role="assistant",
        content=assistant_reply,
        profile_snapshot={**updated_profile},
        quotes_snapshot={**quotes_result} if quotes_result else None,
        created_at=_utcnow(),
    )
    db.add(assistant_msg)
    db.flush()

    return user_msg, assistant_msg


def _thread_detail(thread: AdvisorThread, messages: list[AdvisorMessage]) -> ThreadDetailOut:
    return ThreadDetailOut(
        id=thread.id,
        title=thread.title,
        status=thread.status,
        is_live=thread.is_live,
        customer_profile=thread.customer_profile,
        created_at=thread.created_at,
        updated_at=thread.updated_at,
        messages=[MessageOut.model_validate(m) for m in messages],
    )

"""Add advisor conversation tables

Revision ID: 012_advisor_conversations
Revises: 011_drop_posp_phone_parts
Create Date: 2026-02-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

# revision identifiers, used by Alembic.
revision: str = "012_advisor_conversations"
down_revision: Union[str, None] = "011_drop_posp_phone_parts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "advisor_threads",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("partner_id", UUID(as_uuid=True), sa.ForeignKey("posp_applications.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column("is_live", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("customer_profile", JSONB, nullable=True),
        sa.Column("quotes_cache", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_advisor_threads_partner_id", "advisor_threads", ["partner_id"])
    op.create_index("ix_advisor_threads_status", "advisor_threads", ["status"])

    op.create_table(
        "advisor_messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("thread_id", UUID(as_uuid=True), sa.ForeignKey("advisor_threads.id"), nullable=False),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("profile_snapshot", JSONB, nullable=True),
        sa.Column("quotes_snapshot", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_advisor_messages_thread_id", "advisor_messages", ["thread_id"])


def downgrade() -> None:
    op.drop_index("ix_advisor_messages_thread_id", table_name="advisor_messages")
    op.drop_table("advisor_messages")
    op.drop_index("ix_advisor_threads_status", table_name="advisor_threads")
    op.drop_index("ix_advisor_threads_partner_id", table_name="advisor_threads")
    op.drop_table("advisor_threads")

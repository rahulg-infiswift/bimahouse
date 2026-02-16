"""Add refresh token fields for employees and partners

Revision ID: 010_refresh_tokens
Revises: 009_employee_otp_auth
Create Date: 2026-02-16
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "010_refresh_tokens"
down_revision: Union[str, None] = "009_employee_otp_auth"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("refresh_token_hash", sa.String(), nullable=True))
    op.add_column("employees", sa.Column("refresh_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("employees", sa.Column("refresh_last_issued_at", sa.DateTime(timezone=True), nullable=True))

    op.add_column("posp_applications", sa.Column("refresh_token_hash", sa.String(), nullable=True))
    op.add_column("posp_applications", sa.Column("refresh_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("posp_applications", sa.Column("refresh_last_issued_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("posp_applications", "refresh_last_issued_at")
    op.drop_column("posp_applications", "refresh_expires_at")
    op.drop_column("posp_applications", "refresh_token_hash")

    op.drop_column("employees", "refresh_last_issued_at")
    op.drop_column("employees", "refresh_expires_at")
    op.drop_column("employees", "refresh_token_hash")

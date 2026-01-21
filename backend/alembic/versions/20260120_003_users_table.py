"""Add users table

Revision ID: 003_users_table
Revises: 002_clerk_user_id
Create Date: 2026-01-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "003_users_table"
down_revision: Union[str, None] = "002_clerk_user_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("primary_email", sa.String(), nullable=True),
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_users_primary_email", "users", ["primary_email"])


def downgrade() -> None:
    op.drop_index("idx_users_primary_email", table_name="users")
    op.drop_table("users")

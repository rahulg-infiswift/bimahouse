"""Add role to users

Revision ID: 004_user_role
Revises: 003_users_table
Create Date: 2026-01-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "004_user_role"
down_revision: Union[str, None] = "003_users_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("role", sa.String(), nullable=False, server_default=sa.text("'customer'")),
    )
    op.create_index("idx_users_role", "users", ["role"])
    op.alter_column("users", "role", server_default=None)


def downgrade() -> None:
    op.drop_index("idx_users_role", table_name="users")
    op.drop_column("users", "role")

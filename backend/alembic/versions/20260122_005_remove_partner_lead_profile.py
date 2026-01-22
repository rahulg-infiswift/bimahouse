"""Remove partner lead profile JSON column

Revision ID: 005_remove_partner_lead_profile
Revises: 004_user_role
Create Date: 2026-01-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "005_remove_partner_lead_profile"
down_revision: Union[str, None] = "004_user_role"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("partner_leads", "profile")


def downgrade() -> None:
    op.add_column("partner_leads", sa.Column("profile", postgresql.JSONB(astext_type=sa.Text()), nullable=True))

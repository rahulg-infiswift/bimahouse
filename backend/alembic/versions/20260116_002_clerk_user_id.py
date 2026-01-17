"""Add clerk_user_id to partner_leads

Revision ID: 002_clerk_user_id
Revises: 001_initial
Create Date: 2026-01-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_clerk_user_id'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add clerk_user_id column to partner_leads
    op.add_column('partner_leads', sa.Column('clerk_user_id', sa.String(), nullable=True))
    op.create_unique_constraint('uq_partner_leads_clerk_user_id', 'partner_leads', ['clerk_user_id'])
    op.create_index('idx_partner_leads_clerk_user_id', 'partner_leads', ['clerk_user_id'])


def downgrade() -> None:
    op.drop_index('idx_partner_leads_clerk_user_id', table_name='partner_leads')
    op.drop_constraint('uq_partner_leads_clerk_user_id', 'partner_leads', type_='unique')
    op.drop_column('partner_leads', 'clerk_user_id')

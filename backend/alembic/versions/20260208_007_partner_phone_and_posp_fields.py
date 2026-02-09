"""Add partner phone split and POSP application fields

Revision ID: 007_partner_phone_and_posp_fields
Revises: 006_posp_applications
Create Date: 2026-02-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "007_partner_phone_and_posp_fields"
down_revision: Union[str, None] = "006_posp_applications"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("posp_applications", sa.Column("phone_country_code", sa.String(length=5), nullable=True))
    op.add_column("posp_applications", sa.Column("phone_national_number", sa.String(length=10), nullable=True))
    op.add_column("posp_applications", sa.Column("business_location", sa.String(length=255), nullable=True))
    op.add_column("posp_applications", sa.Column("current_insurance_experience", sa.Integer(), nullable=True))
    op.add_column("posp_applications", sa.Column("preferred_products", sa.Text(), nullable=True))
    op.create_index(
        "idx_posp_applications_phone_country_national",
        "posp_applications",
        ["phone_country_code", "phone_national_number"],
    )


def downgrade() -> None:
    op.drop_index("idx_posp_applications_phone_country_national", table_name="posp_applications")
    op.drop_column("posp_applications", "preferred_products")
    op.drop_column("posp_applications", "current_insurance_experience")
    op.drop_column("posp_applications", "business_location")
    op.drop_column("posp_applications", "phone_national_number")
    op.drop_column("posp_applications", "phone_country_code")

"""Drop POSP phone parts and index phone

Revision ID: 011_drop_posp_phone_parts
Revises: 010_refresh_tokens
Create Date: 2026-02-16
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "011_drop_posp_phone_parts"
down_revision: Union[str, None] = "010_refresh_tokens"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE posp_applications
        SET phone = '+' || regexp_replace(phone, '\\D', '', 'g')
        WHERE phone IS NOT NULL;
        """
    )
    op.drop_index("idx_posp_applications_phone_country_national", table_name="posp_applications")
    op.drop_column("posp_applications", "phone_national_number")
    op.drop_column("posp_applications", "phone_country_code")
    op.create_index("ix_posp_applications_phone", "posp_applications", ["phone"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_posp_applications_phone", table_name="posp_applications")
    op.add_column("posp_applications", sa.Column("phone_country_code", sa.String(length=5), nullable=True))
    op.add_column("posp_applications", sa.Column("phone_national_number", sa.String(length=10), nullable=True))
    op.execute(
        """
        WITH normalized AS (
            SELECT
                id,
                regexp_replace(phone, '\\D', '', 'g') AS digits
            FROM posp_applications
            WHERE phone IS NOT NULL
        )
        UPDATE posp_applications AS p
        SET
            phone_country_code = CASE
                WHEN length(n.digits) > 10 THEN '+' || left(n.digits, length(n.digits) - 10)
            END,
            phone_national_number = CASE
                WHEN length(n.digits) >= 10 THEN right(n.digits, 10)
            END
        FROM normalized AS n
        WHERE p.id = n.id;
        """
    )
    op.alter_column("posp_applications", "phone_country_code", nullable=False)
    op.alter_column("posp_applications", "phone_national_number", nullable=False)
    op.create_index(
        "idx_posp_applications_phone_country_national",
        "posp_applications",
        ["phone_country_code", "phone_national_number"],
        unique=False,
    )

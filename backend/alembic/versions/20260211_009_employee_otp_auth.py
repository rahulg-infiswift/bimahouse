"""Create employees table for OTP auth

Revision ID: 009_employee_otp_auth
Revises: 008_policy_posp_ownership
Create Date: 2026-02-11
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "009_employee_otp_auth"
down_revision: Union[str, None] = "008_policy_posp_ownership"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.create_table(
        "employees",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("primary_email", sa.String(), nullable=True),
        sa.Column("phone_country_code", sa.String(length=5), nullable=False),
        sa.Column("phone_national_number", sa.String(length=10), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("otp_hash", sa.String(), nullable=True),
        sa.Column("otp_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("otp_last_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("otp_attempts", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("phone_country_code", "phone_national_number", name="uq_employees_phone"),
    )

    op.create_index("ix_employees_full_name", "employees", ["full_name"], unique=False)
    op.create_index("ix_employees_primary_email", "employees", ["primary_email"], unique=False)
    op.create_index("ix_employees_phone_country_code", "employees", ["phone_country_code"], unique=False)
    op.create_index("ix_employees_phone_national_number", "employees", ["phone_national_number"], unique=False)
    op.create_index("ix_employees_role", "employees", ["role"], unique=False)

def downgrade() -> None:
    op.drop_index("ix_employees_full_name", table_name="employees")
    op.drop_index("ix_employees_role", table_name="employees")
    op.drop_index("ix_employees_phone_national_number", table_name="employees")
    op.drop_index("ix_employees_phone_country_code", table_name="employees")
    op.drop_index("ix_employees_primary_email", table_name="employees")
    op.drop_table("employees")

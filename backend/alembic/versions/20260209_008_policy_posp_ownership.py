"""Add POSP application ownership columns to policies and jobs

Revision ID: 008_policy_posp_ownership
Revises: 007_split_phone_add_posp_fields
Create Date: 2026-02-09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "008_policy_posp_ownership"
down_revision: Union[str, None] = "007_split_phone_add_posp_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("policies", sa.Column("posp_application_id", sa.UUID(), nullable=True))
    op.create_index(
        "ix_policies_posp_application_id",
        "policies",
        ["posp_application_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_policies_posp_application_id",
        "policies",
        "posp_applications",
        ["posp_application_id"],
        ["id"],
    )

    op.add_column("jobs", sa.Column("posp_application_id", sa.UUID(), nullable=True))
    op.create_index(
        "ix_jobs_posp_application_id",
        "jobs",
        ["posp_application_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_jobs_posp_application_id",
        "jobs",
        "posp_applications",
        ["posp_application_id"],
        ["id"],
    )

    # Drop legacy ownership columns.
    op.execute("DROP INDEX IF EXISTS ix_policies_user_id")
    op.execute("DROP INDEX IF EXISTS ix_jobs_user_id")
    op.drop_column("policies", "user_id")
    op.drop_column("jobs", "user_id")

def downgrade() -> None:
    # Restore legacy ownership columns.
    op.add_column("jobs", sa.Column("user_id", sa.String(), nullable=True))
    op.create_index("ix_jobs_user_id", "jobs", ["user_id"], unique=False)
    op.add_column("policies", sa.Column("user_id", sa.String(), nullable=True))
    op.create_index("ix_policies_user_id", "policies", ["user_id"], unique=False)

    op.drop_constraint("fk_jobs_posp_application_id", "jobs", type_="foreignkey")
    op.drop_index("ix_jobs_posp_application_id", table_name="jobs")
    op.drop_column("jobs", "posp_application_id")

    op.drop_constraint("fk_policies_posp_application_id", "policies", type_="foreignkey")
    op.drop_index("ix_policies_posp_application_id", table_name="policies")
    op.drop_column("policies", "posp_application_id")

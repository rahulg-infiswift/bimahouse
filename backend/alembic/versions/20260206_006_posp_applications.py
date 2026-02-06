"""Replace partner_leads with posp_applications

Revision ID: 006_posp_applications
Revises: 005_remove_partner_lead_profile
Create Date: 2026-02-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "006_posp_applications"
down_revision: Union[str, None] = "005_remove_partner_lead_profile"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS partner_lead_documents CASCADE")
    op.execute("DROP TABLE IF EXISTS partner_profiles CASCADE")
    op.execute("DROP TABLE IF EXISTS partner_leads CASCADE")
    op.execute("DROP SEQUENCE IF EXISTS partner_number_seq")
    op.execute("DROP SEQUENCE IF EXISTS lead_number_seq")

    op.execute("CREATE SEQUENCE IF NOT EXISTS lead_number_seq START WITH 1 INCREMENT BY 1")
    op.execute("CREATE SEQUENCE IF NOT EXISTS partner_number_seq START WITH 1 INCREMENT BY 1")

    op.create_table(
        "posp_applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("lead_number", sa.Integer(), nullable=False, server_default=sa.text("nextval('lead_number_seq')")),
        sa.Column("partner_number", sa.Integer(), nullable=True),
        sa.Column("clerk_user_id", sa.String(), nullable=True),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column("lead_email", sa.String(), nullable=False),
        sa.Column("phone", sa.String(), nullable=False),
        sa.Column("created_via", sa.String(), nullable=False, server_default=sa.text("'sales_assisted'")),
        sa.Column("status", sa.String(), nullable=False, server_default=sa.text("'submitted'")),
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("otp_hash", sa.String(), nullable=True),
        sa.Column("otp_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("otp_last_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("otp_attempts", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("internal_notes", sa.Text(), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("gender", sa.String(20), nullable=True),
        sa.Column("pan_number", sa.String(10), nullable=True),
        sa.Column("aadhaar_number", sa.String(12), nullable=True),
        sa.Column("address_line1", sa.String(500), nullable=True),
        sa.Column("address_line2", sa.String(500), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("state", sa.String(100), nullable=True),
        sa.Column("pincode", sa.String(6), nullable=True),
        sa.Column("bank_name", sa.String(255), nullable=True),
        sa.Column("branch_name", sa.String(255), nullable=True),
        sa.Column("account_holder_name", sa.String(255), nullable=True),
        sa.Column("account_number", sa.String(20), nullable=True),
        sa.Column("ifsc_code", sa.String(11), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    op.create_unique_constraint("uq_posp_applications_lead_number", "posp_applications", ["lead_number"])
    op.create_unique_constraint("uq_posp_applications_partner_number", "posp_applications", ["partner_number"])
    op.create_unique_constraint("uq_posp_applications_clerk_user_id", "posp_applications", ["clerk_user_id"])
    op.create_index("idx_posp_applications_lead_number", "posp_applications", ["lead_number"])
    op.create_index("idx_posp_applications_partner_number", "posp_applications", ["partner_number"])
    op.create_index("idx_posp_applications_clerk_user_id", "posp_applications", ["clerk_user_id"])
    op.create_index("idx_posp_applications_lead_email", "posp_applications", ["lead_email"])
    op.create_index("idx_posp_applications_status", "posp_applications", ["status"])
    op.create_index("idx_posp_applications_created_via", "posp_applications", ["created_via"])
    op.create_index("idx_posp_applications_pan_number", "posp_applications", ["pan_number"])

    op.create_table(
        "posp_application_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("posp_applications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("doc_type", sa.String(), nullable=False),
        sa.Column("storage_key", sa.String(), nullable=False),
        sa.Column("original_filename", sa.String(), nullable=False),
        sa.Column("content_type", sa.String(), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("verification_status", sa.String(), nullable=False, server_default=sa.text("'verified'")),
        sa.Column("verification_notes", sa.Text(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_posp_application_documents_lead_id", "posp_application_documents", ["lead_id"])
    op.create_index("idx_posp_application_documents_doc_type", "posp_application_documents", ["doc_type"])


def downgrade() -> None:
    op.drop_index("idx_posp_application_documents_doc_type", table_name="posp_application_documents")
    op.drop_index("idx_posp_application_documents_lead_id", table_name="posp_application_documents")
    op.drop_table("posp_application_documents")

    op.drop_index("idx_posp_applications_pan_number", table_name="posp_applications")
    op.drop_index("idx_posp_applications_created_via", table_name="posp_applications")
    op.drop_index("idx_posp_applications_status", table_name="posp_applications")
    op.drop_index("idx_posp_applications_lead_email", table_name="posp_applications")
    op.drop_index("idx_posp_applications_clerk_user_id", table_name="posp_applications")
    op.drop_index("idx_posp_applications_partner_number", table_name="posp_applications")
    op.drop_index("idx_posp_applications_lead_number", table_name="posp_applications")
    op.drop_constraint("uq_posp_applications_clerk_user_id", "posp_applications", type_="unique")
    op.drop_constraint("uq_posp_applications_partner_number", "posp_applications", type_="unique")
    op.drop_constraint("uq_posp_applications_lead_number", "posp_applications", type_="unique")
    op.drop_table("posp_applications")

    op.execute("DROP SEQUENCE IF EXISTS partner_number_seq")
    op.execute("DROP SEQUENCE IF EXISTS lead_number_seq")

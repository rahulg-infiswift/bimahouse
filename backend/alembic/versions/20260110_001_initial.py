"""Add lead_number, partner_number sequences and partner_profiles table

Revision ID: 001_initial
Revises: 
Create Date: 2026-01-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create sequences for lead and partner numbers
    op.execute("CREATE SEQUENCE IF NOT EXISTS lead_number_seq START WITH 1 INCREMENT BY 1")
    op.execute("CREATE SEQUENCE IF NOT EXISTS partner_number_seq START WITH 1 INCREMENT BY 1")
    
    # Add lead_number column to partner_leads
    op.add_column('partner_leads', sa.Column('lead_number', sa.Integer(), nullable=True))
    op.create_unique_constraint('uq_partner_leads_lead_number', 'partner_leads', ['lead_number'])
    
    # Set default for new records
    op.execute("ALTER TABLE partner_leads ALTER COLUMN lead_number SET DEFAULT nextval('lead_number_seq')")
    
    # Populate existing records with sequential numbers
    op.execute("""
        WITH numbered AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
            FROM partner_leads
            WHERE lead_number IS NULL
        )
        UPDATE partner_leads 
        SET lead_number = numbered.rn
        FROM numbered
        WHERE partner_leads.id = numbered.id
    """)
    
    # Make lead_number NOT NULL after populating
    op.alter_column('partner_leads', 'lead_number', nullable=False)
    
    # Update sequence to start after max existing lead_number
    op.execute("SELECT setval('lead_number_seq', COALESCE((SELECT MAX(lead_number) FROM partner_leads), 0))")
    
    # Create index for lead_number
    op.create_index('idx_partner_leads_lead_number', 'partner_leads', ['lead_number'])
    
    # Add partner_number column (assigned when lead is approved)
    op.add_column('partner_leads', sa.Column('partner_number', sa.Integer(), nullable=True))
    op.create_unique_constraint('uq_partner_leads_partner_number', 'partner_leads', ['partner_number'])
    op.create_index('idx_partner_leads_partner_number', 'partner_leads', ['partner_number'])
    
    # Populate partner_number for existing approved leads
    op.execute("""
        WITH numbered AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY updated_at) as rn
            FROM partner_leads
            WHERE status = 'approved' AND partner_number IS NULL
        )
        UPDATE partner_leads 
        SET partner_number = numbered.rn
        FROM numbered
        WHERE partner_leads.id = numbered.id
    """)
    
    # Update partner sequence to start after max existing partner_number
    op.execute("SELECT setval('partner_number_seq', COALESCE((SELECT MAX(partner_number) FROM partner_leads), 0))")
    
    # Create partner_profiles table
    op.create_table(
        'partner_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('lead_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('partner_leads.id', ondelete='CASCADE'), nullable=False, unique=True),
        
        # Personal Details
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('gender', sa.String(20), nullable=True),
        sa.Column('father_name', sa.String(255), nullable=True),
        
        # Identity Documents
        sa.Column('pan_number', sa.String(10), nullable=True),
        sa.Column('aadhaar_number', sa.String(12), nullable=True),
        
        # Address
        sa.Column('address_line1', sa.String(500), nullable=True),
        sa.Column('address_line2', sa.String(500), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('state', sa.String(100), nullable=True),
        sa.Column('pincode', sa.String(6), nullable=True),
        
        # Bank Details
        sa.Column('bank_name', sa.String(255), nullable=True),
        sa.Column('branch_name', sa.String(255), nullable=True),
        sa.Column('account_holder_name', sa.String(255), nullable=True),
        sa.Column('account_number', sa.String(20), nullable=True),
        sa.Column('ifsc_code', sa.String(11), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    
    # Create indexes for partner_profiles
    op.create_index('idx_partner_profiles_lead_id', 'partner_profiles', ['lead_id'])
    op.create_index('idx_partner_profiles_pan_number', 'partner_profiles', ['pan_number'])


def downgrade() -> None:
    # Drop partner_profiles table
    op.drop_index('idx_partner_profiles_pan_number', table_name='partner_profiles')
    op.drop_index('idx_partner_profiles_lead_id', table_name='partner_profiles')
    op.drop_table('partner_profiles')
    
    # Drop partner_number column
    op.drop_index('idx_partner_leads_partner_number', table_name='partner_leads')
    op.drop_constraint('uq_partner_leads_partner_number', 'partner_leads', type_='unique')
    op.drop_column('partner_leads', 'partner_number')
    
    # Drop lead_number column
    op.drop_index('idx_partner_leads_lead_number', table_name='partner_leads')
    op.drop_constraint('uq_partner_leads_lead_number', 'partner_leads', type_='unique')
    op.drop_column('partner_leads', 'lead_number')
    
    # Drop sequences
    op.execute("DROP SEQUENCE IF EXISTS partner_number_seq")
    op.execute("DROP SEQUENCE IF EXISTS lead_number_seq")

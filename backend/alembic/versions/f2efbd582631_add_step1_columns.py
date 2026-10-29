"""add_step1_columns

Revision ID: f2efbd582631
Revises: e3efbd582630
Create Date: 2026-08-22 11:47:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f2efbd582631'
down_revision: Union[str, None] = 'e3efbd582630'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add columns to connected_accounts
    op.add_column('connected_accounts', sa.Column('opening_balance', sa.Numeric(14, 2), nullable=True))
    
    # Add columns to monthly_finances
    op.add_column('monthly_finances', sa.Column('manual_income_adjustment', sa.Numeric(14, 2), nullable=True))
    op.add_column('monthly_finances', sa.Column('carryover', sa.Numeric(14, 2), nullable=True))
    
    # Create income_patterns table
    op.create_table(
        'income_patterns',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('narration_pattern', sa.String(length=255), nullable=False),
        sa.Column('merchant_name', sa.String(length=255), nullable=True),
        sa.Column('connected_account_id', sa.UUID(), nullable=True),
        sa.Column('typical_amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('amount_tolerance', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('frequency', sa.String(length=50), nullable=True),
        sa.Column('is_confirmed', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['connected_account_id'], ['connected_accounts.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('income_patterns')
    op.drop_column('monthly_finances', 'carryover')
    op.drop_column('monthly_finances', 'manual_income_adjustment')
    op.drop_column('connected_accounts', 'opening_balance')

"""add B2 banking sync columns and bank_transactions table

Revision ID: 6818323e5d46
Revises: 5818323e5d45
Create Date: 2026-08-21 20:02:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '6818323e5d46'
down_revision: Union[str, None] = '5818323e5d45'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add balance_status, balance_timestamp, last_synced_at to connected_accounts
    op.add_column('connected_accounts', sa.Column('balance_status', sa.String(length=50), nullable=False, server_default='NOT_SYNCED'))
    op.add_column('connected_accounts', sa.Column('balance_timestamp', sa.DateTime(timezone=True), nullable=True))
    op.add_column('connected_accounts', sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True))

    # 2. Create bank_transactions table
    op.create_table(
        'bank_transactions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('connected_account_id', sa.UUID(), nullable=False),
        sa.Column('provider_transaction_id', sa.String(length=255), nullable=True),
        sa.Column('transaction_timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('transaction_type', sa.String(length=20), nullable=False),
        sa.Column('narration', sa.String(length=500), nullable=True),
        sa.Column('transaction_mode', sa.String(length=50), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('classification_status', sa.String(length=50), nullable=False, server_default='UNCLASSIFIED'),
        sa.Column('source', sa.String(length=50), nullable=False, server_default='SETU'),
        sa.Column('balance_after_transaction', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('reference_number', sa.String(length=255), nullable=True),
        sa.Column('dedupe_hash', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['connected_account_id'], ['connected_accounts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('connected_account_id', 'dedupe_hash', name='uq_account_dedupe_hash')
    )
    op.create_index(op.f('ix_bank_transactions_user_id'), 'bank_transactions', ['user_id'], unique=False)
    op.create_index(op.f('ix_bank_transactions_connected_account_id'), 'bank_transactions', ['connected_account_id'], unique=False)
    op.create_index(op.f('ix_bank_transactions_provider_transaction_id'), 'bank_transactions', ['provider_transaction_id'], unique=False)
    op.create_index(op.f('ix_bank_transactions_dedupe_hash'), 'bank_transactions', ['dedupe_hash'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_bank_transactions_dedupe_hash'), table_name='bank_transactions')
    op.drop_index(op.f('ix_bank_transactions_provider_transaction_id'), table_name='bank_transactions')
    op.drop_index(op.f('ix_bank_transactions_connected_account_id'), table_name='bank_transactions')
    op.drop_index(op.f('ix_bank_transactions_user_id'), table_name='bank_transactions')
    op.drop_table('bank_transactions')

    op.drop_column('connected_accounts', 'last_synced_at')
    op.drop_column('connected_accounts', 'balance_timestamp')
    op.drop_column('connected_accounts', 'balance_status')

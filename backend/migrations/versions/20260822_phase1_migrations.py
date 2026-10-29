# -*- coding: utf-8 -*-
"""
Phase 1 Migrations for Vestor: Financial Foundation + Accounts

This migration:
1. Adds `error_message` and `sync_attempt_count` to `connected_accounts`.
2. Adds `user_classification` and `transfer_reference_id` to `bank_transactions`.
3. Removes `balance_after_transaction` from `bank_transactions`.
4. Makes `purpose` a required field in `connected_accounts`.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import text


def upgrade():
    # Add new fields to connected_accounts
    op.add_column(
        'connected_accounts',
        sa.Column('error_message', sa.String(length=500), nullable=True)
    )
    op.add_column(
        'connected_accounts',
        sa.Column('sync_attempt_count', sa.Integer(), nullable=False, server_default='0')
    )

    # Make purpose a required field
    op.alter_column('connected_accounts', 'purpose', nullable=False)

    # Add new fields to bank_transactions
    op.add_column(
        'bank_transactions',
        sa.Column('user_classification', sa.String(length=100), nullable=True, server_default=None)
    )
    op.add_column(
        'bank_transactions',
        sa.Column('transfer_reference_id', sa.String(length=255), nullable=True, server_default=None)
    )

    # Remove redundant field from bank_transactions
    op.drop_column('bank_transactions', 'balance_after_transaction')


def downgrade():
    # Revert changes to connected_accounts
    op.drop_column('connected_accounts', 'error_message')
    op.drop_column('connected_accounts', 'sync_attempt_count')
    op.alter_column('connected_accounts', 'purpose', nullable=True)

    # Revert changes to bank_transactions
    op.drop_column('bank_transactions', 'user_classification')
    op.drop_column('bank_transactions', 'transfer_reference_id')

    # Re-add redundant field
    op.add_column(
        'bank_transactions',
        sa.Column('balance_after_transaction', sa.Numeric(precision=14, scale=2), nullable=True)
    )
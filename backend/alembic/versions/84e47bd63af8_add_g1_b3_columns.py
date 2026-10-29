"""add_g1_b3_columns

Revision ID: 84e47bd63af8
Revises: 6818323e5d46
Create Date: 2026-08-22 10:45:49.606919
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '84e47bd63af8'
down_revision: Union[str, None] = '6818323e5d46'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add columns to goals
    op.add_column('goals', sa.Column('linked_account_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_goals_linked_account_id',
        'goals', 'connected_accounts',
        ['linked_account_id'], ['id'],
        ondelete='SET NULL'
    )

    # 2. Add columns to goal_contributions
    op.add_column('goal_contributions', sa.Column('linked_account_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_goal_contributions_linked_account_id',
        'goal_contributions', 'connected_accounts',
        ['linked_account_id'], ['id'],
        ondelete='SET NULL'
    )

    # 3. Add columns to bank_transactions
    op.add_column('bank_transactions', sa.Column('classification', sa.String(length=100), nullable=True))
    op.add_column('bank_transactions', sa.Column('confidence', sa.Numeric(precision=4, scale=2), nullable=True))
    op.add_column('bank_transactions', sa.Column('classification_source', sa.String(length=50), nullable=True))
    op.add_column('bank_transactions', sa.Column('merchant_name', sa.String(length=255), nullable=True))


def downgrade() -> None:
    # 1. Drop constraints & columns from goals
    op.drop_constraint('fk_goals_linked_account_id', 'goals', type_='foreignkey')
    op.drop_column('goals', 'linked_account_id')

    # 2. Drop constraints & columns from goal_contributions
    op.drop_constraint('fk_goal_contributions_linked_account_id', 'goal_contributions', type_='foreignkey')
    op.drop_column('goal_contributions', 'linked_account_id')

    # 3. Drop columns from bank_transactions
    op.drop_column('bank_transactions', 'classification')
    op.drop_column('bank_transactions', 'confidence')
    op.drop_column('bank_transactions', 'classification_source')
    op.drop_column('bank_transactions', 'merchant_name')


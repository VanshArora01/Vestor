"""add_b4_columns

Revision ID: e3efbd582630
Revises: 84e47bd63af8
Create Date: 2026-08-22 11:06:53.230356
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

"""add_b4_columns

Revision ID: e3efbd582630
Revises: 84e47bd63af8
Create Date: 2026-08-22 11:06:53.230356
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'e3efbd582630'
down_revision: Union[str, None] = '84e47bd63af8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('bank_transactions', sa.Column('account_purpose', sa.String(length=100), nullable=True))
    op.add_column('goal_contributions', sa.Column('bank_transaction_id', sa.UUID(), nullable=True))
    op.create_foreign_key(None, 'goal_contributions', 'bank_transactions', ['bank_transaction_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint(None, 'goal_contributions', type_='foreignkey')
    op.drop_column('goal_contributions', 'bank_transaction_id')
    op.drop_column('bank_transactions', 'account_purpose')

"""add balance column

Revision ID: 5818323e5d45
Revises: 2918323e5d44
Create Date: 2026-08-21 19:26:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '5818323e5d45'
down_revision: Union[str, None] = '2918323e5d44'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('connected_accounts', sa.Column('balance', sa.Numeric(precision=14, scale=2), nullable=True))


def downgrade() -> None:
    op.drop_column('connected_accounts', 'balance')

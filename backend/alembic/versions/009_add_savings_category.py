"""Add Savings default allocation category

Revision ID: 009_add_savings_category
Revises: 008_create_portfolio_snapshots
Create Date: 2026-08-21
"""

from typing import Sequence, Union
from uuid import uuid4
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "009_add_savings_category"
down_revision: Union[str, None] = "008_create_portfolio_snapshots"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    allocation_table = sa.table(
        "allocation_categories",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String()),
        sa.column("slug", sa.String()),
        sa.column("is_system", sa.Boolean()),
        sa.column("is_others", sa.Boolean()),
        sa.column("is_active", sa.Boolean()),
        sa.column("semantic_type", sa.String()),
        sa.column("user_id", postgresql.UUID(as_uuid=True)),
    )
    op.bulk_insert(
        allocation_table,
        [
            {
                "id": uuid4(),
                "name": "Savings",
                "slug": "savings",
                "is_system": True,
                "is_others": False,
                "is_active": True,
                "semantic_type": "savings",
                "user_id": None,
            }
        ],
    )

def downgrade() -> None:
    op.execute(
        "DELETE FROM allocation_categories WHERE slug = 'savings' AND user_id IS NULL"
    )

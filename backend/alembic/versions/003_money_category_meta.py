"""Add is_active and semantic_type to Money categories

Revision ID: 003_money_category_meta
Revises: 002_create_money_tables
Create Date: 2026-08-09
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_money_category_meta"
down_revision: Union[str, None] = "002_create_money_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ALLOCATION_SEMANTIC_BY_SLUG = {
    "emergency-fund": "savings",
    "mutual-funds": "investment",
    "stocks": "investment",
    "goals": "goal",
    "personal-expenses": "expense",
    "others": "other",
}


def upgrade() -> None:
    op.add_column(
        "allocation_categories",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column(
        "allocation_categories",
        sa.Column("semantic_type", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "spending_categories",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )

    conn = op.get_bind()
    for slug, semantic_type in ALLOCATION_SEMANTIC_BY_SLUG.items():
        conn.execute(
            sa.text(
                "UPDATE allocation_categories SET semantic_type = :semantic_type "
                "WHERE slug = :slug AND user_id IS NULL"
            ),
            {"semantic_type": semantic_type, "slug": slug},
        )
    conn.execute(
        sa.text(
            "UPDATE allocation_categories SET semantic_type = 'other' "
            "WHERE semantic_type IS NULL"
        )
    )

    op.alter_column("allocation_categories", "semantic_type", nullable=False)


def downgrade() -> None:
    op.drop_column("spending_categories", "is_active")
    op.drop_column("allocation_categories", "semantic_type")
    op.drop_column("allocation_categories", "is_active")

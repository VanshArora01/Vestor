"""Create price_cache for Invest I4 market-data foundation.

Revision ID: 007_create_price_cache
Revises: 006_invest_asset_universe
Create Date: 2026-08-09
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "007_create_price_cache"
down_revision: Union[str, None] = "006_invest_asset_universe"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "price_cache",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("provider_symbol", sa.String(length=128), nullable=False),
        sa.Column("price", sa.Numeric(precision=18, scale=6), nullable=True),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="INR"),
        sa.Column("price_timestamp", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_price_cache_asset_id", "price_cache", ["asset_id"], unique=True)
    op.create_index(
        "ix_price_cache_asset_provider",
        "price_cache",
        ["asset_id", "provider"],
        unique=False,
    )
    op.create_index(
        "ix_price_cache_provider_symbol",
        "price_cache",
        ["provider", "provider_symbol"],
        unique=False,
    )
    op.create_index("ix_price_cache_fetched_at", "price_cache", ["fetched_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_price_cache_fetched_at", table_name="price_cache")
    op.drop_index("ix_price_cache_provider_symbol", table_name="price_cache")
    op.drop_index("ix_price_cache_asset_provider", table_name="price_cache")
    op.drop_index("ix_price_cache_asset_id", table_name="price_cache")
    op.drop_table("price_cache")

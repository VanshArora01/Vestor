"""Create portfolio_snapshots for Invest I6 daily performance history.

Revision ID: 008_create_portfolio_snapshots
Revises: 007_create_price_cache
Create Date: 2026-08-09
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "008_create_portfolio_snapshots"
down_revision: Union[str, None] = "007_create_price_cache"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "portfolio_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("total_invested", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("total_value", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("absolute_gain_loss", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("return_pct", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("valuation_status", sa.String(length=32), nullable=False),
        sa.Column("total_holdings", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("valued_holdings", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("unvalued_holdings", sa.Integer(), nullable=False, server_default="0"),
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
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "snapshot_date", name="uq_portfolio_snapshots_user_date"),
    )
    op.create_index("ix_portfolio_snapshots_user_id", "portfolio_snapshots", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_portfolio_snapshots_user_id", table_name="portfolio_snapshots")
    op.drop_table("portfolio_snapshots")

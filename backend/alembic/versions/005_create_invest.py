"""Create Invest tables: assets, portfolio_holdings, investment_transactions

Revision ID: 005_create_invest
Revises: 004_create_goals
Create Date: 2026-08-09
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "005_create_invest"
down_revision: Union[str, None] = "004_create_goals"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asset_type", sa.String(length=32), nullable=False),
        sa.Column("symbol", sa.String(length=64), nullable=True),
        sa.Column("exchange", sa.String(length=16), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("provider_symbol", sa.String(length=128), nullable=True),
        sa.Column("isin", sa.String(length=16), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_assets_asset_type_active", "assets", ["asset_type", "active"])
    op.create_index("ix_assets_symbol", "assets", ["symbol"])

    op.create_table(
        "portfolio_holdings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("asset_type", sa.String(length=32), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("symbol", sa.String(length=64), nullable=True),
        sa.Column("quantity", sa.Numeric(18, 6), nullable=False, server_default="0"),
        sa.Column("total_invested", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("average_cost", sa.Numeric(18, 6), nullable=False, server_default="0"),
        sa.Column("valuation_mode", sa.String(length=32), nullable=False),
        sa.Column("manual_current_value", sa.Numeric(14, 2), nullable=True),
        sa.Column("manual_value_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fd_principal", sa.Numeric(14, 2), nullable=True),
        sa.Column("fd_interest_rate", sa.Numeric(8, 4), nullable=True),
        sa.Column("fd_start_date", sa.Date(), nullable=True),
        sa.Column("fd_maturity_date", sa.Date(), nullable=True),
        sa.Column("fd_compounding", sa.String(length=32), nullable=True),
        sa.Column("gold_unit", sa.String(length=16), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="open"),
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
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_portfolio_holdings_user_id", "portfolio_holdings", ["user_id"])
    op.create_index("ix_portfolio_holdings_asset_id", "portfolio_holdings", ["asset_id"])
    op.create_index(
        "ix_portfolio_holdings_user_asset_id",
        "portfolio_holdings",
        ["user_id", "asset_id"],
    )
    op.create_index(
        "ix_portfolio_holdings_user_type_status",
        "portfolio_holdings",
        ["user_id", "asset_type", "status"],
    )
    op.create_index(
        "uq_portfolio_holdings_user_asset",
        "portfolio_holdings",
        ["user_id", "asset_id"],
        unique=True,
        postgresql_where=sa.text("asset_id IS NOT NULL"),
    )

    op.create_table(
        "investment_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("holding_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("transaction_type", sa.String(length=16), nullable=False, server_default="buy"),
        sa.Column("quantity", sa.Numeric(18, 6), nullable=True),
        sa.Column("unit_price", sa.Numeric(18, 6), nullable=True),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("traded_on", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["holding_id"], ["portfolio_holdings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_investment_transactions_user_id", "investment_transactions", ["user_id"])
    op.create_index(
        "ix_investment_transactions_user_traded_on",
        "investment_transactions",
        ["user_id", "traded_on"],
    )
    op.create_index(
        "ix_investment_transactions_holding_traded_on",
        "investment_transactions",
        ["holding_id", "traded_on"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_investment_transactions_holding_traded_on",
        table_name="investment_transactions",
    )
    op.drop_index(
        "ix_investment_transactions_user_traded_on",
        table_name="investment_transactions",
    )
    op.drop_index("ix_investment_transactions_user_id", table_name="investment_transactions")
    op.drop_table("investment_transactions")

    op.drop_index("uq_portfolio_holdings_user_asset", table_name="portfolio_holdings")
    op.drop_index("ix_portfolio_holdings_user_type_status", table_name="portfolio_holdings")
    op.drop_index("ix_portfolio_holdings_user_asset_id", table_name="portfolio_holdings")
    op.drop_index("ix_portfolio_holdings_asset_id", table_name="portfolio_holdings")
    op.drop_index("ix_portfolio_holdings_user_id", table_name="portfolio_holdings")
    op.drop_table("portfolio_holdings")

    op.drop_index("ix_assets_symbol", table_name="assets")
    op.drop_index("ix_assets_asset_type_active", table_name="assets")
    op.drop_table("assets")

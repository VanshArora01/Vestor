"""Add isolated paper-trading accounts and instrument indices.

Revision ID: 012_paper_trading
Revises: 011_create_academy_tables
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "012_paper_trading"
down_revision: Union[str, None] = "011_create_academy_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("price_cache", sa.Column("previous_close", sa.Numeric(18, 6), nullable=True))

    op.bulk_insert(
        sa.table(
            "assets",
            sa.column("id", postgresql.UUID(as_uuid=True)),
            sa.column("asset_type", sa.String),
            sa.column("symbol", sa.String),
            sa.column("exchange", sa.String),
            sa.column("name", sa.String),
            sa.column("provider_symbol", sa.String),
            sa.column("isin", sa.String),
            sa.column("active", sa.Boolean),
            sa.column("metadata", postgresql.JSONB),
        ),
        [
            {
                "id": "a1000000-0001-4000-8000-000000000101",
                "asset_type": "index",
                "symbol": "NIFTY 50",
                "exchange": "NSE",
                "name": "NIFTY 50",
                "provider_symbol": "^NSEI",
                "isin": None,
                "active": True,
                "metadata": {"instrument_category": "index", "source": "NSE index listing"},
            },
            {
                "id": "a1000000-0001-4000-8000-000000000102",
                "asset_type": "index",
                "symbol": "SENSEX",
                "exchange": "BSE",
                "name": "BSE SENSEX",
                "provider_symbol": "^BSESN",
                "isin": None,
                "active": True,
                "metadata": {"instrument_category": "index", "source": "BSE index listing"},
            },
        ],
    )

    op.create_table(
        "paper_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("starting_capital", sa.Numeric(14, 2), nullable=False),
        sa.Column("available_cash", sa.Numeric(14, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_paper_accounts_user"),
    )

    op.create_table(
        "paper_positions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quantity", sa.Numeric(18, 6), server_default="0", nullable=False),
        sa.Column("cost_basis", sa.Numeric(18, 2), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["paper_accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id", "asset_id", name="uq_paper_positions_account_asset"),
    )
    op.create_index("ix_paper_positions_account_quantity", "paper_positions", ["account_id", "quantity"])

    op.create_table(
        "paper_orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("symbol", sa.String(64), nullable=False),
        sa.Column("instrument_name", sa.String(255), nullable=False),
        sa.Column("exchange", sa.String(16), nullable=False),
        sa.Column("side", sa.String(8), nullable=False),
        sa.Column("quantity", sa.Numeric(18, 6), nullable=False),
        sa.Column("execution_price", sa.Numeric(18, 6), nullable=False),
        sa.Column("gross_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("charges", sa.Numeric(18, 2), server_default="0", nullable=False),
        sa.Column("realised_pnl", sa.Numeric(18, 2), server_default="0", nullable=False),
        sa.Column("status", sa.String(16), server_default="filled", nullable=False),
        sa.Column("idempotency_key", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["paper_accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id", "idempotency_key", name="uq_paper_orders_idempotency"),
    )
    op.create_index("ix_paper_orders_account_created", "paper_orders", ["account_id", "created_at"])

    op.create_table(
        "paper_cash_ledger",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("entry_type", sa.String(24), nullable=False),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("balance_after", sa.Numeric(18, 2), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["paper_accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["order_id"], ["paper_orders.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_paper_cash_ledger_account_created", "paper_cash_ledger", ["account_id", "created_at"])

    op.create_table(
        "paper_watchlist",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["paper_accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id", "asset_id", name="uq_paper_watchlist_account_asset"),
    )
    op.create_index("ix_paper_watchlist_account_created", "paper_watchlist", ["account_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_paper_watchlist_account_created", table_name="paper_watchlist")
    op.drop_table("paper_watchlist")
    op.drop_index("ix_paper_cash_ledger_account_created", table_name="paper_cash_ledger")
    op.drop_table("paper_cash_ledger")
    op.drop_index("ix_paper_orders_account_created", table_name="paper_orders")
    op.drop_table("paper_orders")
    op.drop_index("ix_paper_positions_account_quantity", table_name="paper_positions")
    op.drop_table("paper_positions")
    op.drop_table("paper_accounts")
    op.execute(sa.text("DELETE FROM assets WHERE id IN (:nifty, :sensex)").bindparams(
        nifty="a1000000-0001-4000-8000-000000000101",
        sensex="a1000000-0001-4000-8000-000000000102",
    ))
    op.drop_column("price_cache", "previous_close")

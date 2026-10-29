from __future__ import annotations

from decimal import Decimal
from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class PaperAccount(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "paper_accounts"
    __table_args__ = (UniqueConstraint("user_id", name="uq_paper_accounts_user"),)

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    starting_capital: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    available_cash: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)


class PaperPosition(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "paper_positions"
    __table_args__ = (
        UniqueConstraint("account_id", "asset_id", name="uq_paper_positions_account_asset"),
        Index("ix_paper_positions_account_quantity", "account_id", "quantity"),
    )

    account_id: Mapped[UUID] = mapped_column(
        ForeignKey("paper_accounts.id", ondelete="CASCADE"), nullable=False
    )
    asset_id: Mapped[UUID] = mapped_column(
        ForeignKey("assets.id", ondelete="RESTRICT"), nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False, default=Decimal("0"))
    cost_basis: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=Decimal("0"))


class PaperOrder(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "paper_orders"
    __table_args__ = (
        UniqueConstraint("account_id", "idempotency_key", name="uq_paper_orders_idempotency"),
        Index("ix_paper_orders_account_created", "account_id", "created_at"),
    )

    account_id: Mapped[UUID] = mapped_column(
        ForeignKey("paper_accounts.id", ondelete="CASCADE"), nullable=False
    )
    asset_id: Mapped[UUID] = mapped_column(
        ForeignKey("assets.id", ondelete="RESTRICT"), nullable=False
    )
    symbol: Mapped[str] = mapped_column(String(64), nullable=False)
    instrument_name: Mapped[str] = mapped_column(String(255), nullable=False)
    exchange: Mapped[str] = mapped_column(String(16), nullable=False)
    side: Mapped[str] = mapped_column(String(8), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    execution_price: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    charges: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=Decimal("0"))
    realised_pnl: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=Decimal("0"))
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="filled")
    idempotency_key: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class PaperCashLedgerEntry(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "paper_cash_ledger"
    __table_args__ = (Index("ix_paper_cash_ledger_account_created", "account_id", "created_at"),)

    account_id: Mapped[UUID] = mapped_column(
        ForeignKey("paper_accounts.id", ondelete="CASCADE"), nullable=False
    )
    order_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("paper_orders.id", ondelete="SET NULL"), nullable=True
    )
    entry_type: Mapped[str] = mapped_column(String(24), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    balance_after: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class PaperWatchlistItem(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "paper_watchlist"
    __table_args__ = (
        UniqueConstraint("account_id", "asset_id", name="uq_paper_watchlist_account_asset"),
        Index("ix_paper_watchlist_account_created", "account_id", "created_at"),
    )

    account_id: Mapped[UUID] = mapped_column(
        ForeignKey("paper_accounts.id", ondelete="CASCADE"), nullable=False
    )
    asset_id: Mapped[UUID] = mapped_column(
        ForeignKey("assets.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

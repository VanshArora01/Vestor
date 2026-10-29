from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Asset(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "assets"
    __table_args__ = (
        Index("ix_assets_asset_type_active", "asset_type", "active"),
        Index("ix_assets_symbol", "symbol"),
    )

    asset_type: Mapped[str] = mapped_column(String(32), nullable=False)
    symbol: Mapped[str | None] = mapped_column(String(64), nullable=True)
    exchange: Mapped[str | None] = mapped_column(String(16), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    provider_symbol: Mapped[str | None] = mapped_column(String(128), nullable=True)
    isin: Mapped[str | None] = mapped_column(String(16), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )

    holdings: Mapped[list[PortfolioHolding]] = relationship(back_populates="asset")


class PortfolioHolding(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "portfolio_holdings"
    __table_args__ = (
        Index("ix_portfolio_holdings_user_id", "user_id"),
        Index("ix_portfolio_holdings_user_asset_id", "user_id", "asset_id"),
        Index("ix_portfolio_holdings_user_type_status", "user_id", "asset_type", "status"),
        Index(
            "uq_portfolio_holdings_user_asset",
            "user_id",
            "asset_id",
            unique=True,
            postgresql_where=text("asset_id IS NOT NULL"),
        ),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    asset_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("assets.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    asset_type: Mapped[str] = mapped_column(String(32), nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    symbol: Mapped[str | None] = mapped_column(String(64), nullable=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False, default=Decimal("0"))
    total_invested: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), nullable=False, default=Decimal("0")
    )
    average_cost: Mapped[Decimal] = mapped_column(
        Numeric(18, 6), nullable=False, default=Decimal("0")
    )
    valuation_mode: Mapped[str] = mapped_column(String(32), nullable=False)
    manual_current_value: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    manual_value_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    fd_principal: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    fd_interest_rate: Mapped[Decimal | None] = mapped_column(Numeric(8, 4), nullable=True)
    fd_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    fd_maturity_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    fd_compounding: Mapped[str | None] = mapped_column(String(32), nullable=True)
    gold_unit: Mapped[str | None] = mapped_column(String(16), nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="open")

    asset: Mapped[Asset | None] = relationship(back_populates="holdings")
    transactions: Mapped[list[InvestmentTransaction]] = relationship(
        back_populates="holding",
        cascade="all, delete-orphan",
        order_by="InvestmentTransaction.traded_on.desc()",
    )


class InvestmentTransaction(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "investment_transactions"
    __table_args__ = (
        Index(
            "ix_investment_transactions_user_traded_on",
            "user_id",
            "traded_on",
        ),
        Index(
            "ix_investment_transactions_holding_traded_on",
            "holding_id",
            "traded_on",
        ),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    holding_id: Mapped[UUID] = mapped_column(
        ForeignKey("portfolio_holdings.id", ondelete="CASCADE"),
        nullable=False,
    )
    asset_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("assets.id", ondelete="RESTRICT"),
        nullable=True,
    )
    transaction_type: Mapped[str] = mapped_column(String(16), nullable=False, default="buy")
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(18, 6), nullable=True)
    unit_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 6), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    traded_on: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    holding: Mapped[PortfolioHolding] = relationship(back_populates="transactions")


class PriceCache(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Latest known market price / NAV per asset (shared across users)."""

    __tablename__ = "price_cache"
    __table_args__ = (
        Index("ix_price_cache_asset_id", "asset_id", unique=True),
        Index("ix_price_cache_asset_provider", "asset_id", "provider"),
        Index("ix_price_cache_provider_symbol", "provider", "provider_symbol"),
        Index("ix_price_cache_fetched_at", "fetched_at"),
    )

    asset_id: Mapped[UUID] = mapped_column(
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
    )
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    provider_symbol: Mapped[str] = mapped_column(String(128), nullable=False)
    price: Mapped[Decimal | None] = mapped_column(Numeric(18, 6), nullable=True)
    previous_close: Mapped[Decimal | None] = mapped_column(Numeric(18, 6), nullable=True)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="INR")
    price_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    asset: Mapped[Asset] = relationship()


class PortfolioSnapshot(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Daily portfolio valuation observation (not a transaction)."""

    __tablename__ = "portfolio_snapshots"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "snapshot_date",
            name="uq_portfolio_snapshots_user_date",
        ),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_invested: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    total_value: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    absolute_gain_loss: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    return_pct: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    valuation_status: Mapped[str] = mapped_column(String(32), nullable=False)
    total_holdings: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    valued_holdings: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unvalued_holdings: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

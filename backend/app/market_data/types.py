"""Normalized market-data result types."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID

from app.services.money_calculations import money_to_str


class PriceStatus(StrEnum):
    FRESH = "fresh"
    STALE = "stale"
    UNAVAILABLE = "unavailable"
    ERROR = "error"


class MarketDataProviderName(StrEnum):
    YFINANCE = "yfinance"
    MFAPI = "mfapi"


@dataclass(frozen=True)
class ProviderPriceResult:
    """Normalized result from a market-data provider adapter (never fabricated)."""

    provider: str
    provider_symbol: str
    price: Decimal | None
    currency: str
    price_timestamp: datetime | None
    fetched_at: datetime
    status: PriceStatus
    error_message: str | None = None
    previous_close: Decimal | None = None

    @property
    def ok(self) -> bool:
        return self.price is not None and self.status in {PriceStatus.FRESH, PriceStatus.STALE}


@dataclass(frozen=True)
class LatestPrice:
    """Application-facing latest-available price (Redis / Postgres / provider)."""

    asset_id: UUID
    provider: str | None
    provider_symbol: str | None
    price: Decimal | None
    currency: str | None
    price_timestamp: datetime | None
    fetched_at: datetime | None
    status: PriceStatus
    error_message: str | None = None
    source: str | None = None  # redis | postgres | provider | none
    previous_close: Decimal | None = None

    def to_public_dict(self) -> dict[str, Any]:
        return {
            "asset_id": str(self.asset_id),
            "provider": self.provider,
            "provider_symbol": self.provider_symbol,
            "price": money_to_str(self.price) if self.price is not None else None,
            "currency": self.currency,
            "price_timestamp": self.price_timestamp.isoformat() if self.price_timestamp else None,
            "fetched_at": self.fetched_at.isoformat() if self.fetched_at else None,
            "status": str(self.status),
            "error_message": self.error_message,
            "source": self.source,
            "previous_close": money_to_str(self.previous_close),
        }

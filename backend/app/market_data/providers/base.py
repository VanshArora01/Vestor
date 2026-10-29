"""Market-data provider abstraction — Vestor never calls yfinance/MFAPI outside adapters."""

from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID

from app.market_data.types import ProviderPriceResult


class MarketDataProvider(ABC):
    """Fetch a normalized latest price for a provider_symbol."""

    name: str

    @abstractmethod
    def fetch_latest_price(
        self,
        *,
        asset_id: UUID,
        provider_symbol: str,
    ) -> ProviderPriceResult:
        """Return a normalized result. Never invent a price on failure."""

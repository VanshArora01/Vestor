"""Resolve MarketDataProvider by asset type."""

from __future__ import annotations

from app.market_data.providers.base import MarketDataProvider
from app.market_data.providers.mutual_fund import MutualFundMarketDataProvider
from app.market_data.providers.stock import StockMarketDataProvider

# ETFs reuse the stock/yfinance adapter (same NSE/BSE ticker style provider_symbol).
_STOCK = StockMarketDataProvider()
_MF = MutualFundMarketDataProvider()

_BY_ASSET_TYPE: dict[str, MarketDataProvider] = {
    "stock": _STOCK,
    "etf": _STOCK,
    "index": _STOCK,
    "mutual_fund": _MF,
}


def get_provider_for_asset_type(asset_type: str) -> MarketDataProvider | None:
    return _BY_ASSET_TYPE.get(asset_type)


def supported_market_asset_types() -> frozenset[str]:
    return frozenset(_BY_ASSET_TYPE.keys())

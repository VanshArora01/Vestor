"""Stock / ETF market-data adapter using yfinance (isolated behind MarketDataProvider)."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from uuid import UUID

from app.core.config import get_settings
from app.market_data.providers.base import MarketDataProvider
from app.market_data.types import MarketDataProviderName, PriceStatus, ProviderPriceResult

logger = logging.getLogger(__name__)


class StockMarketDataProvider(MarketDataProvider):
    name = MarketDataProviderName.YFINANCE

    def fetch_latest_price(
        self,
        *,
        asset_id: UUID,
        provider_symbol: str,
    ) -> ProviderPriceResult:
        fetched_at = datetime.now(timezone.utc)
        symbol = (provider_symbol or "").strip()
        if not symbol:
            return ProviderPriceResult(
                provider=self.name,
                provider_symbol=symbol,
                price=None,
                currency="INR",
                price_timestamp=None,
                fetched_at=fetched_at,
                status=PriceStatus.ERROR,
                error_message="Missing provider_symbol",
            )

        timeout = get_settings().market_data_provider_timeout_seconds
        try:
            import yfinance as yf

            ticker = yf.Ticker(symbol)
            # Prefer fast_info last price; fall back to recent history close.
            # yfinance does not expose a first-class timeout on Ticker; settings
            # timeout is reserved for future HTTP-backed stock providers.
            _ = timeout
            price_raw = None
            price_ts: datetime | None = None
            previous_close: Decimal | None = None
            try:
                fast = getattr(ticker, "fast_info", None)
                if fast is not None:
                    price_raw = getattr(fast, "last_price", None)
                    if price_raw is None and isinstance(fast, dict):
                        price_raw = fast.get("last_price") or fast.get("lastPrice")
                    previous_raw = getattr(fast, "previous_close", None)
                    if previous_raw is None and isinstance(fast, dict):
                        previous_raw = fast.get("previous_close") or fast.get("previousClose")
                    if previous_raw is not None:
                        try:
                            parsed_previous = Decimal(str(previous_raw))
                            if parsed_previous > 0:
                                previous_close = parsed_previous
                        except (InvalidOperation, TypeError, ValueError):
                            # Ignore non-numeric provider metadata without losing last_price.
                            previous_close = None
            except Exception:
                price_raw = None

            try:
                history = ticker.history(period="5d", interval="1d", auto_adjust=False)
            except Exception:
                if price_raw is None:
                    raise
                history = None
            if history is not None and not history.empty and "Close" in history.columns:
                close = history["Close"].dropna()
                if len(close) >= 2 and previous_close is None:
                    previous_close = Decimal(str(close.iloc[-2]))
                if not close.empty:
                    if price_raw is None:
                        price_raw = close.iloc[-1]
                    idx = close.index[-1]
                    if hasattr(idx, "to_pydatetime"):
                        price_ts = idx.to_pydatetime()
                        if price_ts.tzinfo is None:
                            price_ts = price_ts.replace(tzinfo=timezone.utc)

            if price_raw is None:
                logger.info(
                    "yfinance empty result asset_id=%s provider_symbol=%s",
                    asset_id,
                    symbol,
                )
                return ProviderPriceResult(
                    provider=self.name,
                    provider_symbol=symbol,
                    price=None,
                    currency="INR",
                    price_timestamp=None,
                    fetched_at=fetched_at,
                    status=PriceStatus.UNAVAILABLE,
                    error_message="No price returned by provider",
                )

            price = Decimal(str(price_raw))
            if price <= 0:
                return ProviderPriceResult(
                    provider=self.name,
                    provider_symbol=symbol,
                    price=None,
                    currency="INR",
                    price_timestamp=None,
                    fetched_at=fetched_at,
                    status=PriceStatus.UNAVAILABLE,
                    error_message="Non-positive price from provider",
                )

            return ProviderPriceResult(
                provider=self.name,
                provider_symbol=symbol,
                price=price,
                currency="INR",
                price_timestamp=price_ts or fetched_at,
                fetched_at=fetched_at,
                status=PriceStatus.FRESH,
                error_message=None,
                previous_close=previous_close,
            )
        except InvalidOperation:
            return ProviderPriceResult(
                provider=self.name,
                provider_symbol=symbol,
                price=None,
                currency="INR",
                price_timestamp=None,
                fetched_at=fetched_at,
                status=PriceStatus.ERROR,
                error_message="Invalid numeric price from provider",
            )
        except Exception as exc:
            logger.warning(
                "yfinance failure asset_id=%s provider_symbol=%s err=%s",
                asset_id,
                symbol,
                type(exc).__name__,
            )
            return ProviderPriceResult(
                provider=self.name,
                provider_symbol=symbol,
                price=None,
                currency="INR",
                price_timestamp=None,
                fetched_at=fetched_at,
                status=PriceStatus.ERROR,
                error_message=f"Provider error: {type(exc).__name__}",
            )

    def fetch_historical_candles(
        self,
        *,
        provider_symbol: str,
        period: str,
        interval: str,
    ) -> list[dict[str, object]]:
        """Fetch provider OHLCV history for one selected instrument only."""
        symbol = (provider_symbol or "").strip()
        if not symbol:
            raise ValueError("This instrument has no configured market-data symbol")
        import yfinance as yf

        history = yf.Ticker(symbol).history(
            period=period,
            interval=interval,
            auto_adjust=False,
            actions=False,
        )
        if history is None or history.empty:
            return []

        rows: list[dict[str, object]] = []
        for stamp, row in history.iterrows():
            time_value = stamp.to_pydatetime() if hasattr(stamp, "to_pydatetime") else stamp
            if isinstance(time_value, datetime):
                if time_value.tzinfo is not None:
                    time_value = time_value.astimezone(timezone.utc)
                time_text = time_value.isoformat()
            else:
                time_text = str(time_value)
            try:
                values = [Decimal(str(row[key])) for key in ("Open", "High", "Low", "Close")]
                if any(value <= 0 for value in values):
                    continue
                volume_raw = row.get("Volume", 0)
                rows.append({
                    "time": time_text,
                    "open": str(values[0]),
                    "high": str(values[1]),
                    "low": str(values[2]),
                    "close": str(values[3]),
                    "volume": int(volume_raw) if volume_raw is not None else 0,
                })
            except (InvalidOperation, TypeError, ValueError, KeyError):
                continue
        return rows

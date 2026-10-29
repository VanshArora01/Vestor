"""Indian mutual-fund NAV adapter using MFAPI.in (isolated behind MarketDataProvider)."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from uuid import UUID

import httpx

from app.core.config import get_settings
from app.market_data.providers.base import MarketDataProvider
from app.market_data.types import MarketDataProviderName, PriceStatus, ProviderPriceResult

logger = logging.getLogger(__name__)

MFAPI_BASE_URL = "https://api.mfapi.in/mf"


class MutualFundMarketDataProvider(MarketDataProvider):
    name = MarketDataProviderName.MFAPI

    def fetch_latest_price(
        self,
        *,
        asset_id: UUID,
        provider_symbol: str,
    ) -> ProviderPriceResult:
        fetched_at = datetime.now(timezone.utc)
        scheme_code = (provider_symbol or "").strip()
        if not scheme_code:
            return ProviderPriceResult(
                provider=self.name,
                provider_symbol=scheme_code,
                price=None,
                currency="INR",
                price_timestamp=None,
                fetched_at=fetched_at,
                status=PriceStatus.ERROR,
                error_message="Missing MFAPI scheme code (provider_symbol)",
            )
        if not scheme_code.isdigit():
            return ProviderPriceResult(
                provider=self.name,
                provider_symbol=scheme_code,
                price=None,
                currency="INR",
                price_timestamp=None,
                fetched_at=fetched_at,
                status=PriceStatus.ERROR,
                error_message="Invalid MFAPI scheme code",
            )

        timeout = get_settings().market_data_provider_timeout_seconds
        url = f"{MFAPI_BASE_URL}/{scheme_code}"
        try:
            with httpx.Client(timeout=timeout) as client:
                response = client.get(url)
            if response.status_code == 404:
                return ProviderPriceResult(
                    provider=self.name,
                    provider_symbol=scheme_code,
                    price=None,
                    currency="INR",
                    price_timestamp=None,
                    fetched_at=fetched_at,
                    status=PriceStatus.UNAVAILABLE,
                    error_message="Scheme not found",
                )
            response.raise_for_status()
            payload = response.json()
            return self._parse_payload(
                payload,
                scheme_code=scheme_code,
                fetched_at=fetched_at,
                asset_id=asset_id,
            )
        except httpx.TimeoutException:
            logger.warning("MFAPI timeout asset_id=%s scheme=%s", asset_id, scheme_code)
            return ProviderPriceResult(
                provider=self.name,
                provider_symbol=scheme_code,
                price=None,
                currency="INR",
                price_timestamp=None,
                fetched_at=fetched_at,
                status=PriceStatus.ERROR,
                error_message="Provider timeout",
            )
        except Exception as exc:
            logger.warning(
                "MFAPI failure asset_id=%s scheme=%s err=%s",
                asset_id,
                scheme_code,
                type(exc).__name__,
            )
            return ProviderPriceResult(
                provider=self.name,
                provider_symbol=scheme_code,
                price=None,
                currency="INR",
                price_timestamp=None,
                fetched_at=fetched_at,
                status=PriceStatus.ERROR,
                error_message=f"Provider error: {type(exc).__name__}",
            )

    def _parse_payload(
        self,
        payload: object,
        *,
        scheme_code: str,
        fetched_at: datetime,
        asset_id: UUID,
    ) -> ProviderPriceResult:
        if not isinstance(payload, dict):
            return ProviderPriceResult(
                provider=self.name,
                provider_symbol=scheme_code,
                price=None,
                currency="INR",
                price_timestamp=None,
                fetched_at=fetched_at,
                status=PriceStatus.ERROR,
                error_message="Malformed provider response",
            )

        status = str(payload.get("status") or "").lower()
        data = payload.get("data")
        if status and status not in {"success", "ok"} and not data:
            return ProviderPriceResult(
                provider=self.name,
                provider_symbol=scheme_code,
                price=None,
                currency="INR",
                price_timestamp=None,
                fetched_at=fetched_at,
                status=PriceStatus.UNAVAILABLE,
                error_message="Provider returned non-success status",
            )
        if not isinstance(data, list) or not data:
            logger.info("MFAPI empty NAV asset_id=%s scheme=%s", asset_id, scheme_code)
            return ProviderPriceResult(
                provider=self.name,
                provider_symbol=scheme_code,
                price=None,
                currency="INR",
                price_timestamp=None,
                fetched_at=fetched_at,
                status=PriceStatus.UNAVAILABLE,
                error_message="No NAV data returned",
            )

        latest = data[0]
        if not isinstance(latest, dict):
            return ProviderPriceResult(
                provider=self.name,
                provider_symbol=scheme_code,
                price=None,
                currency="INR",
                price_timestamp=None,
                fetched_at=fetched_at,
                status=PriceStatus.ERROR,
                error_message="Malformed NAV row",
            )

        nav_raw = latest.get("nav")
        date_raw = latest.get("date")
        try:
            price = Decimal(str(nav_raw))
        except (InvalidOperation, TypeError, ValueError):
            return ProviderPriceResult(
                provider=self.name,
                provider_symbol=scheme_code,
                price=None,
                currency="INR",
                price_timestamp=None,
                fetched_at=fetched_at,
                status=PriceStatus.ERROR,
                error_message="Invalid NAV value",
            )
        if price <= 0:
            return ProviderPriceResult(
                provider=self.name,
                provider_symbol=scheme_code,
                price=None,
                currency="INR",
                price_timestamp=None,
                fetched_at=fetched_at,
                status=PriceStatus.UNAVAILABLE,
                error_message="Non-positive NAV",
            )

        price_ts = self._parse_nav_date(date_raw) or fetched_at
        return ProviderPriceResult(
            provider=self.name,
            provider_symbol=scheme_code,
            price=price,
            currency="INR",
            price_timestamp=price_ts,
            fetched_at=fetched_at,
            status=PriceStatus.FRESH,
            error_message=None,
        )

    @staticmethod
    def _parse_nav_date(value: object) -> datetime | None:
        if value is None:
            return None
        text = str(value).strip()
        for fmt in ("%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y"):
            try:
                return datetime.strptime(text, fmt).replace(tzinfo=timezone.utc)
            except ValueError:
                continue
        return None

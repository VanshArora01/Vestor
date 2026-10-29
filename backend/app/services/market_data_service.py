"""Latest-available market price orchestration (Redis → Postgres → provider)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.market_data.providers import get_provider_for_asset_type
from app.market_data.redis_price_cache import redis_get_price, redis_set_price
from app.market_data.types import LatestPrice, PriceStatus, ProviderPriceResult
from app.models.invest import Asset, PriceCache
from app.repositories.price_cache_repository import PriceCacheRepository

logger = logging.getLogger(__name__)


class MarketDataService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = PriceCacheRepository(db)
        self.settings = get_settings()

    def get_latest_price(
        self,
        asset_id: UUID,
        *,
        allow_network: bool = True,
        force_refresh: bool = False,
    ) -> LatestPrice:
        """
        Resolve latest available price.

        Request path (Invest reads): allow_network=False — Redis/Postgres only.
        Celery refresh: allow_network=True (and usually force_refresh=True).
        """
        asset = self.db.query(Asset).filter(Asset.id == asset_id).first()
        if asset is None:
            return LatestPrice(
                asset_id=asset_id,
                provider=None,
                provider_symbol=None,
                price=None,
                currency=None,
                price_timestamp=None,
                fetched_at=None,
                status=PriceStatus.UNAVAILABLE,
                error_message="Asset not found",
                source="none",
            )

        if not force_refresh:
            cached = self._read_caches(asset)
            if cached is not None:
                if cached.status == PriceStatus.FRESH or not allow_network:
                    return cached
                # Stale + network allowed → refresh below.

        if not allow_network:
            return self._unavailable(asset, source="none")

        return self._fetch_and_persist(asset)

    def get_latest_prices(
        self,
        asset_ids: list[UUID],
        *,
        allow_network: bool = False,
    ) -> dict[UUID, LatestPrice]:
        unique = list(dict.fromkeys(asset_ids))
        return {
            asset_id: self.get_latest_price(asset_id, allow_network=allow_network)
            for asset_id in unique
        }

    def refresh_asset_price(self, asset_id: UUID) -> LatestPrice:
        return self.get_latest_price(asset_id, allow_network=True, force_refresh=True)

    def refresh_asset_ids(self, asset_ids: list[UUID]) -> dict[str, object]:
        """Refresh unique market assets and preserve prior valid values on failures."""
        unique_ids = list(dict.fromkeys(asset_ids))
        assets = self.repo.list_assets_for_holdings(unique_ids)
        updated = failed = skipped = 0
        failed_assets: list[dict[str, str]] = []
        for asset in assets:
            if not asset.provider_symbol or get_provider_for_asset_type(asset.asset_type) is None:
                skipped += 1
                continue
            try:
                result = self.refresh_asset_price(asset.id)
                if result.price is not None and result.status == PriceStatus.FRESH:
                    updated += 1
                else:
                    failed += 1
                    failed_assets.append({"asset_id": str(asset.id), "name": asset.name})
            except Exception:
                failed += 1
                failed_assets.append({"asset_id": str(asset.id), "name": asset.name})
                logger.warning("Market refresh failed asset_id=%s", asset.id, exc_info=True)
        self.db.commit()
        return {
            "updated": updated,
            "failed": failed,
            "skipped": skipped,
            "total": len(unique_ids),
            "failed_assets": failed_assets,
            "last_updated_at": datetime.now(timezone.utc).isoformat() if updated else None,
        }

    def refresh_all_market_prices(self) -> dict[str, int]:
        assets = self.repo.list_refreshable_assets()
        ok = 0
        failed = 0
        skipped = 0
        for asset in assets:
            if not asset.provider_symbol:
                skipped += 1
                continue
            try:
                result = self.refresh_asset_price(asset.id)
                if result.price is not None and result.status in {
                    PriceStatus.FRESH,
                    PriceStatus.STALE,
                }:
                    ok += 1
                else:
                    failed += 1
            except Exception:
                failed += 1
                logger.warning(
                    "Market refresh failed asset_id=%s type=%s",
                    asset.id,
                    asset.asset_type,
                    exc_info=True,
                )
                continue
        self.db.commit()
        logger.info(
            "Market refresh complete ok=%s failed=%s skipped=%s total=%s",
            ok,
            failed,
            skipped,
            len(assets),
        )
        return {"ok": ok, "failed": failed, "skipped": skipped, "total": len(assets)}

    def _read_caches(self, asset: Asset) -> LatestPrice | None:
        redis_hit = redis_get_price(asset.id)
        if redis_hit is not None and redis_hit.price is not None:
            return self._with_freshness(redis_hit)

        row = self.repo.get_by_asset_id(asset.id)
        if row is None or row.price is None:
            return None
        latest = self._from_row(row, source="postgres")
        redis_set_price(latest)
        return self._with_freshness(latest)

    def _fetch_and_persist(self, asset: Asset) -> LatestPrice:
        provider = get_provider_for_asset_type(asset.asset_type)
        if provider is None:
            return self._unavailable(asset, source="none", message="No market provider for asset type")
        if not asset.provider_symbol:
            return self._unavailable(asset, source="none", message="Missing provider_symbol")

        logger.info(
            "Fetching market price provider=%s asset_id=%s type=%s",
            provider.name,
            asset.id,
            asset.asset_type,
        )
        result = provider.fetch_latest_price(
            asset_id=asset.id,
            provider_symbol=asset.provider_symbol,
        )
        prior = self.repo.get_by_asset_id(asset.id)
        persisted = self._merge_provider_result(asset, result, prior)
        self.db.commit()
        latest = self._from_row(persisted, source="provider")
        if latest.price is not None:
            redis_set_price(latest)
        return self._with_freshness(latest)

    def _merge_provider_result(
        self,
        asset: Asset,
        result: ProviderPriceResult,
        prior: PriceCache | None,
    ) -> PriceCache:
        # Preserve last known valid price when provider fails.
        if result.price is not None and result.status == PriceStatus.FRESH:
            return self.repo.upsert(
                asset_id=asset.id,
                provider=result.provider,
                provider_symbol=result.provider_symbol,
                price=result.price,
                previous_close=result.previous_close,
                currency=result.currency or "INR",
                price_timestamp=result.price_timestamp,
                fetched_at=result.fetched_at,
                status=PriceStatus.FRESH,
                error_message=None,
            )

        if prior is not None and prior.price is not None:
            return self.repo.upsert(
                asset_id=asset.id,
                provider=prior.provider,
                provider_symbol=prior.provider_symbol,
                price=prior.price,
                previous_close=prior.previous_close,
                currency=prior.currency,
                price_timestamp=prior.price_timestamp,
                fetched_at=result.fetched_at,
                status=PriceStatus.STALE,
                error_message=result.error_message or "Provider failed; retaining last known price",
            )

        status = result.status if result.status != PriceStatus.FRESH else PriceStatus.ERROR
        return self.repo.upsert(
            asset_id=asset.id,
            provider=result.provider,
            provider_symbol=result.provider_symbol,
            price=None,
            currency=result.currency or "INR",
            price_timestamp=None,
            fetched_at=result.fetched_at,
            status=status,
            error_message=result.error_message,
        )

    def _with_freshness(self, price: LatestPrice) -> LatestPrice:
        if price.price is None:
            return price
        if price.fetched_at is None:
            return LatestPrice(
                asset_id=price.asset_id,
                provider=price.provider,
                provider_symbol=price.provider_symbol,
                price=price.price,
                currency=price.currency,
                price_timestamp=price.price_timestamp,
                fetched_at=price.fetched_at,
                status=PriceStatus.STALE,
                error_message=price.error_message,
                source=price.source,
                previous_close=price.previous_close,
            )
        age = datetime.now(timezone.utc) - price.fetched_at
        stale_after = timedelta(minutes=self.settings.market_data_stale_after_minutes)
        status = PriceStatus.FRESH if age <= stale_after else PriceStatus.STALE
        if price.status == PriceStatus.STALE:
            status = PriceStatus.STALE
        return LatestPrice(
            asset_id=price.asset_id,
            provider=price.provider,
            provider_symbol=price.provider_symbol,
            price=price.price,
            currency=price.currency,
            price_timestamp=price.price_timestamp,
            fetched_at=price.fetched_at,
            status=status,
            error_message=price.error_message,
            source=price.source,
            previous_close=price.previous_close,
        )

    @staticmethod
    def _from_row(row: PriceCache, *, source: str) -> LatestPrice:
        try:
            status = PriceStatus(row.status)
        except ValueError:
            status = PriceStatus.UNAVAILABLE
        return LatestPrice(
            asset_id=row.asset_id,
            provider=row.provider,
            provider_symbol=row.provider_symbol,
            price=row.price,
            currency=row.currency,
            price_timestamp=row.price_timestamp,
            fetched_at=row.fetched_at,
            status=status,
            error_message=row.error_message,
            source=source,
            previous_close=row.previous_close,
        )

    @staticmethod
    def _unavailable(
        asset: Asset,
        *,
        source: str,
        message: str | None = None,
    ) -> LatestPrice:
        return LatestPrice(
            asset_id=asset.id,
            provider=None,
            provider_symbol=asset.provider_symbol,
            price=None,
            currency=None,
            price_timestamp=None,
            fetched_at=None,
            status=PriceStatus.UNAVAILABLE,
            error_message=message,
            source=source,
        )

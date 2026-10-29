"""PostgreSQL price_cache persistence."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.invest import Asset, PortfolioHolding, PriceCache


class PriceCacheRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_asset_id(self, asset_id: UUID) -> PriceCache | None:
        return self.db.query(PriceCache).filter(PriceCache.asset_id == asset_id).first()

    def get_by_asset_ids(self, asset_ids: list[UUID]) -> dict[UUID, PriceCache]:
        if not asset_ids:
            return {}
        rows = self.db.query(PriceCache).filter(PriceCache.asset_id.in_(asset_ids)).all()
        return {row.asset_id: row for row in rows}

    def upsert(
        self,
        *,
        asset_id: UUID,
        provider: str,
        provider_symbol: str,
        price: Decimal | None,
        previous_close: Decimal | None = None,
        currency: str,
        price_timestamp: datetime | None,
        fetched_at: datetime,
        status: str,
        error_message: str | None,
    ) -> PriceCache:
        row = self.get_by_asset_id(asset_id)
        if row is None:
            row = PriceCache(
                asset_id=asset_id,
                provider=provider,
                provider_symbol=provider_symbol,
                price=price,
                previous_close=previous_close,
                currency=currency,
                price_timestamp=price_timestamp,
                fetched_at=fetched_at,
                status=status,
                error_message=error_message,
            )
            self.db.add(row)
        else:
            row.provider = provider
            row.provider_symbol = provider_symbol
            row.price = price
            row.previous_close = previous_close
            row.currency = currency
            row.price_timestamp = price_timestamp
            row.fetched_at = fetched_at
            row.status = status
            row.error_message = error_message
        self.db.flush()
        return row

    def list_refreshable_assets(self) -> list[Asset]:
        from app.models.paper_trading import PaperPosition, PaperWatchlistItem

        paper_assets = self.db.query(PaperPosition.asset_id.label("asset_id")).filter(
            PaperPosition.quantity > 0
        ).union(
            self.db.query(PaperWatchlistItem.asset_id.label("asset_id"))
        ).subquery()
        return (
            self.db.query(Asset)
            .outerjoin(PortfolioHolding, PortfolioHolding.asset_id == Asset.id)
            .outerjoin(paper_assets, paper_assets.c.asset_id == Asset.id)
            .filter(
                Asset.active.is_(True),
                Asset.asset_type.in_(("stock", "etf", "mutual_fund", "index")),
                Asset.provider_symbol.isnot(None),
                ((PortfolioHolding.id.isnot(None)) & (PortfolioHolding.status == "open"))
                | paper_assets.c.asset_id.isnot(None),
            )
            .distinct()
            .order_by(Asset.asset_type.asc(), Asset.symbol.asc().nulls_last())
            .all()
        )

    def list_assets_for_holdings(self, asset_ids: list[UUID]) -> list[Asset]:
        if not asset_ids:
            return []
        return (
            self.db.query(Asset)
            .filter(Asset.id.in_(asset_ids), Asset.active.is_(True))
            .all()
        )

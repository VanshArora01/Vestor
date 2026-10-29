"""Celery tasks for Invest I4 market-data refresh."""

from __future__ import annotations

import logging

from app.db.session import SessionLocal
from app.services.market_data_service import MarketDataService
from app.worker.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="vestor.refresh_asset_price")
def refresh_asset_price(asset_id: str) -> dict:
    """Refresh a single asset price via the market-data service."""
    from uuid import UUID

    db = SessionLocal()
    try:
        result = MarketDataService(db).refresh_asset_price(UUID(asset_id))
        return {
            "asset_id": asset_id,
            "status": str(result.status),
            "price": str(result.price) if result.price is not None else None,
        }
    finally:
        db.close()


@celery_app.task(name="vestor.refresh_market_prices")
def refresh_market_prices() -> dict:
    """Periodic refresh of active stock/ETF/MF assets. Continues on per-asset failures."""
    db = SessionLocal()
    try:
        summary = MarketDataService(db).refresh_all_market_prices()
        logger.info("vestor.refresh_market_prices finished %s", summary)
        return summary
    finally:
        db.close()

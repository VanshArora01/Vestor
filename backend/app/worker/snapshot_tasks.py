"""Celery tasks for Invest I6 daily portfolio snapshots."""

from __future__ import annotations

import logging
from datetime import date

from app.db.session import SessionLocal
from app.services.portfolio_snapshot_service import PortfolioSnapshotService
from app.worker.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="vestor.create_daily_portfolio_snapshots")
def create_daily_portfolio_snapshots(snapshot_date: str | None = None) -> dict:
    """Create/update daily portfolio snapshots for users with open holdings."""
    db = SessionLocal()
    try:
        day = date.fromisoformat(snapshot_date) if snapshot_date else None
        summary = PortfolioSnapshotService(db).create_daily_snapshots(snapshot_date=day)
        logger.info("vestor.create_daily_portfolio_snapshots finished %s", summary)
        return summary
    finally:
        db.close()

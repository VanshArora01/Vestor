"""Daily portfolio snapshot creation and historical performance reads (I6)."""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.models.user import User
from app.repositories.portfolio_snapshot_repository import PortfolioSnapshotRepository
from app.services.invest_service import InvestService
from app.services.money_calculations import money_to_str, parse_money

logger = logging.getLogger(__name__)

IST = ZoneInfo("Asia/Kolkata")

# Snapshot portfolio-level status (distinct from per-holding fresh/stale).
SNAPSHOT_COMPLETE = "complete"
SNAPSHOT_PARTIAL = "partial"
SNAPSHOT_UNAVAILABLE = "unavailable"


class PortfolioSnapshotService:
    """Records daily portfolio valuation observations using InvestService valuation."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = PortfolioSnapshotRepository(db)
        self.invest = InvestService(db)

    def snapshot_date_today(self) -> date:
        return datetime.now(IST).date()

    def create_snapshot_for_user(
        self,
        user: User,
        *,
        snapshot_date: date | None = None,
    ) -> dict[str, Any] | None:
        """
        Create or update today's (or given) daily snapshot.

        Returns None when the user has no open holdings (no empty ₹0 snapshots).
        """
        day = snapshot_date or self.snapshot_date_today()
        summary = self.invest.get_summary(user)
        total_holdings = int(summary["total_holdings"])
        if total_holdings <= 0:
            return None

        valuation_status = self._snapshot_valuation_status(
            valuation_complete=bool(summary["valuation_complete"]),
            valued_holdings=int(summary["valued_holdings"]),
            unvalued_holdings=int(summary["unvalued_holdings"]),
        )
        total_invested = parse_money(summary["total_invested"])
        total_value = (
            parse_money(summary["current_value"]) if summary["current_value"] is not None else None
        )
        gain = (
            parse_money(summary["absolute_gain_loss"])
            if summary["absolute_gain_loss"] is not None
            else None
        )
        return_pct = (
            parse_money(summary["return_pct"]) if summary["return_pct"] is not None else None
        )

        row = self.repo.upsert(
            user_id=user.id,
            snapshot_date=day,
            total_invested=total_invested,
            total_value=total_value,
            absolute_gain_loss=gain,
            return_pct=return_pct,
            valuation_status=valuation_status,
            total_holdings=total_holdings,
            valued_holdings=int(summary["valued_holdings"]),
            unvalued_holdings=int(summary["unvalued_holdings"]),
        )
        self.repo.commit()
        return self._to_dict(row)

    def create_daily_snapshots(self, *, snapshot_date: date | None = None) -> dict[str, int]:
        """Snapshot all users with open holdings. Isolates per-user failures."""
        day = snapshot_date or self.snapshot_date_today()
        user_ids = self.repo.list_user_ids_with_open_holdings()
        created = 0
        updated = 0
        skipped = 0
        failed = 0

        for user_id in user_ids:
            try:
                user = self.db.get(User, user_id)
                if user is None:
                    skipped += 1
                    continue
                existing = self.repo.get_for_user_date(user_id, day)
                result = self.create_snapshot_for_user(user, snapshot_date=day)
                if result is None:
                    skipped += 1
                elif existing is None:
                    created += 1
                else:
                    updated += 1
            except Exception:
                failed += 1
                logger.warning(
                    "Portfolio snapshot failed user_id=%s date=%s",
                    user_id,
                    day.isoformat(),
                    exc_info=True,
                )
                try:
                    self.db.rollback()
                except Exception:
                    pass
                continue

        logger.info(
            "Daily portfolio snapshots date=%s created=%s updated=%s skipped=%s failed=%s",
            day.isoformat(),
            created,
            updated,
            skipped,
            failed,
        )
        return {
            "created": created,
            "updated": updated,
            "skipped": skipped,
            "failed": failed,
            "eligible_users": len(user_ids),
        }

    def get_performance(
        self,
        user: User,
        *,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> dict[str, Any]:
        if from_date is not None and to_date is not None and from_date > to_date:
            raise AppError(
                "VALIDATION_ERROR",
                "from_date must be on or before to_date",
                status_code=400,
            )
        rows = self.repo.list_for_user(user.id, from_date=from_date, to_date=to_date)
        return {
            "from_date": from_date.isoformat() if from_date else None,
            "to_date": to_date.isoformat() if to_date else None,
            "snapshots": [self._to_public_snapshot(row) for row in rows],
        }

    @staticmethod
    def _snapshot_valuation_status(
        *,
        valuation_complete: bool,
        valued_holdings: int,
        unvalued_holdings: int,
    ) -> str:
        if valuation_complete and valued_holdings >= 0 and unvalued_holdings == 0:
            # complete even when some holdings are stale (same rule as Invest summary)
            return SNAPSHOT_COMPLETE
        if valued_holdings > 0:
            return SNAPSHOT_PARTIAL
        return SNAPSHOT_UNAVAILABLE

    @staticmethod
    def _to_dict(row) -> dict[str, Any]:
        return {
            "id": str(row.id),
            "user_id": str(row.user_id),
            "snapshot_date": row.snapshot_date.isoformat(),
            "total_invested": money_to_str(row.total_invested) or "0.00",
            "total_value": money_to_str(row.total_value),
            "absolute_gain_loss": money_to_str(row.absolute_gain_loss),
            "return_pct": money_to_str(row.return_pct),
            "valuation_status": row.valuation_status,
            "total_holdings": row.total_holdings,
            "valued_holdings": row.valued_holdings,
            "unvalued_holdings": row.unvalued_holdings,
        }

    @staticmethod
    def _to_public_snapshot(row) -> dict[str, Any]:
        return {
            "date": row.snapshot_date.isoformat(),
            "total_invested": money_to_str(row.total_invested) or "0.00",
            "total_value": money_to_str(row.total_value),
            "absolute_gain_loss": money_to_str(row.absolute_gain_loss),
            "return_pct": money_to_str(row.return_pct),
            "valuation_status": row.valuation_status,
            "total_holdings": row.total_holdings,
            "valued_holdings": row.valued_holdings,
            "unvalued_holdings": row.unvalued_holdings,
        }

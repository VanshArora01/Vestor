"""Persistence for daily portfolio snapshots."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import distinct
from sqlalchemy.orm import Session

from app.models.invest import PortfolioHolding, PortfolioSnapshot


class PortfolioSnapshotRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_for_user_date(self, user_id: UUID, snapshot_date: date) -> PortfolioSnapshot | None:
        return (
            self.db.query(PortfolioSnapshot)
            .filter(
                PortfolioSnapshot.user_id == user_id,
                PortfolioSnapshot.snapshot_date == snapshot_date,
            )
            .first()
        )

    def list_user_ids_with_open_holdings(self) -> list[UUID]:
        rows = (
            self.db.query(distinct(PortfolioHolding.user_id))
            .filter(PortfolioHolding.status == "open")
            .all()
        )
        return [row[0] for row in rows]

    def upsert(
        self,
        *,
        user_id: UUID,
        snapshot_date: date,
        total_invested: Decimal,
        total_value: Decimal | None,
        absolute_gain_loss: Decimal | None,
        return_pct: Decimal | None,
        valuation_status: str,
        total_holdings: int,
        valued_holdings: int,
        unvalued_holdings: int,
    ) -> PortfolioSnapshot:
        row = self.get_for_user_date(user_id, snapshot_date)
        if row is None:
            row = PortfolioSnapshot(
                user_id=user_id,
                snapshot_date=snapshot_date,
                total_invested=total_invested,
                total_value=total_value,
                absolute_gain_loss=absolute_gain_loss,
                return_pct=return_pct,
                valuation_status=valuation_status,
                total_holdings=total_holdings,
                valued_holdings=valued_holdings,
                unvalued_holdings=unvalued_holdings,
            )
            self.db.add(row)
        else:
            row.total_invested = total_invested
            row.total_value = total_value
            row.absolute_gain_loss = absolute_gain_loss
            row.return_pct = return_pct
            row.valuation_status = valuation_status
            row.total_holdings = total_holdings
            row.valued_holdings = valued_holdings
            row.unvalued_holdings = unvalued_holdings
        self.db.flush()
        return row

    def list_for_user(
        self,
        user_id: UUID,
        *,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> list[PortfolioSnapshot]:
        query = self.db.query(PortfolioSnapshot).filter(PortfolioSnapshot.user_id == user_id)
        if from_date is not None:
            query = query.filter(PortfolioSnapshot.snapshot_date >= from_date)
        if to_date is not None:
            query = query.filter(PortfolioSnapshot.snapshot_date <= to_date)
        return query.order_by(PortfolioSnapshot.snapshot_date.asc()).all()

    def commit(self) -> None:
        self.db.commit()

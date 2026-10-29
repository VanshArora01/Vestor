from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.invest import Asset, InvestmentTransaction, PortfolioHolding


class InvestRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_asset(self, asset_id: UUID) -> Asset | None:
        return self.db.query(Asset).filter(Asset.id == asset_id).first()

    def get_active_asset(self, asset_id: UUID) -> Asset | None:
        return (
            self.db.query(Asset)
            .filter(Asset.id == asset_id, Asset.active.is_(True))
            .first()
        )

    def search_assets(
        self,
        *,
        query: str,
        asset_type: str | None = None,
        exchange: str | None = None,
        limit: int = 20,
    ) -> list[Asset]:
        from sqlalchemy import case, or_

        q = query.strip()
        pattern = f"%{q}%"
        prefix = f"{q}%"
        q_lower = q.lower()

        rank = case(
            (func.lower(Asset.symbol) == q_lower, 1),
            (func.lower(Asset.isin) == q_lower, 2),
            (Asset.name.ilike(prefix), 3),
            (Asset.symbol.ilike(prefix), 4),
            (Asset.name.ilike(pattern), 5),
            (Asset.symbol.ilike(pattern), 6),
            (Asset.provider_symbol.ilike(pattern), 7),
            else_=100,
        )

        filters = [
            Asset.active.is_(True),
            or_(
                Asset.name.ilike(pattern),
                Asset.symbol.ilike(pattern),
                Asset.provider_symbol.ilike(pattern),
                Asset.isin.ilike(pattern),
            ),
        ]
        if asset_type is not None:
            filters.append(Asset.asset_type == asset_type)
        if exchange is not None:
            filters.append(func.upper(Asset.exchange) == exchange.upper())

        return (
            self.db.query(Asset)
            .filter(*filters)
            .order_by(
                rank.asc(),
                Asset.asset_type.asc(),
                Asset.exchange.asc().nulls_last(),
                Asset.name.asc(),
            )
            .limit(limit)
            .all()
        )

    def count_search_assets(
        self,
        *,
        query: str,
        asset_type: str | None = None,
        exchange: str | None = None,
    ) -> int:
        from sqlalchemy import or_

        q = query.strip()
        pattern = f"%{q}%"
        filters = [
            Asset.active.is_(True),
            or_(
                Asset.name.ilike(pattern),
                Asset.symbol.ilike(pattern),
                Asset.provider_symbol.ilike(pattern),
                Asset.isin.ilike(pattern),
            ),
        ]
        if asset_type is not None:
            filters.append(Asset.asset_type == asset_type)
        if exchange is not None:
            filters.append(func.upper(Asset.exchange) == exchange.upper())
        return int(self.db.query(func.count(Asset.id)).filter(*filters).scalar() or 0)

    def get_holding_for_user(self, user_id: UUID, holding_id: UUID) -> PortfolioHolding | None:
        return (
            self.db.query(PortfolioHolding)
            .options(joinedload(PortfolioHolding.transactions))
            .filter(PortfolioHolding.id == holding_id, PortfolioHolding.user_id == user_id)
            .first()
        )

    def find_open_holding_by_asset(
        self, user_id: UUID, asset_id: UUID
    ) -> PortfolioHolding | None:
        return (
            self.db.query(PortfolioHolding)
            .filter(
                PortfolioHolding.user_id == user_id,
                PortfolioHolding.asset_id == asset_id,
                PortfolioHolding.status == "open",
            )
            .first()
        )

    def find_open_holding_by_type(
        self,
        user_id: UUID,
        asset_type: str,
        *,
        display_name: str | None = None,
    ) -> PortfolioHolding | None:
        query = self.db.query(PortfolioHolding).filter(
            PortfolioHolding.user_id == user_id,
            PortfolioHolding.asset_type == asset_type,
            PortfolioHolding.status == "open",
            PortfolioHolding.asset_id.is_(None),
        )
        if display_name is not None:
            query = query.filter(PortfolioHolding.display_name == display_name)
        return query.first()

    def add_holding(self, holding: PortfolioHolding) -> PortfolioHolding:
        self.db.add(holding)
        self.db.flush()
        return holding

    def add_transaction(self, transaction: InvestmentTransaction) -> InvestmentTransaction:
        self.db.add(transaction)
        self.db.flush()
        return transaction

    def list_buy_lots(self, holding_id: UUID) -> list[InvestmentTransaction]:
        return (
            self.db.query(InvestmentTransaction)
            .filter(
                InvestmentTransaction.holding_id == holding_id,
                InvestmentTransaction.transaction_type == "buy",
            )
            .order_by(
                InvestmentTransaction.traded_on.asc(),
                InvestmentTransaction.created_at.asc(),
            )
            .all()
        )

    def list_holdings(
        self,
        user_id: UUID,
        *,
        asset_type: str | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[PortfolioHolding]:
        query = self.db.query(PortfolioHolding).filter(PortfolioHolding.user_id == user_id)
        if asset_type is not None:
            query = query.filter(PortfolioHolding.asset_type == asset_type)
        if status is not None:
            query = query.filter(PortfolioHolding.status == status)
        # Note: This query is updated to reflect the design choice to allow multiple transactions per asset.
        # The holding is created once and updated with each transaction.
        return (
            query.order_by(
                PortfolioHolding.updated_at.desc(),
                PortfolioHolding.created_at.desc(),
            )
            .offset(offset)
            .limit(limit)
            .all()
        )

    def count_holdings(
        self,
        user_id: UUID,
        *,
        asset_type: str | None = None,
        status: str | None = None,
    ) -> int:
        query = self.db.query(func.count(PortfolioHolding.id)).filter(
            PortfolioHolding.user_id == user_id
        )
        if asset_type is not None:
            query = query.filter(PortfolioHolding.asset_type == asset_type)
        if status is not None:
            query = query.filter(PortfolioHolding.status == status)
        return int(query.scalar() or 0)

    def list_all_holdings_for_summary(
        self, user_id: UUID, *, status: str | None = "open"
    ) -> list[PortfolioHolding]:
        query = self.db.query(PortfolioHolding).filter(PortfolioHolding.user_id == user_id)
        if status is not None:
            query = query.filter(PortfolioHolding.status == status)
        return query.order_by(PortfolioHolding.created_at.asc()).all()

    def count_transactions(self, user_id: UUID) -> int:
        return int(
            self.db.query(func.count(InvestmentTransaction.id))
            .filter(InvestmentTransaction.user_id == user_id)
            .scalar()
            or 0
        )

    def _history_query(
        self,
        user_id: UUID,
        *,
        asset_type: str | None = None,
        transaction_type: str | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
    ):
        query = (
            self.db.query(InvestmentTransaction)
            .join(PortfolioHolding, InvestmentTransaction.holding_id == PortfolioHolding.id)
            .options(joinedload(InvestmentTransaction.holding))
            .filter(InvestmentTransaction.user_id == user_id)
        )
        if asset_type is not None:
            query = query.filter(PortfolioHolding.asset_type == asset_type)
        if transaction_type is not None:
            query = query.filter(InvestmentTransaction.transaction_type == transaction_type)
        if from_date is not None:
            query = query.filter(InvestmentTransaction.traded_on >= from_date)
        if to_date is not None:
            query = query.filter(InvestmentTransaction.traded_on <= to_date)
        return query

    def list_history(
        self,
        user_id: UUID,
        *,
        asset_type: str | None = None,
        transaction_type: str | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[InvestmentTransaction]:
        return (
            self._history_query(
                user_id,
                asset_type=asset_type,
                transaction_type=transaction_type,
                from_date=from_date,
                to_date=to_date,
            )
            .order_by(
                InvestmentTransaction.traded_on.desc(),
                InvestmentTransaction.created_at.desc(),
            )
            .offset(offset)
            .limit(limit)
            .all()
        )

    def count_history(
        self,
        user_id: UUID,
        *,
        asset_type: str | None = None,
        transaction_type: str | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> int:
        query = (
            self.db.query(func.count(InvestmentTransaction.id))
            .join(PortfolioHolding, InvestmentTransaction.holding_id == PortfolioHolding.id)
            .filter(InvestmentTransaction.user_id == user_id)
        )
        if asset_type is not None:
            query = query.filter(PortfolioHolding.asset_type == asset_type)
        if transaction_type is not None:
            query = query.filter(InvestmentTransaction.transaction_type == transaction_type)
        if from_date is not None:
            query = query.filter(InvestmentTransaction.traded_on >= from_date)
        if to_date is not None:
            query = query.filter(InvestmentTransaction.traded_on <= to_date)
        return int(query.scalar() or 0)

    def sum_buy_amounts_by_asset_type(
        self,
        user_id: UUID,
        *,
        from_date: date,
        to_date: date,
    ) -> dict[str, Decimal]:
        """Sum BUY transaction amounts by holding.asset_type for traded_on in [from, to]."""
        rows = (
            self.db.query(
                PortfolioHolding.asset_type,
                func.coalesce(func.sum(InvestmentTransaction.amount), 0),
            )
            .join(PortfolioHolding, InvestmentTransaction.holding_id == PortfolioHolding.id)
            .filter(
                InvestmentTransaction.user_id == user_id,
                InvestmentTransaction.transaction_type == "buy",
                InvestmentTransaction.traded_on >= from_date,
                InvestmentTransaction.traded_on <= to_date,
            )
            .group_by(PortfolioHolding.asset_type)
            .all()
        )
        return {asset_type: Decimal(str(total)) for asset_type, total in rows}

    def list_history_for_export(
        self,
        user_id: UUID,
        *,
        asset_type: str | None = None,
        transaction_type: str | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> list[InvestmentTransaction]:
        return (
            self._history_query(
                user_id,
                asset_type=asset_type,
                transaction_type=transaction_type,
                from_date=from_date,
                to_date=to_date,
            )
            .order_by(
                InvestmentTransaction.traded_on.desc(),
                InvestmentTransaction.created_at.desc(),
            )
            .all()
        )

    def commit(self) -> None:
        self.db.commit()

    def rollback(self) -> None:
        self.db.rollback()

    def refresh(self, instance: object) -> None:
        self.db.refresh(instance)

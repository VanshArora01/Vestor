from __future__ import annotations

import csv
import io
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppError, NotFoundError
from app.models.invest import InvestmentTransaction, PortfolioHolding
from app.models.user import User
from app.repositories.invest_repository import InvestRepository
from app.market_data.types import LatestPrice, PriceStatus
from app.services.invest_calculations import (
    ASSET_TYPES,
    HOLDING_STATUSES,
    INSTRUMENT_ASSET_TYPES,
    MANUAL_ASSET_TYPES,
    SEARCHABLE_ASSET_TYPES,
    TRANSACTION_TYPES_I1,
    aggregate_buy_lots,
    compute_fd_values,
    compute_lot_amount,
    compute_portfolio_return_pct,
    holding_valuation_snapshot,
    parse_units,
    units_to_str,
    valuation_mode_for_asset_type,
)
from app.services.market_data_service import MarketDataService
from app.services.money_calculations import money_to_str, parse_money, quantize_money, sum_amounts

DEFAULT_PAGE_LIMIT = 50
MAX_PAGE_LIMIT = 100
DEFAULT_ASSET_SEARCH_LIMIT = 20
MAX_ASSET_SEARCH_LIMIT = 50


class InvestService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = InvestRepository(db)

    def create_buy_transaction(self, user: User, payload: dict[str, Any]) -> dict[str, Any]:
        asset_type = payload["asset_type"]
        traded_on: date = payload["traded_on"]
        notes = payload.get("notes")

        # SAVEPOINT keeps failed creates atomic without session.rollback(),
        # which would undo unrelated work when tests share one connection transaction.
        with self.db.begin_nested():
            if asset_type in INSTRUMENT_ASSET_TYPES:
                result = self._create_instrument_buy(user, payload, traded_on, notes)
            elif asset_type == "gold":
                result = self._create_gold_buy(user, payload, traded_on, notes)
            elif asset_type == "fd":
                result = self._create_fd(user, payload, traded_on, notes)
            elif asset_type in MANUAL_ASSET_TYPES:
                result = self._create_manual_buy(user, payload, traded_on, notes)
            else:
                raise AppError("INVALID_ASSET_TYPE", "Unsupported asset type", status_code=400)

        self.repo.commit()
        holding = self.repo.get_holding_for_user(user.id, result["holding"].id)
        assert holding is not None
        transaction = next(t for t in holding.transactions if t.id == result["transaction"].id)
        return self._detail_response(holding, transaction)

    def get_summary(self, user: User) -> dict[str, Any]:
        holdings = self.repo.list_all_holdings_for_summary(user.id, status="open")
        price_map = self._price_map_for_holdings(holdings)
        total_invested = sum_amounts([h.total_invested for h in holdings])
        valued_invested = Decimal("0")
        valued_current = Decimal("0")
        valued_count = 0
        fresh_count = 0
        stale_count = 0

        for holding in holdings:
            payload = self._holding_to_dict(holding, price_map=price_map)
            if payload["has_current_valuation"] and payload["current_value"] is not None:
                valued_count += 1
                valued_invested = quantize_money(valued_invested + holding.total_invested)
                valued_current = quantize_money(valued_current + parse_money(payload["current_value"]))
            if payload.get("valuation_status") == "fresh":
                fresh_count += 1
            elif payload.get("valuation_status") == "stale":
                stale_count += 1

        unvalued_count = len(holdings) - valued_count
        valuation_complete = unvalued_count == 0
        # Show the verified subtotal when some instruments lack prices. Its cost basis
        # is limited to the same valued holdings so gain/return are comparable.
        if valued_count > 0:
            current_value = valued_current
            gain = quantize_money(current_value - valued_invested)
            return_pct = compute_portfolio_return_pct(
                total_invested=valued_invested,
                total_current_value=current_value,
            )
        else:
            current_value = None
            gain = None
            return_pct = None

        # Note: This is a design choice to allow multiple transactions per asset.
        # The holding is created once and updated with each transaction.
        return {
            "total_invested": money_to_str(total_invested) or "0.00",
            "valued_invested": money_to_str(valued_invested) or "0.00",
            "current_value": money_to_str(current_value),
            "absolute_gain_loss": money_to_str(gain),
            "return_pct": money_to_str(return_pct),
            "total_holdings": len(holdings),
            "total_transactions": self.repo.count_transactions(user.id),
            "valued_holdings": valued_count,
            "unvalued_holdings": unvalued_count,
            "valuation_complete": valuation_complete,
            "fresh_holdings": fresh_count,
            "stale_holdings": stale_count,
        }

    def list_holdings(
        self,
        user: User,
        *,
        asset_type: str | None = None,
        status: str | None = None,
        limit: int | None = None,
        offset: int | None = None,
    ) -> dict[str, Any]:
        resolved_type = self._optional_asset_type(asset_type)
        resolved_status = self._optional_status(status)
        page_limit, page_offset = self._resolve_pagination(limit, offset)
        items = self.repo.list_holdings(
            user.id,
            asset_type=resolved_type,
            status=resolved_status,
            limit=page_limit,
            offset=page_offset,
        )
        total = self.repo.count_holdings(
            user.id,
            asset_type=resolved_type,
            status=resolved_status,
        )
        price_map = self._price_map_for_holdings(items)
        return {
            "items": [self._holding_to_dict(h, price_map=price_map) for h in items],
            "total": total,
            "limit": page_limit,
            "offset": page_offset,
        }

    def get_holding(self, user: User, holding_id: UUID) -> dict[str, Any]:
        holding = self.repo.get_holding_for_user(user.id, holding_id)
        if holding is None:
            raise NotFoundError(code="HOLDING_NOT_FOUND", message="Holding not found")
        lots = sorted(
            holding.transactions,
            key=lambda t: (t.traded_on, t.created_at),
            reverse=True,
        )
        price_map = self._price_map_for_holdings([holding])
        return {
            "holding": self._holding_to_dict(holding, price_map=price_map),
            "transactions": [self._transaction_to_dict(t) for t in lots],
        }

    def list_history(
        self,
        user: User,
        *,
        asset_type: str | None = None,
        transaction_type: str | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
        limit: int | None = None,
        offset: int | None = None,
    ) -> dict[str, Any]:
        resolved_type = self._optional_asset_type(asset_type)
        resolved_txn_type = self._optional_transaction_type(transaction_type)
        self._validate_date_range(from_date, to_date)
        page_limit, page_offset = self._resolve_pagination(limit, offset)
        rows = self.repo.list_history(
            user.id,
            asset_type=resolved_type,
            transaction_type=resolved_txn_type,
            from_date=from_date,
            to_date=to_date,
            limit=page_limit,
            offset=page_offset,
        )
        total = self.repo.count_history(
            user.id,
            asset_type=resolved_type,
            transaction_type=resolved_txn_type,
            from_date=from_date,
            to_date=to_date,
        )
        return {
            "items": [self._history_item_to_dict(t) for t in rows],
            "total": total,
            "limit": page_limit,
            "offset": page_offset,
        }

    def export_history_csv(
        self,
        user: User,
        *,
        asset_type: str | None = None,
        transaction_type: str | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> str:
        resolved_type = self._optional_asset_type(asset_type)
        resolved_txn_type = self._optional_transaction_type(transaction_type)
        self._validate_date_range(from_date, to_date)
        rows = self.repo.list_history_for_export(
            user.id,
            asset_type=resolved_type,
            transaction_type=resolved_txn_type,
            from_date=from_date,
            to_date=to_date,
        )
        buffer = io.StringIO()
        writer = csv.writer(buffer, quoting=csv.QUOTE_MINIMAL)
        writer.writerow(
            [
                "Date",
                "Asset",
                "Symbol",
                "Asset Type",
                "Transaction Type",
                "Quantity",
                "Unit Price",
                "Amount",
                "Notes",
            ]
        )
        for row in rows:
            holding = row.holding
            writer.writerow(
                [
                    row.traded_on.isoformat(),
                    holding.display_name if holding else "",
                    holding.symbol if holding and holding.symbol else "",
                    holding.asset_type if holding else "",
                    row.transaction_type,
                    units_to_str(row.quantity) or "",
                    units_to_str(row.unit_price) or "",
                    money_to_str(row.amount) or "0.00",
                    row.notes or "",
                ]
            )
        return buffer.getvalue()

    def search_assets(
        self,
        *,
        q: str,
        asset_type: str | None = None,
        exchange: str | None = None,
        limit: int | None = None,
    ) -> dict[str, Any]:
        query = (q or "").strip()
        if not query:
            raise AppError("VALIDATION_ERROR", "q must not be empty", status_code=400)
        if len(query) > 100:
            raise AppError("VALIDATION_ERROR", "q is too long", status_code=400)

        resolved_type = self._optional_searchable_asset_type(asset_type)
        page_limit = DEFAULT_ASSET_SEARCH_LIMIT if limit is None else limit
        if page_limit < 1 or page_limit > MAX_ASSET_SEARCH_LIMIT:
            raise AppError(
                "VALIDATION_ERROR",
                f"limit must be between 1 and {MAX_ASSET_SEARCH_LIMIT}",
                status_code=400,
            )

        items = self.repo.search_assets(
            query=query,
            asset_type=resolved_type,
            exchange=exchange.strip().upper() if exchange else None,
            limit=page_limit,
        )
        total = self.repo.count_search_assets(
            query=query,
            asset_type=resolved_type,
            exchange=exchange.strip().upper() if exchange else None,
        )
        return {
            "items": [self._asset_to_dict(a, include_provider=False) for a in items],
            "total": total,
            "limit": page_limit,
        }

    def get_asset(self, asset_id: UUID) -> dict[str, Any]:
        asset = self.repo.get_active_asset(asset_id)
        if asset is None:
            raise NotFoundError(code="ASSET_NOT_FOUND", message="Asset not found")
        if asset.asset_type not in SEARCHABLE_ASSET_TYPES:
            # Gold/FD/etc. are not instrument-master products for this API surface.
            raise NotFoundError(code="ASSET_NOT_FOUND", message="Asset not found")
        return self._asset_to_dict(asset, include_provider=True)

    def _create_instrument_buy(
        self,
        user: User,
        payload: dict[str, Any],
        traded_on: date,
        notes: str | None,
    ) -> dict[str, Any]:
        asset_id = self._parse_uuid(payload.get("asset_id"), field="asset_id")
        asset = self.repo.get_active_asset(asset_id)
        if asset is None:
            raise NotFoundError(code="ASSET_NOT_FOUND", message="Asset not found")
        if asset.asset_type != payload["asset_type"]:
            raise AppError(
                "ASSET_TYPE_MISMATCH",
                "asset_type does not match the selected asset",
                status_code=400,
            )
        if asset.asset_type not in INSTRUMENT_ASSET_TYPES:
            raise AppError(
                "INVALID_ASSET_TYPE",
                "Selected asset cannot be used for instrument purchases",
                status_code=400,
            )

        quantity = self._require_positive_units(payload.get("quantity"), field="quantity")
        unit_price = self._require_positive_units(payload.get("unit_price"), field="unit_price")
        amount = compute_lot_amount(quantity=quantity, unit_price=unit_price)

        holding = self.repo.find_open_holding_by_asset(user.id, asset.id)
        if holding is None:
            holding = PortfolioHolding(
                user_id=user.id,
                asset_id=asset.id,
                asset_type=asset.asset_type,
                display_name=asset.name,
                symbol=asset.symbol,
                quantity=Decimal("0"),
                total_invested=Decimal("0"),
                average_cost=Decimal("0"),
                valuation_mode=valuation_mode_for_asset_type(asset.asset_type),
                status="open",
            )
            self.repo.add_holding(holding)
            # Note: This is a design choice to allow multiple transactions per asset.
            # The holding is created once and updated with each transaction.

        transaction = InvestmentTransaction(
            user_id=user.id,
            holding_id=holding.id,
            asset_id=asset.id,
            transaction_type="buy",
            quantity=quantity,
            unit_price=unit_price,
            amount=amount,
            traded_on=traded_on,
            notes=notes,
        )
        self.repo.add_transaction(transaction)
        self._recalculate_holding_from_lots(holding)
        return {"holding": holding, "transaction": transaction}

    def _create_gold_buy(
        self,
        user: User,
        payload: dict[str, Any],
        traded_on: date,
        notes: str | None,
    ) -> dict[str, Any]:
        quantity = self._require_positive_units(payload.get("quantity"), field="quantity")
        unit_price = self._require_positive_units(payload.get("unit_price"), field="unit_price")
        amount = compute_lot_amount(quantity=quantity, unit_price=unit_price)
        gold_unit = payload.get("gold_unit") or "grams"

        holding = self.repo.find_open_holding_by_type(user.id, "gold")
        if holding is None:
            holding = PortfolioHolding(
                user_id=user.id,
                asset_id=None,
                asset_type="gold",
                display_name=payload.get("display_name") or "Gold",
                symbol=None,
                quantity=Decimal("0"),
                total_invested=Decimal("0"),
                average_cost=Decimal("0"),
                valuation_mode="benchmark",
                gold_unit=gold_unit,
                status="open",
            )
            self.repo.add_holding(holding)
        elif holding.gold_unit and holding.gold_unit != gold_unit:
            raise AppError(
                "GOLD_UNIT_MISMATCH",
                "Existing gold holding uses a different unit",
                status_code=400,
            )

        transaction = InvestmentTransaction(
            user_id=user.id,
            holding_id=holding.id,
            asset_id=None,
            transaction_type="buy",
            quantity=quantity,
            unit_price=unit_price,
            amount=amount,
            traded_on=traded_on,
            notes=notes,
        )
        self.repo.add_transaction(transaction)
        self._recalculate_holding_from_lots(holding)
        return {"holding": holding, "transaction": transaction}

    def _create_fd(
        self,
        user: User,
        payload: dict[str, Any],
        traded_on: date,
        notes: str | None,
    ) -> dict[str, Any]:
        principal = self._require_positive_money(payload.get("fd_principal"), field="fd_principal")
        rate = self._require_positive_money(payload.get("fd_interest_rate"), field="fd_interest_rate")
        start_date: date = payload["fd_start_date"]
        maturity_date: date = payload["fd_maturity_date"]
        compounding: str = payload["fd_compounding"]
        display_name: str = payload["display_name"]

        # Each FD is its own holding (no shared asset_id aggregation).
        holding = PortfolioHolding(
            user_id=user.id,
            asset_id=None,
            asset_type="fd",
            display_name=display_name,
            symbol=None,
            quantity=Decimal("1"),
            total_invested=principal,
            average_cost=principal,
            valuation_mode="deterministic",
            fd_principal=principal,
            fd_interest_rate=rate,
            fd_start_date=start_date,
            fd_maturity_date=maturity_date,
            fd_compounding=compounding,
            status="open",
        )
        self.repo.add_holding(holding)

        transaction = InvestmentTransaction(
            user_id=user.id,
            holding_id=holding.id,
            asset_id=None,
            transaction_type="buy",
            quantity=Decimal("1"),
            unit_price=principal,
            amount=principal,
            traded_on=traded_on or start_date,
            notes=notes,
        )
        self.repo.add_transaction(transaction)
        return {"holding": holding, "transaction": transaction}

    def _create_manual_buy(
        self,
        user: User,
        payload: dict[str, Any],
        traded_on: date,
        notes: str | None,
    ) -> dict[str, Any]:
        asset_type = payload["asset_type"]
        display_name: str = payload["display_name"]
        quantity: Decimal | None = None
        unit_price: Decimal | None = None

        if payload.get("quantity") is not None and payload.get("unit_price") is not None:
            quantity = self._require_positive_units(payload.get("quantity"), field="quantity")
            unit_price = self._require_positive_units(payload.get("unit_price"), field="unit_price")
            amount = compute_lot_amount(quantity=quantity, unit_price=unit_price)
        else:
            amount = self._require_positive_money(payload.get("amount"), field="amount")
            quantity = Decimal("1")
            unit_price = amount

        manual_current_value = None
        manual_updated_at = None
        if payload.get("manual_current_value") is not None:
            manual_current_value = self._require_non_negative_money(
                payload.get("manual_current_value"),
                field="manual_current_value",
            )
            manual_updated_at = datetime.now(timezone.utc)

        holding = self.repo.find_open_holding_by_type(
            user.id, asset_type, display_name=display_name
        )
        if holding is None:
            holding = PortfolioHolding(
                user_id=user.id,
                asset_id=None,
                asset_type=asset_type,
                display_name=display_name,
                symbol=None,
                quantity=Decimal("0"),
                total_invested=Decimal("0"),
                average_cost=Decimal("0"),
                valuation_mode="manual",
                manual_current_value=manual_current_value,
                manual_value_updated_at=manual_updated_at,
                status="open",
            )
            self.repo.add_holding(holding)
        elif manual_current_value is not None:
            holding.manual_current_value = manual_current_value
            holding.manual_value_updated_at = manual_updated_at

        transaction = InvestmentTransaction(
            user_id=user.id,
            holding_id=holding.id,
            asset_id=None,
            transaction_type="buy",
            quantity=quantity,
            unit_price=unit_price,
            amount=amount,
            traded_on=traded_on,
            notes=notes,
        )
        self.repo.add_transaction(transaction)
        self._recalculate_holding_from_lots(holding)
        return {"holding": holding, "transaction": transaction}

    def _recalculate_holding_from_lots(self, holding: PortfolioHolding) -> None:
        lots = self.repo.list_buy_lots(holding.id)
        quantities = [lot.quantity or Decimal("0") for lot in lots]
        amounts = [lot.amount for lot in lots]
        aggregates = aggregate_buy_lots(quantities, amounts)
        holding.quantity = aggregates["quantity"]
        holding.total_invested = aggregates["total_invested"]
        holding.average_cost = aggregates["average_cost"]
        self.db.add(holding)
        self.db.flush()

    def _detail_response(
        self,
        holding: PortfolioHolding,
        created: InvestmentTransaction,
    ) -> dict[str, Any]:
        lots = sorted(
            holding.transactions,
            key=lambda t: (t.traded_on, t.created_at),
            reverse=True,
        )
        price_map = self._price_map_for_holdings([holding])
        return {
            "holding": self._holding_to_dict(holding, price_map=price_map),
            "transaction": self._transaction_to_dict(created),
            "transactions": [self._transaction_to_dict(t) for t in lots],
        }

    def _price_map_for_holdings(
        self,
        holdings: list[PortfolioHolding],
    ) -> dict[UUID, LatestPrice]:
        asset_ids = [
            h.asset_id
            for h in holdings
            if h.asset_id is not None and h.valuation_mode in {"market", "benchmark"}
        ]
        if not asset_ids:
            return {}
        # Invest HTTP reads never call providers — Redis/Postgres only.
        return MarketDataService(self.db).get_latest_prices(asset_ids, allow_network=False)

    def _holding_to_dict(
        self,
        holding: PortfolioHolding,
        *,
        price_map: dict[UUID, LatestPrice] | None = None,
    ) -> dict[str, Any]:
        fd_estimate = None
        if (
            holding.valuation_mode == "deterministic"
            and holding.fd_principal is not None
            and holding.fd_interest_rate is not None
            and holding.fd_start_date is not None
            and holding.fd_maturity_date is not None
            and holding.fd_compounding is not None
        ):
            fd_estimate = compute_fd_values(
                principal=holding.fd_principal,
                annual_interest_rate=holding.fd_interest_rate,
                start_date=holding.fd_start_date,
                maturity_date=holding.fd_maturity_date,
                compounding=holding.fd_compounding,
            )

        latest_price: LatestPrice | None = None
        market_price: Decimal | None = None
        if (
            holding.asset_id is not None
            and holding.valuation_mode in {"market", "benchmark"}
        ):
            if price_map is not None and holding.asset_id in price_map:
                latest_price = price_map[holding.asset_id]
            else:
                latest_price = MarketDataService(self.db).get_latest_price(
                    holding.asset_id,
                    allow_network=False,
                )
            if latest_price is not None and latest_price.price is not None:
                market_price = latest_price.price

        valuation = holding_valuation_snapshot(
            valuation_mode=holding.valuation_mode,
            total_invested=holding.total_invested,
            manual_current_value=holding.manual_current_value,
            fd_estimate=fd_estimate,
            market_price=market_price,
            quantity=holding.quantity,
        )

        valuation_status = self._valuation_status(
            has_current_valuation=valuation["has_current_valuation"],
            valuation_mode=holding.valuation_mode,
            value_source=valuation["value_source"],
            latest_price=latest_price,
        )

        return {
            "id": str(holding.id),
            "asset_id": str(holding.asset_id) if holding.asset_id else None,
            "asset_type": holding.asset_type,
            "display_name": holding.display_name,
            "symbol": holding.symbol,
            "quantity": units_to_str(holding.quantity) or "0.000000",
            "total_invested": money_to_str(holding.total_invested) or "0.00",
            "average_cost": units_to_str(holding.average_cost) or "0.000000",
            "valuation_mode": holding.valuation_mode,
            "valuation_status": valuation_status,
            "manual_current_value": money_to_str(holding.manual_current_value),
            "manual_value_updated_at": holding.manual_value_updated_at.isoformat()
            if holding.manual_value_updated_at
            else None,
            "current_value": valuation["current_value"],
            "absolute_gain_loss": valuation["absolute_gain_loss"],
            "return_pct": valuation["return_pct"],
            "value_source": valuation["value_source"],
            "has_current_valuation": valuation["has_current_valuation"],
            "latest_price": money_to_str(latest_price.price)
            if latest_price and latest_price.price is not None
            else None,
            "price_timestamp": latest_price.price_timestamp.isoformat()
            if latest_price and latest_price.price_timestamp
            else None,
            "price_fetched_at": latest_price.fetched_at.isoformat()
            if latest_price and latest_price.fetched_at
            else None,
            "price_status": str(latest_price.status)
            if latest_price and holding.valuation_mode in {"market", "benchmark"}
            else None,
            "status": holding.status,
            "gold_unit": holding.gold_unit,
            "fd_principal": money_to_str(holding.fd_principal),
            "fd_interest_rate": money_to_str(holding.fd_interest_rate),
            "fd_start_date": holding.fd_start_date.isoformat() if holding.fd_start_date else None,
            "fd_maturity_date": holding.fd_maturity_date.isoformat()
            if holding.fd_maturity_date
            else None,
            "fd_compounding": holding.fd_compounding,
            "estimated_current_value": money_to_str(fd_estimate["estimated_current_value"])
            if fd_estimate
            else None,
            "maturity_value": money_to_str(fd_estimate["maturity_value"]) if fd_estimate else None,
            "accrued_interest": money_to_str(fd_estimate["accrued_interest"]) if fd_estimate else None,
            "created_at": holding.created_at.isoformat(),
            "updated_at": holding.updated_at.isoformat(),
        }

    def _history_item_to_dict(self, transaction: InvestmentTransaction) -> dict[str, Any]:
        holding = transaction.holding
        return {
            "id": str(transaction.id),
            "holding_id": str(transaction.holding_id),
            "asset_id": str(transaction.asset_id) if transaction.asset_id else None,
            "asset_type": holding.asset_type if holding else "",
            "display_name": holding.display_name if holding else "",
            "symbol": holding.symbol if holding else None,
            "transaction_type": transaction.transaction_type,
            "quantity": units_to_str(transaction.quantity),
            "unit_price": units_to_str(transaction.unit_price),
            "amount": money_to_str(transaction.amount) or "0.00",
            "traded_on": transaction.traded_on.isoformat(),
            "notes": transaction.notes,
            "created_at": transaction.created_at.isoformat(),
        }

    @staticmethod
    def _valuation_status(
        *,
        has_current_valuation: bool,
        valuation_mode: str,
        value_source: str | None,
        latest_price: LatestPrice | None = None,
    ) -> str:
        if valuation_mode in {"market", "benchmark"}:
            if latest_price is not None and latest_price.price is not None:
                if latest_price.status == PriceStatus.STALE:
                    return "stale"
                if latest_price.status == PriceStatus.FRESH:
                    return "fresh"
                return "stale"
            return "unavailable"
        if not has_current_valuation:
            return "unavailable"
        if value_source == "estimated" or valuation_mode == "deterministic":
            return "deterministic"
        if value_source == "manual" or valuation_mode == "manual":
            return "manual"
        if value_source == "benchmark" or valuation_mode == "benchmark":
            return "benchmark"
        return "unavailable"

    @staticmethod
    def _resolve_pagination(limit: int | None, offset: int | None) -> tuple[int, int]:
        page_limit = DEFAULT_PAGE_LIMIT if limit is None else limit
        page_offset = 0 if offset is None else offset
        if page_limit < 1 or page_limit > MAX_PAGE_LIMIT:
            raise AppError(
                "VALIDATION_ERROR",
                f"limit must be between 1 and {MAX_PAGE_LIMIT}",
                status_code=400,
            )
        if page_offset < 0:
            raise AppError("VALIDATION_ERROR", "offset must be >= 0", status_code=400)
        return page_limit, page_offset

    @staticmethod
    def _asset_to_dict(asset: Any, *, include_provider: bool) -> dict[str, Any]:
        payload = {
            "id": str(asset.id),
            "name": asset.name,
            "symbol": asset.symbol,
            "exchange": asset.exchange,
            "asset_type": asset.asset_type,
            "isin": asset.isin,
            "active": asset.active,
        }
        if include_provider:
            payload["provider_symbol"] = asset.provider_symbol
        return payload

    @staticmethod
    def _optional_searchable_asset_type(asset_type: str | None) -> str | None:
        if asset_type is None:
            return None
        if asset_type not in SEARCHABLE_ASSET_TYPES:
            raise AppError(
                "VALIDATION_ERROR",
                "type must be one of: stock, mutual_fund, etf",
                status_code=400,
            )
        return asset_type

    @staticmethod
    def _optional_asset_type(asset_type: str | None) -> str | None:
        if asset_type is None:
            return None
        if asset_type not in ASSET_TYPES:
            raise AppError("VALIDATION_ERROR", "Invalid asset_type", status_code=400)
        return asset_type

    @staticmethod
    def _optional_status(status: str | None) -> str | None:
        if status is None:
            return None
        if status not in HOLDING_STATUSES:
            raise AppError("VALIDATION_ERROR", "Invalid status", status_code=400)
        return status

    @staticmethod
    def _optional_transaction_type(transaction_type: str | None) -> str | None:
        if transaction_type is None:
            return None
        if transaction_type not in TRANSACTION_TYPES_I1:
            raise AppError("VALIDATION_ERROR", "Invalid transaction_type", status_code=400)
        return transaction_type

    @staticmethod
    def _validate_date_range(from_date: date | None, to_date: date | None) -> None:
        if from_date is not None and to_date is not None and from_date > to_date:
            raise AppError(
                "VALIDATION_ERROR",
                "from_date must be on or before to_date",
                status_code=400,
            )

    @staticmethod
    def _transaction_to_dict(transaction: InvestmentTransaction) -> dict[str, Any]:
        return {
            "id": str(transaction.id),
            "holding_id": str(transaction.holding_id),
            "asset_id": str(transaction.asset_id) if transaction.asset_id else None,
            "transaction_type": transaction.transaction_type,
            "quantity": units_to_str(transaction.quantity),
            "unit_price": units_to_str(transaction.unit_price),
            "amount": money_to_str(transaction.amount) or "0.00",
            "traded_on": transaction.traded_on.isoformat(),
            "notes": transaction.notes,
            "created_at": transaction.created_at.isoformat(),
        }

    @staticmethod
    def _parse_uuid(value: str | None, *, field: str) -> UUID:
        if not value:
            raise AppError("VALIDATION_ERROR", f"{field} is required", status_code=400)
        try:
            return UUID(str(value))
        except (ValueError, TypeError) as exc:
            raise AppError("VALIDATION_ERROR", f"Invalid {field}", status_code=400) from exc

    @staticmethod
    def _require_positive_units(value: str | Decimal | None, *, field: str) -> Decimal:
        if value is None:
            raise AppError("VALIDATION_ERROR", f"{field} is required", status_code=400)
        try:
            parsed = parse_units(value)
        except (InvalidOperation, ValueError) as exc:
            raise AppError("VALIDATION_ERROR", f"Invalid {field}", status_code=400) from exc
        if parsed <= 0:
            raise AppError("VALIDATION_ERROR", f"{field} must be greater than zero", status_code=400)
        return parsed

    @staticmethod
    def _require_positive_money(value: str | Decimal | None, *, field: str) -> Decimal:
        if value is None:
            raise AppError("VALIDATION_ERROR", f"{field} is required", status_code=400)
        try:
            parsed = parse_money(value)
        except (InvalidOperation, ValueError) as exc:
            raise AppError("VALIDATION_ERROR", f"Invalid {field}", status_code=400) from exc
        if parsed <= 0:
            raise AppError("VALIDATION_ERROR", f"{field} must be greater than zero", status_code=400)
        return quantize_money(parsed)

    @staticmethod
    def _require_non_negative_money(value: str | Decimal | None, *, field: str) -> Decimal:
        if value is None:
            raise AppError("VALIDATION_ERROR", f"{field} is required", status_code=400)
        try:
            parsed = parse_money(value)
        except (InvalidOperation, ValueError) as exc:
            raise AppError("VALIDATION_ERROR", f"Invalid {field}", status_code=400) from exc
        if parsed < 0:
            raise AppError("VALIDATION_ERROR", f"{field} cannot be negative", status_code=400)
        return quantize_money(parsed)

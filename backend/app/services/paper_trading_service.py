from __future__ import annotations

from datetime import datetime, time, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.market_data.providers.stock import StockMarketDataProvider
from app.market_data.types import LatestPrice, PriceStatus
from app.models.invest import Asset, PriceCache
from app.models.paper_trading import (
    PaperAccount,
    PaperCashLedgerEntry,
    PaperOrder,
    PaperPosition,
    PaperWatchlistItem,
)
from app.services.market_data_service import MarketDataService
from app.services.money_calculations import money_to_str, quantize_money

ZERO = Decimal("0.00")
QTY_QUANTUM = Decimal("0.000001")
IST = ZoneInfo("Asia/Kolkata")


def _quantity_str(value: Decimal) -> str:
    return format(value.quantize(QTY_QUANTUM, rounding=ROUND_HALF_UP), "f")


class PaperTradingService:
    """User-scoped virtual investing, isolated from real portfolio and banking data."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.market = MarketDataService(db)

    def get_account(self, user_id: UUID) -> dict[str, Any] | None:
        account = self._account(user_id)
        return self._portfolio_state(account) if account else None

    def create_account(self, user_id: UUID, starting_capital: Decimal) -> dict[str, Any]:
        existing = self._account(user_id)
        if existing:
            return self._portfolio_state(existing)
        capital = quantize_money(starting_capital)
        if capital < Decimal("1000.00"):
            raise AppError("INVALID_STARTING_CAPITAL", "Starting virtual capital must be at least ₹1,000.", 422)
        account = PaperAccount(
            user_id=user_id,
            starting_capital=capital,
            available_cash=capital,
        )
        self.db.add(account)
        self.db.flush()
        self.db.add(PaperCashLedgerEntry(
            account_id=account.id,
            entry_type="opening_capital",
            amount=capital,
            balance_after=capital,
            description="Starting virtual capital",
        ))
        self.db.commit()
        self.db.refresh(account)
        return self._portfolio_state(account)

    def get_portfolio(self, user_id: UUID) -> dict[str, Any]:
        return self._portfolio_state(self._require_account(user_id))

    def place_order(
        self,
        user_id: UUID,
        *,
        asset_id: UUID,
        side: str,
        quantity: Decimal,
        idempotency_key: UUID,
    ) -> dict[str, Any]:
        account = self._require_account(user_id, lock=True)
        key = str(idempotency_key)
        prior_order = self.db.query(PaperOrder).filter(
            PaperOrder.account_id == account.id,
            PaperOrder.idempotency_key == key,
        ).first()
        if prior_order:
            if prior_order.asset_id != asset_id or prior_order.side != side or prior_order.quantity != quantity:
                raise ConflictError("IDEMPOTENCY_KEY_REUSED", "This order key was already used for another order.")
            return {
                "order": self._order_to_dict(prior_order),
                "portfolio": self._portfolio_state(account),
            }

        asset = self.db.query(Asset).filter(Asset.id == asset_id, Asset.active.is_(True)).first()
        if asset is None:
            raise NotFoundError("INSTRUMENT_NOT_FOUND", "This instrument is no longer available.")
        if asset.asset_type not in {"stock", "etf"} or not asset.exchange:
            raise AppError("INSTRUMENT_NOT_TRADABLE", "Paper orders are available for NSE/BSE equities and ETFs only.", 422)
        if quantity <= 0:
            raise AppError("INVALID_QUANTITY", "Enter a quantity greater than zero.", 422)
        quantity = quantity.quantize(QTY_QUANTUM, rounding=ROUND_HALF_UP)
        if quantity <= 0:
            raise AppError("INVALID_QUANTITY", "Enter a quantity greater than zero.", 422)

        latest = self.market.get_latest_price(asset.id, allow_network=False)
        if latest.price is None or latest.status != PriceStatus.FRESH:
            raise ConflictError("QUOTE_UNAVAILABLE", "Refresh a current market quote before placing this paper order.")

        execution_price = latest.price
        gross_amount = quantize_money(execution_price * quantity)
        if gross_amount <= ZERO:
            raise AppError("ORDER_VALUE_TOO_SMALL", "This order is below the supported currency precision.", 422)
        # The simulator currently applies no brokerage or slippage. Both are explicit in the ticket.
        charges = ZERO
        position = self.db.query(PaperPosition).filter(
            PaperPosition.account_id == account.id,
            PaperPosition.asset_id == asset.id,
        ).with_for_update().first()
        if position is None:
            position = PaperPosition(account_id=account.id, asset_id=asset.id, quantity=ZERO, cost_basis=ZERO)
            self.db.add(position)
            self.db.flush()

        realised_pnl = ZERO
        if side == "buy":
            debit = gross_amount + charges
            if debit > account.available_cash:
                raise ConflictError("INSUFFICIENT_PAPER_CASH", "This order exceeds available virtual cash.")
            account.available_cash = quantize_money(account.available_cash - debit)
            position.quantity = (position.quantity + quantity).quantize(QTY_QUANTUM)
            position.cost_basis = quantize_money(position.cost_basis + debit)
            cash_entry_type = "buy"
            cash_delta = -debit
        elif side == "sell":
            if position.quantity < quantity:
                raise ConflictError("INSUFFICIENT_PAPER_POSITION", "You do not have enough units to sell.")
            cost_sold = position.cost_basis if quantity == position.quantity else quantize_money(
                position.cost_basis * quantity / position.quantity
            )
            proceeds = gross_amount - charges
            realised_pnl = quantize_money(proceeds - cost_sold)
            account.available_cash = quantize_money(account.available_cash + proceeds)
            position.quantity = (position.quantity - quantity).quantize(QTY_QUANTUM)
            position.cost_basis = ZERO if position.quantity == 0 else quantize_money(position.cost_basis - cost_sold)
            cash_entry_type = "sell"
            cash_delta = proceeds
        else:
            raise AppError("INVALID_ORDER_SIDE", "Choose Buy or Sell.", 422)

        order = PaperOrder(
            account_id=account.id,
            asset_id=asset.id,
            symbol=asset.symbol or "",
            instrument_name=asset.name,
            exchange=asset.exchange,
            side=side,
            quantity=quantity,
            execution_price=execution_price,
            gross_amount=gross_amount,
            charges=charges,
            realised_pnl=realised_pnl,
            status="filled",
            idempotency_key=key,
        )
        self.db.add(order)
        self.db.flush()
        self.db.add(PaperCashLedgerEntry(
            account_id=account.id,
            order_id=order.id,
            entry_type=cash_entry_type,
            amount=cash_delta,
            balance_after=account.available_cash,
            description=f"Paper {side} · {quantity} {asset.symbol or asset.name} @ {execution_price}",
        ))
        self.db.commit()
        self.db.refresh(order)
        return {"order": self._order_to_dict(order), "portfolio": self._portfolio_state(account)}

    def list_instruments(
        self,
        *,
        query: str | None = None,
        exchange: str | None = None,
        category: str | None = None,
        limit: int = 30,
        offset: int = 0,
    ) -> dict[str, Any]:
        base = self.db.query(Asset).filter(
            Asset.active.is_(True), Asset.asset_type.in_(("stock", "etf", "index"))
        )
        if exchange:
            base = base.filter(Asset.exchange == exchange.upper())
        if category == "index":
            base = base.filter(Asset.asset_type == "index")
        elif category == "equity":
            base = base.filter(Asset.asset_type.in_(("stock", "etf")))
        if query and query.strip():
            pattern = f"%{query.strip()}%"
            base = base.filter(or_(Asset.symbol.ilike(pattern), Asset.name.ilike(pattern), Asset.isin.ilike(pattern)))
        total = base.count()
        rows = base.order_by(Asset.asset_type.asc(), Asset.exchange.asc(), Asset.symbol.asc()).offset(offset).limit(limit).all()
        prices = self.market.get_latest_prices([asset.id for asset in rows], allow_network=False)
        return {
            "items": [self._instrument_to_dict(asset, prices.get(asset.id)) for asset in rows],
            "total": total,
            "limit": limit,
            "offset": offset,
            "source": "NSE official equity master sync + Vestor's curated BSE instruments; yfinance for market prices",
        }

    def get_instrument(self, asset_id: UUID) -> Asset:
        asset = self.db.query(Asset).filter(
            Asset.id == asset_id,
            Asset.active.is_(True),
            Asset.asset_type.in_(("stock", "etf", "index")),
        ).first()
        if asset is None:
            raise NotFoundError("INSTRUMENT_NOT_FOUND", "Instrument not found.")
        return asset

    def get_quote(self, asset_id: UUID) -> dict[str, Any]:
        asset = self.get_instrument(asset_id)
        return self._instrument_to_dict(asset, self.market.get_latest_price(asset.id, allow_network=False))

    def refresh_quote(self, asset_id: UUID) -> dict[str, Any]:
        asset = self.get_instrument(asset_id)
        quote = self.market.refresh_asset_price(asset.id)
        return self._instrument_to_dict(asset, quote)

    def get_candles(self, asset_id: UUID, range_key: str, interval: str | None) -> dict[str, Any]:
        asset = self.get_instrument(asset_id)
        range_settings = {
            "1D": {"period": "1d", "intervals": {"1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h"}, "default": "5m"},
            "1W": {"period": "5d", "intervals": {"5m", "15m", "30m", "60m", "90m", "1h", "1d"}, "default": "15m"},
            "1M": {"period": "1mo", "intervals": {"15m", "30m", "60m", "90m", "1h", "1d"}, "default": "1d"},
            "3M": {"period": "3mo", "intervals": {"60m", "90m", "1h", "1d", "1wk"}, "default": "1d"},
            "1Y": {"period": "1y", "intervals": {"1d", "5d", "1wk", "1mo"}, "default": "1d"},
        }
        config = range_settings.get(range_key)
        if config is None:
            raise AppError("INVALID_CHART_RANGE", "Choose a supported chart range.", 422)
        candle_interval = interval or str(config["default"])
        if candle_interval not in config["intervals"]:
            raise AppError("INVALID_CANDLE_INTERVAL", "This interval is not available for the selected range.", 422)
        if not asset.provider_symbol:
            raise AppError("MARKET_DATA_UNAVAILABLE", "This instrument has no configured historical data source.", 503)
        try:
            candles = StockMarketDataProvider().fetch_historical_candles(
                provider_symbol=asset.provider_symbol,
                period=str(config["period"]),
                interval=candle_interval,
            )
        except Exception as exc:
            raise AppError("MARKET_DATA_UNAVAILABLE", "Historical market data is currently unavailable from the configured provider.", 503) from exc
        if not candles:
            raise AppError("MARKET_DATA_UNAVAILABLE", "The provider returned no historical candles for this instrument and range.", 503)
        return {
            "asset_id": str(asset.id),
            "symbol": asset.symbol or "",
            "range": range_key,
            "interval": candle_interval,
            "source": "yfinance",
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "data_status": "provider_delayed_or_delayed_unknown",
            "candles": candles,
        }

    def list_watchlist(self, user_id: UUID) -> dict[str, Any]:
        account = self._require_account(user_id)
        items = self.db.query(PaperWatchlistItem).filter(
            PaperWatchlistItem.account_id == account.id
        ).order_by(PaperWatchlistItem.created_at.desc()).all()
        assets = [self.get_instrument(item.asset_id) for item in items]
        prices = self.market.get_latest_prices([asset.id for asset in assets], allow_network=False)
        return {"items": [self._instrument_to_dict(asset, prices.get(asset.id)) for asset in assets]}

    def add_watchlist_item(self, user_id: UUID, asset_id: UUID) -> dict[str, Any]:
        account = self._require_account(user_id)
        asset = self.get_instrument(asset_id)
        if asset.asset_type not in {"stock", "etf", "index"}:
            raise AppError("INSTRUMENT_NOT_WATCHABLE", "This instrument cannot be added to the watchlist.", 422)
        row = self.db.query(PaperWatchlistItem).filter_by(account_id=account.id, asset_id=asset.id).first()
        if row is None:
            self.db.add(PaperWatchlistItem(account_id=account.id, asset_id=asset.id))
            self.db.commit()
        return self.list_watchlist(user_id)

    def remove_watchlist_item(self, user_id: UUID, asset_id: UUID) -> dict[str, Any]:
        account = self._require_account(user_id)
        self.db.query(PaperWatchlistItem).filter_by(account_id=account.id, asset_id=asset_id).delete()
        self.db.commit()
        return self.list_watchlist(user_id)

    def list_orders(self, user_id: UUID, *, limit: int = 50, offset: int = 0) -> dict[str, Any]:
        account = self._require_account(user_id)
        query = self.db.query(PaperOrder).filter(PaperOrder.account_id == account.id)
        total = query.count()
        rows = query.order_by(PaperOrder.created_at.desc()).offset(offset).limit(limit).all()
        return {"items": [self._order_to_dict(row) for row in rows], "total": total, "limit": limit, "offset": offset}

    def get_movers(self, *, exchange: str | None = None, limit: int = 5) -> dict[str, Any]:
        rows = self.db.query(PriceCache, Asset).join(Asset, PriceCache.asset_id == Asset.id).filter(
            Asset.active.is_(True),
            Asset.asset_type.in_(("stock", "etf")),
            PriceCache.price.isnot(None),
            PriceCache.previous_close.isnot(None),
            PriceCache.previous_close > 0,
            PriceCache.status == PriceStatus.FRESH,
        )
        if exchange:
            rows = rows.filter(Asset.exchange == exchange.upper())
        quotes: list[tuple[Decimal, dict[str, Any]]] = []
        for cache, asset in rows.all():
            latest = self.market._with_freshness(self.market._from_row(cache, source="postgres"))
            if latest.status != PriceStatus.FRESH or latest.price is None or latest.previous_close is None:
                continue
            change = (latest.price - latest.previous_close) / latest.previous_close * Decimal("100")
            quotes.append((change, self._instrument_to_dict(asset, latest)))
        gainers = [row for _, row in sorted(quotes, key=lambda item: item[0], reverse=True) if Decimal(row["change_pct"] or "0") > 0][:limit]
        losers = [row for _, row in sorted(quotes, key=lambda item: item[0]) if Decimal(row["change_pct"] or "0") < 0][:limit]
        return {
            "source": "Cached yfinance quote snapshots; no exchange-wide live scan",
            "universe": "Fresh cached NSE/BSE stocks and ETFs only; other listings are omitted until a valid quote is cached.",
            "gainers": gainers,
            "losers": losers,
        }

    @staticmethod
    def market_status(exchange: str) -> dict[str, str]:
        now = datetime.now(IST)
        is_weekday = now.weekday() < 5
        local_time = now.time().replace(tzinfo=None)
        in_hours = time(9, 15) <= local_time <= time(15, 30)
        session = "within usual session hours" if is_weekday and in_hours else "outside usual session hours"
        return {
            "exchange": exchange.upper(),
            "session": session,
            "observed_at": now.isoformat(),
            "note": "Indicative weekday hours only; exchange holidays and special sessions are not checked.",
        }

    def _account(self, user_id: UUID, *, lock: bool = False) -> PaperAccount | None:
        query = self.db.query(PaperAccount).filter(PaperAccount.user_id == user_id)
        if lock:
            query = query.with_for_update()
        return query.first()

    def _require_account(self, user_id: UUID, *, lock: bool = False) -> PaperAccount:
        account = self._account(user_id, lock=lock)
        if account is None:
            raise NotFoundError("PAPER_ACCOUNT_NOT_FOUND", "Create a paper account before continuing.")
        return account

    def _portfolio_state(self, account: PaperAccount) -> dict[str, Any]:
        positions = self.db.query(PaperPosition, Asset).join(Asset, PaperPosition.asset_id == Asset.id).filter(
            PaperPosition.account_id == account.id, PaperPosition.quantity > 0
        ).order_by(Asset.symbol.asc()).all()
        prices = self.market.get_latest_prices([asset.id for _, asset in positions], allow_network=False)
        position_rows: list[dict[str, Any]] = []
        market_value = ZERO
        cost_basis = ZERO
        unrealised_pnl = ZERO
        unvalued = 0
        for position, asset in positions:
            cost_basis += position.cost_basis
            latest = prices.get(asset.id)
            current_value = latest.price * position.quantity if latest and latest.price is not None else None
            if current_value is None:
                unvalued += 1
                unrealised = None
            else:
                current_value = quantize_money(current_value)
                market_value += current_value
                unrealised = quantize_money(current_value - position.cost_basis)
                unrealised_pnl += unrealised
            position_rows.append({
                "asset_id": str(asset.id),
                "symbol": asset.symbol or "",
                "name": asset.name,
                "exchange": asset.exchange or "",
                "quantity": _quantity_str(position.quantity),
                "average_cost": str((position.cost_basis / position.quantity).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)),
                "cost_basis": money_to_str(position.cost_basis) or "0.00",
                "current_price": str(latest.price) if latest and latest.price is not None else None,
                "market_value": money_to_str(current_value),
                "unrealised_pnl": money_to_str(unrealised),
                "price_status": str(latest.status) if latest else "unavailable",
                "price_timestamp": latest.price_timestamp.isoformat() if latest and latest.price_timestamp else None,
            })

        cost_basis = quantize_money(cost_basis)
        market_value = quantize_money(market_value)
        fully_valued = unvalued == 0
        equity = quantize_money(account.available_cash + market_value) if fully_valued else None
        unrealised_value = quantize_money(unrealised_pnl) if fully_valued else None
        realised_value = quantize_money(sum((row[0] for row in self.db.query(PaperOrder.realised_pnl).filter(
            PaperOrder.account_id == account.id,
        ).all()), ZERO))
        total_pnl = quantize_money(equity - account.starting_capital) if equity is not None else None
        return {
            "account_id": str(account.id),
            "summary": {
                "starting_capital": money_to_str(account.starting_capital) or "0.00",
                "available_cash": money_to_str(account.available_cash) or "0.00",
                "invested_cost_basis": money_to_str(cost_basis) or "0.00",
                "current_market_value": money_to_str(market_value) if fully_valued else None,
                "portfolio_equity": money_to_str(equity),
                "realised_pnl": money_to_str(realised_value) or "0.00",
                "unrealised_pnl": money_to_str(unrealised_value),
                "total_pnl": money_to_str(total_pnl),
                "net_deposits_withdrawals": "0.00",
                "valuation_complete": fully_valued,
                "unvalued_positions": unvalued,
            },
            "positions": position_rows,
        }

    @staticmethod
    def _instrument_to_dict(asset: Asset, latest: LatestPrice | None) -> dict[str, Any]:
        price = latest.price if latest else None
        previous = latest.previous_close if latest else None
        change = ((price - previous) / previous * Decimal("100")) if price is not None and previous is not None and previous > 0 else None
        return {
            "id": str(asset.id),
            "symbol": asset.symbol or "",
            "name": asset.name,
            "exchange": asset.exchange or "",
            "instrument_type": asset.asset_type,
            "isin": asset.isin,
            "provider_symbol": asset.provider_symbol,
            "price": str(price) if price is not None else None,
            "previous_close": str(previous) if previous is not None else None,
            "change_pct": str(change.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)) if change is not None else None,
            "price_status": str(latest.status) if latest else "unavailable",
            "price_timestamp": latest.price_timestamp.isoformat() if latest and latest.price_timestamp else None,
            "fetched_at": latest.fetched_at.isoformat() if latest and latest.fetched_at else None,
        }

    @staticmethod
    def _order_to_dict(order: PaperOrder) -> dict[str, Any]:
        return {
            "id": str(order.id),
            "asset_id": str(order.asset_id),
            "symbol": order.symbol,
            "instrument_name": order.instrument_name,
            "exchange": order.exchange,
            "side": order.side,
            "quantity": _quantity_str(order.quantity),
            "execution_price": str(order.execution_price),
            "gross_amount": money_to_str(order.gross_amount) or "0.00",
            "charges": money_to_str(order.charges) or "0.00",
            "realised_pnl": money_to_str(order.realised_pnl) or "0.00",
            "status": order.status,
            "created_at": order.created_at.isoformat() if order.created_at else datetime.now(timezone.utc).isoformat(),
        }

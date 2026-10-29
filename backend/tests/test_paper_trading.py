from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import patch
from uuid import uuid4

from sqlalchemy.orm import Session

from app.market_data.types import PriceStatus
from app.models.invest import Asset
from app.repositories.price_cache_repository import PriceCacheRepository
from tests.conftest import auth_headers


def _asset_with_quote(db: Session) -> Asset:
    asset = Asset(
        asset_type="stock",
        symbol=f"PAPER{uuid4().hex[:6].upper()}",
        exchange="NSE",
        name="Paper Trading Test Ltd",
        provider_symbol="PAPERTEST.NS",
        active=True,
        metadata_json={},
    )
    db.add(asset)
    db.flush()
    now = datetime.now(timezone.utc)
    PriceCacheRepository(db).upsert(
        asset_id=asset.id,
        provider="yfinance",
        provider_symbol=asset.provider_symbol or "PAPERTEST.NS",
        price=Decimal("100.00"),
        previous_close=Decimal("98.00"),
        currency="INR",
        price_timestamp=now,
        fetched_at=now,
        status=PriceStatus.FRESH,
        error_message=None,
    )
    db.commit()
    db.refresh(asset)
    return asset


def test_paper_account_buy_sell_idempotency_and_persistence(client, db: Session):
    headers = auth_headers(db)
    asset = _asset_with_quote(db)

    created = client.post(
        "/api/v1/paper-trading/account",
        json={"starting_capital": "10000.00"},
        headers=headers,
    )
    assert created.status_code == 201, created.text
    assert created.json()["summary"]["available_cash"] == "10000.00"

    key = str(uuid4())
    buy_payload = {
        "asset_id": str(asset.id),
        "side": "buy",
        "quantity": "10",
        "idempotency_key": key,
    }
    bought = client.post("/api/v1/paper-trading/orders", json=buy_payload, headers=headers)
    assert bought.status_code == 201, bought.text
    assert bought.json()["order"]["gross_amount"] == "1000.00"
    assert bought.json()["portfolio"]["summary"]["available_cash"] == "9000.00"

    # Retrying a submitted request returns the original fill and does not double debit cash.
    retried = client.post("/api/v1/paper-trading/orders", json=buy_payload, headers=headers)
    assert retried.status_code == 201, retried.text
    assert retried.json()["order"]["id"] == bought.json()["order"]["id"]
    assert retried.json()["portfolio"]["summary"]["available_cash"] == "9000.00"

    sold = client.post(
        "/api/v1/paper-trading/orders",
        json={
            "asset_id": str(asset.id),
            "side": "sell",
            "quantity": "4",
            "idempotency_key": str(uuid4()),
        },
        headers=headers,
    )
    assert sold.status_code == 201, sold.text
    assert sold.json()["portfolio"]["summary"]["available_cash"] == "9400.00"
    assert sold.json()["portfolio"]["positions"][0]["quantity"] == "6.000000"
    assert sold.json()["order"]["realised_pnl"] == "0.00"

    # A fresh API read confirms the ledger and holdings survived request boundaries.
    persisted = client.get("/api/v1/paper-trading/portfolio", headers=headers)
    assert persisted.status_code == 200, persisted.text
    assert persisted.json()["summary"]["available_cash"] == "9400.00"
    orders = client.get("/api/v1/paper-trading/orders", headers=headers)
    assert orders.status_code == 200, orders.text
    assert orders.json()["total"] == 2


def test_paper_account_is_user_scoped(client, db: Session):
    first_headers = auth_headers(db)
    second_headers = auth_headers(db)
    first = client.post(
        "/api/v1/paper-trading/account",
        json={"starting_capital": "1000"},
        headers=first_headers,
    )
    second = client.get("/api/v1/paper-trading/account", headers=second_headers)
    assert first.status_code == 201
    assert second.status_code == 200
    assert second.json() is None


def test_instrument_search_and_provider_candles(client, db: Session):
    headers = auth_headers(db)
    asset = _asset_with_quote(db)

    search = client.get(
        "/api/v1/paper-trading/instruments",
        params={"q": asset.symbol, "exchange": "NSE", "category": "equity"},
        headers=headers,
    )
    assert search.status_code == 200, search.text
    assert any(item["id"] == str(asset.id) for item in search.json()["items"])

    provider_candles = [{
        "time": "2026-10-29T09:15:00+05:30",
        "open": "99.00",
        "high": "101.00",
        "low": "98.00",
        "close": "100.00",
        "volume": 1200,
    }]
    with patch(
        "app.services.paper_trading_service.StockMarketDataProvider.fetch_historical_candles",
        return_value=provider_candles,
    ) as fetch:
        candles = client.get(
            f"/api/v1/paper-trading/instruments/{asset.id}/candles",
            params={"range": "1D", "interval": "5m"},
            headers=headers,
        )
    assert candles.status_code == 200, candles.text
    assert candles.json()["source"] == "yfinance"
    assert candles.json()["candles"] == provider_candles
    fetch.assert_called_once_with(provider_symbol=asset.provider_symbol, period="1d", interval="5m")

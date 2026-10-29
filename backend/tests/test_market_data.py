"""I4 market-data tests — all providers mocked; no live network calls."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from app.market_data.providers.mutual_fund import MutualFundMarketDataProvider
from app.market_data.providers.stock import StockMarketDataProvider
from app.market_data.types import LatestPrice, PriceStatus, ProviderPriceResult
from app.models.invest import Asset
from app.services.invest_calculations import compute_gain_loss, compute_return_pct, holding_valuation_snapshot
from app.services.market_data_service import MarketDataService
from tests.conftest import auth_headers


def _stock_asset(db: Session, *, symbol: str = "HDFCBANK") -> Asset:
    existing = (
        db.query(Asset)
        .filter(Asset.symbol == symbol, Asset.exchange == "NSE")
        .first()
    )
    if existing is not None:
        return existing
    asset = Asset(
        asset_type="stock",
        symbol=symbol,
        exchange="NSE",
        name=f"{symbol} Ltd",
        provider_symbol=f"{symbol}.NS",
        active=True,
        metadata_json={},
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def _mf_asset(db: Session) -> Asset:
    existing = (
        db.query(Asset)
        .filter(Asset.asset_type == "mutual_fund", Asset.provider_symbol == "122639")
        .first()
    )
    if existing is not None:
        return existing
    asset = Asset(
        asset_type="mutual_fund",
        symbol="PPFAS-FLEXI-DG",
        exchange=None,
        name="Parag Parikh Flexi Cap Fund - Direct Growth",
        provider_symbol="122639",
        active=True,
        metadata_json={},
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


# ---------------------------------------------------------------------------
# Providers (mocked)
# ---------------------------------------------------------------------------


def test_stock_provider_parses_valid_price():
    provider = StockMarketDataProvider()
    ticker = MagicMock()
    ticker.fast_info = MagicMock(last_price=450.25)
    with patch("yfinance.Ticker", return_value=ticker):
        result = provider.fetch_latest_price(asset_id=uuid4(), provider_symbol="HDFCBANK.NS")
    assert result.price == Decimal("450.25")
    assert isinstance(result.price, Decimal)
    assert result.status == PriceStatus.FRESH
    assert result.provider == "yfinance"


def test_stock_provider_handles_missing_price():
    provider = StockMarketDataProvider()
    ticker = MagicMock()
    ticker.fast_info = MagicMock(last_price=None)
    empty = MagicMock()
    empty.empty = True
    ticker.history.return_value = empty
    with patch("yfinance.Ticker", return_value=ticker):
        result = provider.fetch_latest_price(asset_id=uuid4(), provider_symbol="BAD.NS")
    assert result.price is None
    assert result.status == PriceStatus.UNAVAILABLE


def test_stock_provider_handles_exception():
    provider = StockMarketDataProvider()
    with patch("yfinance.Ticker", side_effect=RuntimeError("boom")):
        result = provider.fetch_latest_price(asset_id=uuid4(), provider_symbol="HDFCBANK.NS")
    assert result.price is None
    assert result.status == PriceStatus.ERROR


def test_mf_provider_parses_valid_nav():
    provider = MutualFundMarketDataProvider()
    response = MagicMock()
    response.status_code = 200
    response.raise_for_status = MagicMock()
    response.json.return_value = {
        "status": "success",
        "data": [{"date": "08-08-2026", "nav": "78.4321"}],
    }
    client = MagicMock()
    client.__enter__.return_value = client
    client.get.return_value = response
    with patch("httpx.Client", return_value=client):
        result = provider.fetch_latest_price(asset_id=uuid4(), provider_symbol="122639")
    assert result.price == Decimal("78.4321")
    assert isinstance(result.price, Decimal)
    assert result.status == PriceStatus.FRESH
    assert result.provider == "mfapi"
    assert result.price_timestamp is not None


def test_mf_provider_invalid_scheme():
    provider = MutualFundMarketDataProvider()
    result = provider.fetch_latest_price(asset_id=uuid4(), provider_symbol="NOT-A-CODE")
    assert result.price is None
    assert result.status == PriceStatus.ERROR


def test_mf_provider_failure():
    provider = MutualFundMarketDataProvider()
    client = MagicMock()
    client.__enter__.return_value = client
    client.get.side_effect = RuntimeError("network")
    with patch("httpx.Client", return_value=client):
        result = provider.fetch_latest_price(asset_id=uuid4(), provider_symbol="122639")
    assert result.price is None
    assert result.status == PriceStatus.ERROR


# ---------------------------------------------------------------------------
# Cache + service
# ---------------------------------------------------------------------------


def test_price_cache_stores_successful_price(db: Session):
    asset = _stock_asset(db, symbol="CACHE1")
    service = MarketDataService(db)
    now = datetime.now(timezone.utc)
    fake = ProviderPriceResult(
        provider="yfinance",
        provider_symbol=asset.provider_symbol or "",
        price=Decimal("100.50"),
        currency="INR",
        price_timestamp=now,
        fetched_at=now,
        status=PriceStatus.FRESH,
    )
    with patch.object(
        MarketDataService,
        "_fetch_and_persist",
        wraps=service._fetch_and_persist,
    ):
        with patch(
            "app.market_data.providers.stock.StockMarketDataProvider.fetch_latest_price",
            return_value=fake,
        ):
            with patch("app.services.market_data_service.redis_set_price") as redis_set:
                with patch("app.services.market_data_service.redis_get_price", return_value=None):
                    result = service.get_latest_price(asset.id, allow_network=True, force_refresh=True)
    assert result.price == Decimal("100.50")
    row = service.repo.get_by_asset_id(asset.id)
    assert row is not None
    assert row.price == Decimal("100.50")
    assert row.status == "fresh"
    redis_set.assert_called()


def test_redis_cache_hit_avoids_provider(db: Session):
    asset = _stock_asset(db, symbol="REDIS1")
    now = datetime.now(timezone.utc)
    cached = LatestPrice(
        asset_id=asset.id,
        provider="yfinance",
        provider_symbol=asset.provider_symbol,
        price=Decimal("210.00"),
        currency="INR",
        price_timestamp=now,
        fetched_at=now,
        status=PriceStatus.FRESH,
        source="redis",
    )
    service = MarketDataService(db)
    with patch("app.services.market_data_service.redis_get_price", return_value=cached):
        with patch(
            "app.market_data.providers.stock.StockMarketDataProvider.fetch_latest_price"
        ) as fetch:
            result = service.get_latest_price(asset.id, allow_network=True)
    assert result.price == Decimal("210.00")
    assert result.source == "redis"
    fetch.assert_not_called()


def test_postgres_cache_supplies_latest_price(db: Session):
    asset = _stock_asset(db, symbol="PG1")
    service = MarketDataService(db)
    now = datetime.now(timezone.utc)
    service.repo.upsert(
        asset_id=asset.id,
        provider="yfinance",
        provider_symbol=asset.provider_symbol or "PG1.NS",
        price=Decimal("333.00"),
        currency="INR",
        price_timestamp=now,
        fetched_at=now,
        status=PriceStatus.FRESH,
        error_message=None,
    )
    db.commit()
    with patch("app.services.market_data_service.redis_get_price", return_value=None):
        with patch("app.services.market_data_service.redis_set_price"):
            result = service.get_latest_price(asset.id, allow_network=False)
    assert result.price == Decimal("333.00")
    assert result.source == "postgres"


def test_stale_cached_price_identified(db: Session):
    asset = _stock_asset(db, symbol="STALE1")
    service = MarketDataService(db)
    old = datetime.now(timezone.utc) - timedelta(hours=5)
    service.repo.upsert(
        asset_id=asset.id,
        provider="yfinance",
        provider_symbol=asset.provider_symbol or "STALE1.NS",
        price=Decimal("450.00"),
        currency="INR",
        price_timestamp=old,
        fetched_at=old,
        status=PriceStatus.FRESH,
        error_message=None,
    )
    db.commit()
    with patch("app.services.market_data_service.redis_get_price", return_value=None):
        with patch("app.services.market_data_service.redis_set_price"):
            result = service.get_latest_price(asset.id, allow_network=False)
    assert result.price == Decimal("450.00")
    assert result.status == PriceStatus.STALE


def test_provider_failure_preserves_last_known_price(db: Session):
    asset = _stock_asset(db, symbol="KEEP1")
    service = MarketDataService(db)
    now = datetime.now(timezone.utc)
    service.repo.upsert(
        asset_id=asset.id,
        provider="yfinance",
        provider_symbol=asset.provider_symbol or "KEEP1.NS",
        price=Decimal("450.00"),
        currency="INR",
        price_timestamp=now - timedelta(days=1),
        fetched_at=now - timedelta(days=1),
        status=PriceStatus.FRESH,
        error_message=None,
    )
    db.commit()
    failed = ProviderPriceResult(
        provider="yfinance",
        provider_symbol=asset.provider_symbol or "",
        price=None,
        currency="INR",
        price_timestamp=None,
        fetched_at=now,
        status=PriceStatus.ERROR,
        error_message="Provider error",
    )
    with patch(
        "app.market_data.providers.stock.StockMarketDataProvider.fetch_latest_price",
        return_value=failed,
    ):
        with patch("app.services.market_data_service.redis_set_price"):
            with patch("app.services.market_data_service.redis_get_price", return_value=None):
                result = service.get_latest_price(asset.id, allow_network=True, force_refresh=True)
    assert result.price == Decimal("450.00")
    assert result.status == PriceStatus.STALE


def test_no_previous_price_provider_failure_unavailable(db: Session):
    asset = _stock_asset(db, symbol="NOPRIOR")
    service = MarketDataService(db)
    now = datetime.now(timezone.utc)
    failed = ProviderPriceResult(
        provider="yfinance",
        provider_symbol=asset.provider_symbol or "",
        price=None,
        currency="INR",
        price_timestamp=None,
        fetched_at=now,
        status=PriceStatus.ERROR,
        error_message="Provider error",
    )
    with patch(
        "app.market_data.providers.stock.StockMarketDataProvider.fetch_latest_price",
        return_value=failed,
    ):
        with patch("app.services.market_data_service.redis_set_price"):
            with patch("app.services.market_data_service.redis_get_price", return_value=None):
                result = service.get_latest_price(asset.id, allow_network=True, force_refresh=True)
    assert result.price is None
    assert result.status in {PriceStatus.ERROR, PriceStatus.UNAVAILABLE}


def test_celery_refresh_continues_when_one_asset_fails(db: Session):
    a = _stock_asset(db, symbol="OKA")
    b = _stock_asset(db, symbol="FAILB")
    service = MarketDataService(db)
    now = datetime.now(timezone.utc)

    def fake_refresh(asset_id):
        if asset_id == b.id:
            raise RuntimeError("boom")
        return LatestPrice(
            asset_id=asset_id,
            provider="yfinance",
            provider_symbol="X",
            price=Decimal("1.00"),
            currency="INR",
            price_timestamp=now,
            fetched_at=now,
            status=PriceStatus.FRESH,
            source="provider",
        )

    with patch.object(service, "list_refreshable_assets_override", create=True):
        with patch.object(
            service.repo,
            "list_refreshable_assets",
            return_value=[a, b],
        ):
            with patch.object(service, "refresh_asset_price", side_effect=fake_refresh):
                summary = service.refresh_all_market_prices()
    assert summary["ok"] == 1
    assert summary["failed"] == 1
    assert summary["total"] == 2


def test_holding_current_value_uses_latest_price(db: Session, client, user_headers):
    asset = _stock_asset(db, symbol="VAL1")
    service = MarketDataService(db)
    now = datetime.now(timezone.utc)
    service.repo.upsert(
        asset_id=asset.id,
        provider="yfinance",
        provider_symbol=asset.provider_symbol or "VAL1.NS",
        price=Decimal("500.00"),
        currency="INR",
        price_timestamp=now,
        fetched_at=now,
        status=PriceStatus.FRESH,
        error_message=None,
    )
    db.commit()
    buy = client.post(
        "/api/v1/invest/transactions",
        headers=user_headers,
        json={
            "asset_type": "stock",
            "asset_id": str(asset.id),
            "quantity": "10",
            "unit_price": "420.00",
            "traded_on": "2026-08-01",
        },
    )
    assert buy.status_code == 201, buy.text
    with patch("app.services.market_data_service.redis_get_price", return_value=None):
        with patch("app.services.market_data_service.redis_set_price"):
            summary = client.get("/api/v1/invest/summary", headers=user_headers)
    body = summary.json()
    assert body["current_value"] == "5000.00"
    assert body["absolute_gain_loss"] == "800.00"
    assert body["return_pct"] == "19.05"
    assert body["valuation_complete"] is True
    assert body["fresh_holdings"] == 1


def test_gain_and_return_calculations():
    gain = compute_gain_loss(total_invested=Decimal("4200.00"), current_value=Decimal("5000.00"))
    ret = compute_return_pct(total_invested=Decimal("4200.00"), current_value=Decimal("5000.00"))
    assert gain == Decimal("800.00")
    assert ret == Decimal("19.05")
    snap = holding_valuation_snapshot(
        valuation_mode="market",
        total_invested=Decimal("4200.00"),
        market_price=Decimal("500.00"),
        quantity=Decimal("10"),
    )
    assert snap["current_value"] == "5000.00"
    assert snap["absolute_gain_loss"] == "800.00"


def test_mixed_fresh_stale_unavailable(db: Session, client, user_headers):
    fresh_asset = _stock_asset(db, symbol="MIXF")
    stale_asset = _stock_asset(db, symbol="MIXS")
    none_asset = _stock_asset(db, symbol="MIXN")
    service = MarketDataService(db)
    now = datetime.now(timezone.utc)
    service.repo.upsert(
        asset_id=fresh_asset.id,
        provider="yfinance",
        provider_symbol="MIXF.NS",
        price=Decimal("100.00"),
        currency="INR",
        price_timestamp=now,
        fetched_at=now,
        status=PriceStatus.FRESH,
        error_message=None,
    )
    service.repo.upsert(
        asset_id=stale_asset.id,
        provider="yfinance",
        provider_symbol="MIXS.NS",
        price=Decimal("200.00"),
        currency="INR",
        price_timestamp=now - timedelta(days=2),
        fetched_at=now - timedelta(days=2),
        status=PriceStatus.FRESH,
        error_message=None,
    )
    db.commit()

    for asset, qty, px in [
        (fresh_asset, "10", "90.00"),
        (stale_asset, "5", "180.00"),
        (none_asset, "2", "50.00"),
    ]:
        r = client.post(
            "/api/v1/invest/transactions",
            headers=user_headers,
            json={
                "asset_type": "stock",
                "asset_id": str(asset.id),
                "quantity": qty,
                "unit_price": px,
                "traded_on": "2026-08-01",
            },
        )
        assert r.status_code == 201, r.text

    with patch("app.services.market_data_service.redis_get_price", return_value=None):
        with patch("app.services.market_data_service.redis_set_price"):
            holdings = client.get("/api/v1/invest/holdings", headers=user_headers).json()["items"]
            summary = client.get("/api/v1/invest/summary", headers=user_headers).json()

    by_symbol = {h["symbol"]: h for h in holdings}
    assert by_symbol["MIXF"]["valuation_status"] == "fresh"
    assert by_symbol["MIXS"]["valuation_status"] == "stale"
    assert by_symbol["MIXN"]["valuation_status"] == "unavailable"
    # Incomplete portfolio total when any holding unvalued
    assert summary["valuation_complete"] is False
    assert summary["current_value"] is None
    assert summary["valued_holdings"] == 2
    assert summary["unvalued_holdings"] == 1


def test_user_isolation_with_prices(db: Session, client):
    asset = _stock_asset(db, symbol="ISOV")
    service = MarketDataService(db)
    now = datetime.now(timezone.utc)
    service.repo.upsert(
        asset_id=asset.id,
        provider="yfinance",
        provider_symbol="ISOV.NS",
        price=Decimal("100.00"),
        currency="INR",
        price_timestamp=now,
        fetched_at=now,
        status=PriceStatus.FRESH,
        error_message=None,
    )
    db.commit()
    headers_a = auth_headers(db, f"a-{uuid4().hex[:8]}@example.com")
    headers_b = auth_headers(db, f"b-{uuid4().hex[:8]}@example.com")
    buy = client.post(
        "/api/v1/invest/transactions",
        headers=headers_a,
        json={
            "asset_type": "stock",
            "asset_id": str(asset.id),
            "quantity": "1",
            "unit_price": "90.00",
            "traded_on": "2026-08-01",
        },
    )
    assert buy.status_code == 201
    with patch("app.services.market_data_service.redis_get_price", return_value=None):
        with patch("app.services.market_data_service.redis_set_price"):
            a = client.get("/api/v1/invest/summary", headers=headers_a).json()
            b = client.get("/api/v1/invest/summary", headers=headers_b).json()
    assert a["total_holdings"] == 1
    assert b["total_holdings"] == 0

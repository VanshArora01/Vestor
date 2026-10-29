"""I6 — daily portfolio snapshots and performance history API."""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from app.models.invest import Asset, PortfolioSnapshot
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.core.security import hash_password
from app.services.market_data_service import MarketDataService
from app.services.portfolio_snapshot_service import (
    SNAPSHOT_COMPLETE,
    SNAPSHOT_PARTIAL,
    SNAPSHOT_UNAVAILABLE,
    PortfolioSnapshotService,
)
from app.market_data.types import PriceStatus
from app.worker.celery_app import celery_app
from tests.conftest import auth_headers

pytestmark = pytest.mark.api


def _seed_stock(db: Session, symbol: str) -> Asset:
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


def _set_price(db: Session, asset: Asset, price: str, *, stale: bool = False) -> None:
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    fetched = now - timedelta(days=2) if stale else now
    MarketDataService(db).repo.upsert(
        asset_id=asset.id,
        provider="yfinance",
        provider_symbol=asset.provider_symbol or f"{asset.symbol}.NS",
        price=Decimal(price),
        currency="INR",
        price_timestamp=fetched,
        fetched_at=fetched,
        status=PriceStatus.FRESH,
        error_message=None,
    )
    db.commit()


def _buy(client, headers, asset_id: str, *, qty: str, price: str, traded_on: str):
    r = client.post(
        "/api/v1/invest/transactions",
        headers=headers,
        json={
            "asset_type": "stock",
            "asset_id": asset_id,
            "quantity": qty,
            "unit_price": price,
            "traded_on": traded_on,
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_snapshot_one_valued_holding(client, db: Session, user_headers):
    asset = _seed_stock(db, "SNAP1")
    _set_price(db, asset, "500.00")
    _buy(client, user_headers, str(asset.id), qty="10", price="420.00", traded_on="2026-08-01")

    # Resolve current user from JWT via /me
    me = client.get("/api/v1/auth/me", headers=user_headers).json()
    user = db.query(User).filter(User.email == me["email"]).one()

    result = PortfolioSnapshotService(db).create_snapshot_for_user(
        user, snapshot_date=date(2026, 8, 9)
    )
    assert result is not None
    assert result["total_invested"] == "4200.00"
    assert result["total_value"] == "5000.00"
    assert result["absolute_gain_loss"] == "800.00"
    assert result["return_pct"] == "19.05"
    assert result["valuation_status"] == SNAPSHOT_COMPLETE


def test_snapshot_multiple_holdings_aggregate(client, db: Session, user_headers):
    a1 = _seed_stock(db, "SNAPA")
    a2 = _seed_stock(db, "SNAPB")
    _set_price(db, a1, "100.00")
    _set_price(db, a2, "200.00")
    _buy(client, user_headers, str(a1.id), qty="10", price="90.00", traded_on="2026-08-01")
    _buy(client, user_headers, str(a2.id), qty="5", price="180.00", traded_on="2026-08-02")

    me = client.get("/api/v1/auth/me", headers=user_headers).json()
    user = db.query(User).filter(User.email == me["email"]).one()
    result = PortfolioSnapshotService(db).create_snapshot_for_user(
        user, snapshot_date=date(2026, 8, 9)
    )
    # invested 900 + 900 = 1800; value 1000 + 1000 = 2000; gain 200; return 11.11
    assert result["total_invested"] == "1800.00"
    assert result["total_value"] == "2000.00"
    assert result["absolute_gain_loss"] == "200.00"
    assert result["return_pct"] == "11.11"
    assert result["valuation_status"] == SNAPSHOT_COMPLETE


def test_unavailable_holding_no_fake_total(client, db: Session, user_headers):
    valued = _seed_stock(db, "SNAPV")
    missing = _seed_stock(db, "SNAPM")
    _set_price(db, valued, "100.00")
    _buy(client, user_headers, str(valued.id), qty="10", price="90.00", traded_on="2026-08-01")
    _buy(client, user_headers, str(missing.id), qty="2", price="50.00", traded_on="2026-08-01")

    me = client.get("/api/v1/auth/me", headers=user_headers).json()
    user = db.query(User).filter(User.email == me["email"]).one()
    result = PortfolioSnapshotService(db).create_snapshot_for_user(
        user, snapshot_date=date(2026, 8, 9)
    )
    assert result["valuation_status"] == SNAPSHOT_PARTIAL
    assert result["total_value"] is None
    assert result["absolute_gain_loss"] is None
    assert result["return_pct"] is None
    assert result["total_invested"] == "1000.00"
    assert result["valued_holdings"] == 1
    assert result["unvalued_holdings"] == 1


def test_all_unvalued_unavailable(client, db: Session, user_headers):
    asset = _seed_stock(db, "SNAPU")
    _buy(client, user_headers, str(asset.id), qty="10", price="90.00", traded_on="2026-08-01")
    me = client.get("/api/v1/auth/me", headers=user_headers).json()
    user = db.query(User).filter(User.email == me["email"]).one()
    result = PortfolioSnapshotService(db).create_snapshot_for_user(
        user, snapshot_date=date(2026, 8, 9)
    )
    assert result["valuation_status"] == SNAPSHOT_UNAVAILABLE
    assert result["total_value"] is None


def test_stale_price_still_values_complete(client, db: Session, user_headers):
    asset = _seed_stock(db, "SNAPS")
    _set_price(db, asset, "110.00", stale=True)
    _buy(client, user_headers, str(asset.id), qty="10", price="100.00", traded_on="2026-08-01")
    me = client.get("/api/v1/auth/me", headers=user_headers).json()
    user = db.query(User).filter(User.email == me["email"]).one()
    result = PortfolioSnapshotService(db).create_snapshot_for_user(
        user, snapshot_date=date(2026, 8, 9)
    )
    assert result["valuation_status"] == SNAPSHOT_COMPLETE
    assert result["total_value"] == "1100.00"


def test_empty_portfolio_skips_snapshot(db: Session):
    user = UserRepository(db).create(
        email=f"empty-{uuid4().hex[:8]}@example.com",
        password_hash=hash_password("password123"),
        name="Empty",
    )
    db.commit()
    result = PortfolioSnapshotService(db).create_snapshot_for_user(
        user, snapshot_date=date(2026, 8, 9)
    )
    assert result is None
    assert (
        db.query(PortfolioSnapshot)
        .filter(PortfolioSnapshot.user_id == user.id)
        .count()
        == 0
    )


def test_upsert_same_day_no_duplicate(client, db: Session, user_headers):
    asset = _seed_stock(db, "SNAPD")
    _set_price(db, asset, "100.00")
    _buy(client, user_headers, str(asset.id), qty="10", price="90.00", traded_on="2026-08-01")
    me = client.get("/api/v1/auth/me", headers=user_headers).json()
    user = db.query(User).filter(User.email == me["email"]).one()
    svc = PortfolioSnapshotService(db)
    day = date(2026, 8, 9)
    first = svc.create_snapshot_for_user(user, snapshot_date=day)
    _set_price(db, asset, "120.00")
    second = svc.create_snapshot_for_user(user, snapshot_date=day)
    assert first["id"] == second["id"]
    assert second["total_value"] == "1200.00"
    count = (
        db.query(PortfolioSnapshot)
        .filter(
            PortfolioSnapshot.user_id == user.id,
            PortfolioSnapshot.snapshot_date == day,
        )
        .count()
    )
    assert count == 1


def test_performance_api_filters_and_order(client, db: Session, user_headers):
    asset = _seed_stock(db, "SNAPH")
    _set_price(db, asset, "100.00")
    _buy(client, user_headers, str(asset.id), qty="10", price="90.00", traded_on="2026-08-01")
    me = client.get("/api/v1/auth/me", headers=user_headers).json()
    user = db.query(User).filter(User.email == me["email"]).one()
    svc = PortfolioSnapshotService(db)
    svc.create_snapshot_for_user(user, snapshot_date=date(2026, 8, 1))
    svc.create_snapshot_for_user(user, snapshot_date=date(2026, 8, 5))
    svc.create_snapshot_for_user(user, snapshot_date=date(2026, 8, 9))

    empty = client.get("/api/v1/invest/performance", headers=user_headers).json()
    assert len(empty["snapshots"]) == 3
    assert empty["snapshots"][0]["date"] == "2026-08-01"
    assert empty["snapshots"][-1]["date"] == "2026-08-09"

    ranged = client.get(
        "/api/v1/invest/performance?from_date=2026-08-05&to_date=2026-08-09",
        headers=user_headers,
    ).json()
    dates = [s["date"] for s in ranged["snapshots"]]
    assert dates == ["2026-08-05", "2026-08-09"]


def test_performance_user_isolation(client, db: Session):
    headers_a = auth_headers(db, f"a-{uuid4().hex[:8]}@example.com")
    headers_b = auth_headers(db, f"b-{uuid4().hex[:8]}@example.com")
    asset = _seed_stock(db, "SNAPISO")
    _set_price(db, asset, "100.00")
    _buy(client, headers_a, str(asset.id), qty="10", price="90.00", traded_on="2026-08-01")
    me = client.get("/api/v1/auth/me", headers=headers_a).json()
    user_a = db.query(User).filter(User.email == me["email"]).one()
    PortfolioSnapshotService(db).create_snapshot_for_user(
        user_a, snapshot_date=date(2026, 8, 9)
    )
    a = client.get("/api/v1/invest/performance", headers=headers_a).json()
    b = client.get("/api/v1/invest/performance", headers=headers_b).json()
    assert len(a["snapshots"]) == 1
    assert b["snapshots"] == []


def test_empty_history_clean(client, user_headers):
    body = client.get("/api/v1/invest/performance", headers=user_headers).json()
    assert body["snapshots"] == []
    assert body["from_date"] is None


def test_celery_task_isolates_user_failures(db: Session, client):
    headers_ok = auth_headers(db, f"ok-{uuid4().hex[:8]}@example.com")
    asset = _seed_stock(db, "SNAPCEL")
    _set_price(db, asset, "100.00")
    _buy(client, headers_ok, str(asset.id), qty="1", price="90.00", traded_on="2026-08-01")

    # Second user id that will fail inside create_snapshot_for_user
    bad_user = UserRepository(db).create(
        email=f"bad-{uuid4().hex[:8]}@example.com",
        password_hash=hash_password("password123"),
        name="Bad",
    )
    db.commit()
    # Give bad user an open holding so they are eligible
    from app.models.invest import PortfolioHolding

    db.add(
        PortfolioHolding(
            user_id=bad_user.id,
            asset_id=asset.id,
            asset_type="stock",
            display_name="Broken",
            symbol=asset.symbol,
            quantity=Decimal("1"),
            total_invested=Decimal("90.00"),
            average_cost=Decimal("90.00"),
            valuation_mode="market",
            status="open",
        )
    )
    db.commit()

    svc = PortfolioSnapshotService(db)
    original = svc.create_snapshot_for_user

    def flaky(user, *, snapshot_date=None):
        if user.id == bad_user.id:
            raise RuntimeError("boom")
        return original(user, snapshot_date=snapshot_date)

    svc.create_snapshot_for_user = flaky  # type: ignore[method-assign]
    # Patch list to only our two users for speed
    ok_me = client.get("/api/v1/auth/me", headers=headers_ok).json()
    ok_user = db.query(User).filter(User.email == ok_me["email"]).one()
    svc.repo.list_user_ids_with_open_holdings = lambda: [ok_user.id, bad_user.id]  # type: ignore

    summary = svc.create_daily_snapshots(snapshot_date=date(2026, 8, 9))
    assert summary["failed"] == 1
    assert summary["created"] + summary["updated"] >= 1


def test_celery_registers_snapshot_task():
    from app.worker import snapshot_tasks  # noqa: F401

    assert "vestor.create_daily_portfolio_snapshots" in celery_app.tasks
    assert "create-daily-portfolio-snapshots" in celery_app.conf.beat_schedule


def test_invalid_date_range(client, user_headers):
    r = client.get(
        "/api/v1/invest/performance?from_date=2026-08-10&to_date=2026-08-01",
        headers=user_headers,
    )
    assert r.status_code == 400

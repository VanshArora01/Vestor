from __future__ import annotations

from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.models.invest import Asset
from tests.conftest import auth_headers


def ensure_universe_visible(db: Session) -> Asset | None:
    """Return a seeded HDFCBANK asset if migration 006 data is visible."""
    return (
        db.query(Asset)
        .filter(Asset.symbol == "HDFCBANK", Asset.exchange == "NSE", Asset.active.is_(True))
        .first()
    )


def test_search_stock_by_exact_symbol(client, db: Session, user_headers):
    assert ensure_universe_visible(db) is not None
    response = client.get(
        "/api/v1/invest/assets/search?q=HDFCBANK&type=stock",
        headers=user_headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["total"] >= 1
    assert body["items"][0]["symbol"] == "HDFCBANK"
    assert body["items"][0]["name"] == "HDFC Bank Ltd"
    assert body["items"][0]["exchange"] == "NSE"


def test_search_stock_partial_name_case_insensitive(client, db: Session, user_headers):
    assert ensure_universe_visible(db) is not None
    lower = client.get("/api/v1/invest/assets/search?q=hdfc&type=stock", headers=user_headers)
    upper = client.get("/api/v1/invest/assets/search?q=HDFC&type=stock", headers=user_headers)
    assert lower.status_code == 200
    assert upper.status_code == 200
    assert lower.json()["total"] == upper.json()["total"]
    assert lower.json()["total"] >= 3
    symbols = {item["symbol"] for item in lower.json()["items"]}
    assert "HDFCBANK" in symbols
    assert "HDFCLIFE" in symbols


def test_search_mutual_fund_by_name(client, db: Session, user_headers):
    response = client.get(
        "/api/v1/invest/assets/search?q=parag%20parikh&type=mutual_fund",
        headers=user_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert all(item["asset_type"] == "mutual_fund" for item in body["items"])
    assert any("Parag Parikh" in item["name"] for item in body["items"])


def test_search_etf(client, db: Session, user_headers):
    response = client.get(
        "/api/v1/invest/assets/search?q=niftybees&type=etf",
        headers=user_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert body["items"][0]["symbol"] == "NIFTYBEES"
    assert body["items"][0]["asset_type"] == "etf"


def test_search_filter_by_exchange(client, db: Session, user_headers):
    response = client.get(
        "/api/v1/invest/assets/search?q=reliance&type=stock&exchange=BSE",
        headers=user_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert all(item["exchange"] == "BSE" for item in body["items"])


def test_search_excludes_inactive(client, db: Session, user_headers):
    response = client.get(
        "/api/v1/invest/assets/search?q=OLDCO",
        headers=user_headers,
    )
    assert response.status_code == 200
    assert response.json()["total"] == 0
    assert response.json()["items"] == []


def test_search_ranking_exact_symbol_first(client, db: Session, user_headers):
    response = client.get(
        "/api/v1/invest/assets/search?q=HDFCBANK&type=stock",
        headers=user_headers,
    )
    assert response.status_code == 200
    items = response.json()["items"]
    assert items[0]["symbol"] == "HDFCBANK"


def test_search_limit(client, db: Session, user_headers):
    response = client.get(
        "/api/v1/invest/assets/search?q=a&type=stock&limit=2",
        headers=user_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["limit"] == 2
    assert len(body["items"]) <= 2


def test_search_invalid_type(client, user_headers):
    response = client.get(
        "/api/v1/invest/assets/search?q=hdfc&type=gold",
        headers=user_headers,
    )
    assert response.status_code == 400


def test_search_empty_query(client, user_headers):
    response = client.get("/api/v1/invest/assets/search?q=", headers=user_headers)
    assert response.status_code == 422


def test_search_unknown_returns_empty(client, user_headers):
    response = client.get(
        "/api/v1/invest/assets/search?q=zzznomatchxyz",
        headers=user_headers,
    )
    assert response.status_code == 200
    assert response.json()["total"] == 0
    assert response.json()["items"] == []


def test_asset_detail_active(client, db: Session, user_headers):
    asset = ensure_universe_visible(db)
    assert asset is not None
    response = client.get(f"/api/v1/invest/assets/{asset.id}", headers=user_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["symbol"] == "HDFCBANK"
    assert body["provider_symbol"] == "HDFCBANK.NS"
    assert body["active"] is True


def test_asset_detail_inactive_not_found(client, db: Session, user_headers):
    inactive = (
        db.query(Asset)
        .filter(Asset.symbol == "OLDCO", Asset.active.is_(False))
        .first()
    )
    assert inactive is not None
    response = client.get(f"/api/v1/invest/assets/{inactive.id}", headers=user_headers)
    assert response.status_code == 404


def test_transaction_rejects_mismatched_asset_type(client, db: Session, user_headers):
    mf = (
        db.query(Asset)
        .filter(Asset.asset_type == "mutual_fund", Asset.active.is_(True))
        .first()
    )
    assert mf is not None
    response = client.post(
        "/api/v1/invest/transactions",
        headers=user_headers,
        json={
            "asset_type": "stock",
            "asset_id": str(mf.id),
            "quantity": "1",
            "unit_price": "100.00",
            "traded_on": "2026-08-09",
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "ASSET_TYPE_MISMATCH"


def test_transaction_rejects_nonexistent_asset(client, user_headers):
    response = client.post(
        "/api/v1/invest/transactions",
        headers=user_headers,
        json={
            "asset_type": "stock",
            "asset_id": str(uuid4()),
            "quantity": "1",
            "unit_price": "100.00",
            "traded_on": "2026-08-09",
        },
    )
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "ASSET_NOT_FOUND"


def test_transaction_rejects_inactive_asset(client, db: Session, user_headers):
    inactive = (
        db.query(Asset)
        .filter(Asset.symbol == "OLDCO", Asset.active.is_(False))
        .first()
    )
    assert inactive is not None
    response = client.post(
        "/api/v1/invest/transactions",
        headers=user_headers,
        json={
            "asset_type": "stock",
            "asset_id": str(inactive.id),
            "quantity": "1",
            "unit_price": "100.00",
            "traded_on": "2026-08-09",
        },
    )
    assert response.status_code == 404


def test_transaction_accepts_seeded_stock(client, db: Session, user_headers):
    asset = ensure_universe_visible(db)
    assert asset is not None
    response = client.post(
        "/api/v1/invest/transactions",
        headers=user_headers,
        json={
            "asset_type": "stock",
            "asset_id": str(asset.id),
            "quantity": "2",
            "unit_price": "1500.00",
            "traded_on": "2026-08-09",
        },
    )
    assert response.status_code == 201, response.text
    assert response.json()["holding"]["symbol"] == "HDFCBANK"
    assert response.json()["holding"]["total_invested"] == "3000.00"

from __future__ import annotations

from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.invest import Asset
from tests.conftest import auth_headers


def seed_stock_asset(db: Session, *, symbol: str = "HDFCBANK") -> Asset:
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


def buy_stock(client, headers, asset_id: str, *, quantity: str, unit_price: str, traded_on: str):
    response = client.post(
        "/api/v1/invest/transactions",
        headers=headers,
        json={
            "asset_type": "stock",
            "asset_id": asset_id,
            "quantity": quantity,
            "unit_price": unit_price,
            "traded_on": traded_on,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_summary_empty_portfolio(client, user_headers):
    response = client.get("/api/v1/invest/summary", headers=user_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total_invested"] == "0.00"
    assert body["current_value"] is None
    assert body["absolute_gain_loss"] is None
    assert body["return_pct"] is None
    assert body["total_holdings"] == 0
    assert body["total_transactions"] == 0
    assert body["valued_holdings"] == 0
    assert body["unvalued_holdings"] == 0
    assert body["valuation_complete"] is True


def test_summary_one_stock_no_market_price(client, db: Session, user_headers):
    asset = seed_stock_asset(db, symbol="SUM1")
    buy_stock(
        client,
        user_headers,
        str(asset.id),
        quantity="10",
        unit_price="420.00",
        traded_on="2026-08-01",
    )
    response = client.get("/api/v1/invest/summary", headers=user_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total_invested"] == "4200.00"
    assert body["current_value"] is None
    assert body["absolute_gain_loss"] is None
    assert body["return_pct"] is None
    assert body["total_holdings"] == 1
    assert body["total_transactions"] == 1
    assert body["valued_holdings"] == 0
    assert body["unvalued_holdings"] == 1
    assert body["valuation_complete"] is False


def test_summary_multiple_lots(client, db: Session, user_headers):
    asset = seed_stock_asset(db, symbol="SUM2")
    buy_stock(
        client,
        user_headers,
        str(asset.id),
        quantity="10",
        unit_price="420.00",
        traded_on="2026-08-01",
    )
    buy_stock(
        client,
        user_headers,
        str(asset.id),
        quantity="5",
        unit_price="450.00",
        traded_on="2026-08-05",
    )
    summary = client.get("/api/v1/invest/summary", headers=user_headers).json()
    assert summary["total_invested"] == "6450.00"
    assert summary["total_holdings"] == 1
    assert summary["total_transactions"] == 2
    assert summary["current_value"] is None

    holdings = client.get("/api/v1/invest/holdings", headers=user_headers).json()
    assert holdings["total"] == 1
    item = holdings["items"][0]
    assert item["quantity"] == "15.000000"
    assert item["total_invested"] == "6450.00"
    assert item["average_cost"] == "430.000000"
    assert item["current_value"] is None
    assert item["valuation_status"] == "unavailable"


def test_summary_fd_only_is_complete(client, user_headers):
    created = client.post(
        "/api/v1/invest/transactions",
        headers=user_headers,
        json={
            "asset_type": "fd",
            "display_name": "SBI FD",
            "fd_principal": "100000.00",
            "fd_interest_rate": "8.00",
            "fd_start_date": "2025-01-01",
            "fd_maturity_date": "2026-01-01",
            "fd_compounding": "quarterly",
            "traded_on": "2025-01-01",
        },
    )
    assert created.status_code == 201, created.text
    summary = client.get("/api/v1/invest/summary", headers=user_headers).json()
    assert summary["total_invested"] == "100000.00"
    assert summary["valued_holdings"] == 1
    assert summary["unvalued_holdings"] == 0
    assert summary["valuation_complete"] is True
    assert summary["current_value"] is not None
    assert summary["absolute_gain_loss"] is not None
    assert summary["return_pct"] is not None


def test_holdings_user_isolation(client, db: Session):
    asset = seed_stock_asset(db, symbol="ISO1")
    headers_a = auth_headers(db, f"a-{uuid4().hex[:8]}@example.com")
    headers_b = auth_headers(db, f"b-{uuid4().hex[:8]}@example.com")
    buy_stock(
        client,
        headers_a,
        str(asset.id),
        quantity="2",
        unit_price="100.00",
        traded_on="2026-08-01",
    )
    buy_stock(
        client,
        headers_b,
        str(asset.id),
        quantity="3",
        unit_price="110.00",
        traded_on="2026-08-01",
    )

    list_a = client.get("/api/v1/invest/holdings", headers=headers_a).json()
    list_b = client.get("/api/v1/invest/holdings", headers=headers_b).json()
    assert list_a["total"] == 1
    assert list_b["total"] == 1
    assert list_a["items"][0]["id"] != list_b["items"][0]["id"]
    assert list_a["items"][0]["quantity"] == "2.000000"
    assert list_b["items"][0]["quantity"] == "3.000000"


def test_holdings_asset_type_and_status_filters(client, db: Session, user_headers):
    asset = seed_stock_asset(db, symbol="FLT1")
    buy_stock(
        client,
        user_headers,
        str(asset.id),
        quantity="1",
        unit_price="100.00",
        traded_on="2026-08-01",
    )
    client.post(
        "/api/v1/invest/transactions",
        headers=user_headers,
        json={
            "asset_type": "ppf",
            "display_name": "PPF",
            "amount": "5000.00",
            "manual_current_value": "5100.00",
            "traded_on": "2026-08-02",
        },
    )

    stocks = client.get("/api/v1/invest/holdings?asset_type=stock", headers=user_headers)
    assert stocks.status_code == 200
    assert stocks.json()["total"] == 1
    assert stocks.json()["items"][0]["asset_type"] == "stock"

    open_only = client.get("/api/v1/invest/holdings?status=open", headers=user_headers)
    assert open_only.status_code == 200
    assert open_only.json()["total"] == 2

    bad = client.get("/api/v1/invest/holdings?asset_type=crypto", headers=user_headers)
    assert bad.status_code == 400


def test_holdings_pagination(client, db: Session, user_headers):
    for i in range(3):
        asset = seed_stock_asset(db, symbol=f"PG{i}{uuid4().hex[:4].upper()}")
        buy_stock(
            client,
            user_headers,
            str(asset.id),
            quantity="1",
            unit_price="100.00",
            traded_on="2026-08-01",
        )

    page1 = client.get("/api/v1/invest/holdings?limit=2&offset=0", headers=user_headers)
    assert page1.status_code == 200
    body1 = page1.json()
    assert body1["total"] == 3
    assert body1["limit"] == 2
    assert body1["offset"] == 0
    assert len(body1["items"]) == 2

    page2 = client.get("/api/v1/invest/holdings?limit=2&offset=2", headers=user_headers)
    body2 = page2.json()
    assert len(body2["items"]) == 1
    assert body2["offset"] == 2


def test_holding_detail_lots_ordered_newest_first(client, db: Session, user_headers):
    asset = seed_stock_asset(db, symbol="DET1")
    first = buy_stock(
        client,
        user_headers,
        str(asset.id),
        quantity="10",
        unit_price="420.00",
        traded_on="2026-08-01",
    )
    buy_stock(
        client,
        user_headers,
        str(asset.id),
        quantity="5",
        unit_price="450.00",
        traded_on="2026-08-05",
    )
    holding_id = first["holding"]["id"]
    detail = client.get(f"/api/v1/invest/holdings/{holding_id}", headers=user_headers)
    assert detail.status_code == 200
    body = detail.json()
    assert body["holding"]["quantity"] == "15.000000"
    assert len(body["transactions"]) == 2
    assert body["transactions"][0]["traded_on"] == "2026-08-05"
    assert body["transactions"][1]["traded_on"] == "2026-08-01"
    assert "transaction" not in body


def test_holding_detail_forbidden_cross_user(client, db: Session):
    asset = seed_stock_asset(db, symbol="DET2")
    headers_a = auth_headers(db, f"a-{uuid4().hex[:8]}@example.com")
    headers_b = auth_headers(db, f"b-{uuid4().hex[:8]}@example.com")
    created = buy_stock(
        client,
        headers_a,
        str(asset.id),
        quantity="1",
        unit_price="100.00",
        traded_on="2026-08-01",
    )
    holding_id = created["holding"]["id"]
    response = client.get(f"/api/v1/invest/holdings/{holding_id}", headers=headers_b)
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "HOLDING_NOT_FOUND"


def test_history_newest_first_filters_and_pagination(client, db: Session, user_headers):
    asset = seed_stock_asset(db, symbol="HIS1")
    buy_stock(
        client,
        user_headers,
        str(asset.id),
        quantity="1",
        unit_price="100.00",
        traded_on="2026-08-01",
    )
    buy_stock(
        client,
        user_headers,
        str(asset.id),
        quantity="2",
        unit_price="110.00",
        traded_on="2026-08-10",
    )
    client.post(
        "/api/v1/invest/transactions",
        headers=user_headers,
        json={
            "asset_type": "ppf",
            "display_name": "PPF A",
            "amount": "1000.00",
            "traded_on": "2026-08-05",
        },
    )

    history = client.get("/api/v1/invest/history", headers=user_headers)
    assert history.status_code == 200
    body = history.json()
    assert body["total"] == 3
    assert body["items"][0]["traded_on"] == "2026-08-10"
    assert body["items"][0]["display_name"].endswith("Ltd") or body["items"][0]["symbol"] == "HIS1"

    by_type = client.get("/api/v1/invest/history?asset_type=ppf", headers=user_headers).json()
    assert by_type["total"] == 1
    assert by_type["items"][0]["asset_type"] == "ppf"

    by_date = client.get(
        "/api/v1/invest/history?from_date=2026-08-05&to_date=2026-08-10",
        headers=user_headers,
    ).json()
    assert by_date["total"] == 2

    bad_range = client.get(
        "/api/v1/invest/history?from_date=2026-08-10&to_date=2026-08-01",
        headers=user_headers,
    )
    assert bad_range.status_code == 400

    page = client.get("/api/v1/invest/history?limit=1&offset=0", headers=user_headers).json()
    assert page["total"] == 3
    assert len(page["items"]) == 1


def test_history_user_isolation(client, db: Session):
    asset = seed_stock_asset(db, symbol="HIS2")
    headers_a = auth_headers(db, f"a-{uuid4().hex[:8]}@example.com")
    headers_b = auth_headers(db, f"b-{uuid4().hex[:8]}@example.com")
    buy_stock(
        client,
        headers_a,
        str(asset.id),
        quantity="1",
        unit_price="100.00",
        traded_on="2026-08-01",
    )
    history_b = client.get("/api/v1/invest/history", headers=headers_b).json()
    assert history_b["total"] == 0
    assert history_b["items"] == []


def test_export_csv_scoped_and_escaped(client, db: Session):
    asset = seed_stock_asset(db, symbol="CSV1")
    headers_a = auth_headers(db, f"a-{uuid4().hex[:8]}@example.com")
    headers_b = auth_headers(db, f"b-{uuid4().hex[:8]}@example.com")

    # Notes with comma and quote to verify CSV escaping
    response = client.post(
        "/api/v1/invest/transactions",
        headers=headers_a,
        json={
            "asset_type": "stock",
            "asset_id": str(asset.id),
            "quantity": "1",
            "unit_price": "100.00",
            "traded_on": "2026-08-01",
            "notes": 'Bought, "dip"',
        },
    )
    assert response.status_code == 201, response.text

    buy_stock(
        client,
        headers_b,
        str(asset.id),
        quantity="9",
        unit_price="200.00",
        traded_on="2026-08-02",
    )

    export_a = client.get("/api/v1/invest/export", headers=headers_a)
    assert export_a.status_code == 200
    assert "text/csv" in export_a.headers["content-type"]
    assert "vestor-investment-history.csv" in export_a.headers["content-disposition"]
    text = export_a.text
    assert "Date,Asset,Symbol,Asset Type,Transaction Type,Quantity,Unit Price,Amount,Notes" in text
    assert "CSV1" in text
    assert "100.000000" in text or "100.00" in text
    assert "200.00" not in text  # user B amount must not appear
    assert 'Bought, "dip"' in text or '"Bought, ""dip"""' in text

    export_b = client.get("/api/v1/invest/export", headers=headers_b)
    assert export_b.status_code == 200
    assert "1800.00" in export_b.text
    assert "Bought" not in export_b.text

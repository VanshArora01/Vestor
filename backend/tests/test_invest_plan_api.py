"""I5 — Money Plan vs Invest actual (read-only integration)."""

from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from app.models.invest import Asset
from app.services.invest_plan_calculations import (
    over_invested_amount,
    percentage_of_plan,
    plan_status,
    remaining_amount,
)
from app.services.money_calculations import parse_money
from tests.conftest import (
    auth_headers,
    category_by_slug,
    get_allocation_categories,
)

pytestmark = pytest.mark.api


def _seed_asset(db: Session, *, asset_type: str, symbol: str) -> Asset:
    existing = (
        db.query(Asset)
        .filter(Asset.symbol == symbol, Asset.asset_type == asset_type)
        .first()
    )
    if existing is not None:
        return existing
    asset = Asset(
        asset_type=asset_type,
        symbol=symbol,
        exchange="NSE" if asset_type != "mutual_fund" else None,
        name=f"{symbol} Test",
        provider_symbol=f"{symbol}.NS" if asset_type != "mutual_fund" else "122639",
        active=True,
        metadata_json={},
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def _set_income_and_investment_plan(
    client,
    headers,
    *,
    year: int,
    month: int,
    income: str,
    stocks: str,
    mutual_funds: str,
    others: str | None = None,
):
    client.post(
        f"/api/v1/money/{year}/{month}/income",
        json={"amount": income},
        headers=headers,
    )
    cats = get_allocation_categories(client, headers)
    stocks_cat = category_by_slug(cats, "stocks")
    mf_cat = category_by_slug(cats, "mutual-funds")
    others_cat = category_by_slug(cats, "others")
    items = [
        {"category_id": stocks_cat["id"], "amount": stocks},
        {"category_id": mf_cat["id"], "amount": mutual_funds},
    ]
    if others is not None:
        items.append({"category_id": others_cat["id"], "amount": others})
    # Fill remaining to others so allocation can reach 100% when needed
    allocated = parse_money(stocks) + parse_money(mutual_funds) + (
        parse_money(others) if others else Decimal("0")
    )
    income_d = parse_money(income)
    rem = income_d - allocated
    if rem > 0 and others is None:
        items.append({"category_id": others_cat["id"], "amount": format(rem, "f")})
    response = client.put(
        f"/api/v1/money/{year}/{month}/allocation",
        json={"items": items},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    return response.json()


def _buy(
    client,
    headers,
    *,
    asset_type: str,
    asset_id: str,
    quantity: str,
    unit_price: str,
    traded_on: str,
):
    response = client.post(
        "/api/v1/invest/transactions",
        headers=headers,
        json={
            "asset_type": asset_type,
            "asset_id": asset_id,
            "quantity": quantity,
            "unit_price": unit_price,
            "traded_on": traded_on,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _by_slug(body: dict, slug: str) -> dict:
    return next(c for c in body["categories"] if c["category_slug"] == slug)


def test_plan_status_helpers():
    assert plan_status(planned=Decimal("5000"), actual=Decimal("0")) == "not_started"
    assert plan_status(planned=Decimal("5000"), actual=Decimal("3000")) == "under_plan"
    assert plan_status(planned=Decimal("5000"), actual=Decimal("5000")) == "complete"
    assert plan_status(planned=Decimal("5000"), actual=Decimal("6000")) == "over_plan"
    assert remaining_amount(planned=Decimal("5000"), actual=Decimal("6000")) == Decimal("0.00")
    assert over_invested_amount(planned=Decimal("5000"), actual=Decimal("6000")) == Decimal(
        "1000.00"
    )
    assert percentage_of_plan(planned=Decimal("5000"), actual=Decimal("3000")) == Decimal("60.00")


def test_empty_plan_and_no_investments(client, user_headers):
    response = client.get("/api/v1/invest/plan?year=2026&month=8", headers=user_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["month_key"] == "2026-08"
    assert body["totals"]["planned"] == "0.00"
    assert body["totals"]["actual"] == "0.00"
    assert body["totals"]["remaining"] == "0.00"
    assert body["totals"]["over_invested"] == "0.00"
    stocks = _by_slug(body, "stocks")
    assert stocks["status"] == "not_started"
    assert stocks["planned"] == "0.00"
    assert stocks["actual"] == "0.00"


def test_planned_only_not_started(client, user_headers):
    _set_income_and_investment_plan(
        client,
        user_headers,
        year=2026,
        month=8,
        income="60000",
        stocks="5000.00",
        mutual_funds="5000.00",
    )
    body = client.get("/api/v1/invest/plan?year=2026&month=8", headers=user_headers).json()
    stocks = _by_slug(body, "stocks")
    assert stocks["planned"] == "5000.00"
    assert stocks["actual"] == "0.00"
    assert stocks["remaining"] == "5000.00"
    assert stocks["status"] == "not_started"
    assert body["totals"]["planned"] == "10000.00"
    assert body["totals"]["actual"] == "0.00"
    assert body["totals"]["remaining"] == "10000.00"


def test_under_plan(client, db: Session, user_headers):
    _set_income_and_investment_plan(
        client,
        user_headers,
        year=2026,
        month=8,
        income="60000",
        stocks="5000.00",
        mutual_funds="0.00",
    )
    asset = _seed_asset(db, asset_type="stock", symbol="I5UND")
    _buy(
        client,
        user_headers,
        asset_type="stock",
        asset_id=str(asset.id),
        quantity="10",
        unit_price="300.00",
        traded_on="2026-08-10",
    )
    body = client.get("/api/v1/invest/plan?year=2026&month=8", headers=user_headers).json()
    stocks = _by_slug(body, "stocks")
    assert stocks["planned"] == "5000.00"
    assert stocks["actual"] == "3000.00"
    assert stocks["remaining"] == "2000.00"
    assert stocks["over_invested"] == "0.00"
    assert stocks["percentage_of_plan"] == "60.00"
    assert stocks["status"] == "under_plan"


def test_complete_plan(client, db: Session, user_headers):
    _set_income_and_investment_plan(
        client,
        user_headers,
        year=2026,
        month=8,
        income="60000",
        stocks="5000.00",
        mutual_funds="0.00",
    )
    asset = _seed_asset(db, asset_type="stock", symbol="I5CMP")
    _buy(
        client,
        user_headers,
        asset_type="stock",
        asset_id=str(asset.id),
        quantity="10",
        unit_price="500.00",
        traded_on="2026-08-12",
    )
    stocks = _by_slug(
        client.get("/api/v1/invest/plan?year=2026&month=8", headers=user_headers).json(),
        "stocks",
    )
    assert stocks["actual"] == "5000.00"
    assert stocks["remaining"] == "0.00"
    assert stocks["status"] == "complete"


def test_over_plan(client, db: Session, user_headers):
    _set_income_and_investment_plan(
        client,
        user_headers,
        year=2026,
        month=8,
        income="60000",
        stocks="5000.00",
        mutual_funds="0.00",
    )
    asset = _seed_asset(db, asset_type="stock", symbol="I5OVR")
    _buy(
        client,
        user_headers,
        asset_type="stock",
        asset_id=str(asset.id),
        quantity="10",
        unit_price="600.00",
        traded_on="2026-08-12",
    )
    stocks = _by_slug(
        client.get("/api/v1/invest/plan?year=2026&month=8", headers=user_headers).json(),
        "stocks",
    )
    assert stocks["actual"] == "6000.00"
    assert stocks["remaining"] == "0.00"
    assert stocks["over_invested"] == "1000.00"
    assert stocks["status"] == "over_plan"


def test_multiple_buys_same_month_summed(client, db: Session, user_headers):
    _set_income_and_investment_plan(
        client,
        user_headers,
        year=2026,
        month=8,
        income="60000",
        stocks="10000.00",
        mutual_funds="0.00",
    )
    asset = _seed_asset(db, asset_type="stock", symbol="I5SUM")
    _buy(
        client,
        user_headers,
        asset_type="stock",
        asset_id=str(asset.id),
        quantity="5",
        unit_price="400.00",
        traded_on="2026-08-01",
    )
    _buy(
        client,
        user_headers,
        asset_type="stock",
        asset_id=str(asset.id),
        quantity="5",
        unit_price="200.00",
        traded_on="2026-08-20",
    )
    stocks = _by_slug(
        client.get("/api/v1/invest/plan?year=2026&month=8", headers=user_headers).json(),
        "stocks",
    )
    assert stocks["actual"] == "3000.00"


def test_other_month_excluded(client, db: Session, user_headers):
    _set_income_and_investment_plan(
        client,
        user_headers,
        year=2026,
        month=8,
        income="60000",
        stocks="5000.00",
        mutual_funds="0.00",
    )
    asset = _seed_asset(db, asset_type="stock", symbol="I5MON")
    _buy(
        client,
        user_headers,
        asset_type="stock",
        asset_id=str(asset.id),
        quantity="10",
        unit_price="400.00",
        traded_on="2026-09-01",
    )
    stocks = _by_slug(
        client.get("/api/v1/invest/plan?year=2026&month=8", headers=user_headers).json(),
        "stocks",
    )
    assert stocks["actual"] == "0.00"
    assert stocks["status"] == "not_started"


def test_user_isolation(client, db: Session):
    headers_a = auth_headers(db, f"a-{uuid4().hex[:8]}@example.com")
    headers_b = auth_headers(db, f"b-{uuid4().hex[:8]}@example.com")
    _set_income_and_investment_plan(
        client,
        headers_a,
        year=2026,
        month=8,
        income="60000",
        stocks="5000.00",
        mutual_funds="0.00",
    )
    asset = _seed_asset(db, asset_type="stock", symbol="I5ISO")
    _buy(
        client,
        headers_a,
        asset_type="stock",
        asset_id=str(asset.id),
        quantity="10",
        unit_price="300.00",
        traded_on="2026-08-05",
    )
    a = client.get("/api/v1/invest/plan?year=2026&month=8", headers=headers_a).json()
    b = client.get("/api/v1/invest/plan?year=2026&month=8", headers=headers_b).json()
    assert _by_slug(a, "stocks")["actual"] == "3000.00"
    assert b["totals"]["planned"] == "0.00"
    assert b["totals"]["actual"] == "0.00"


def test_non_investment_money_categories_excluded(client, user_headers):
    _set_income_and_investment_plan(
        client,
        user_headers,
        year=2026,
        month=8,
        income="60000",
        stocks="0.00",
        mutual_funds="0.00",
        others="60000.00",
    )
    body = client.get("/api/v1/invest/plan?year=2026&month=8", headers=user_headers).json()
    assert body["totals"]["planned"] == "0.00"
    slugs = {c["category_slug"] for c in body["categories"]}
    assert "others" not in slugs
    assert "emergency-fund" not in slugs
    assert "personal-expenses" not in slugs


def test_stocks_and_mf_mapping(client, db: Session, user_headers):
    _set_income_and_investment_plan(
        client,
        user_headers,
        year=2026,
        month=8,
        income="60000",
        stocks="5000.00",
        mutual_funds="5000.00",
    )
    stock = _seed_asset(db, asset_type="stock", symbol="I5STK")
    mf = _seed_asset(db, asset_type="mutual_fund", symbol="I5MF")
    _buy(
        client,
        user_headers,
        asset_type="stock",
        asset_id=str(stock.id),
        quantity="10",
        unit_price="300.00",
        traded_on="2026-08-05",
    )
    _buy(
        client,
        user_headers,
        asset_type="mutual_fund",
        asset_id=str(mf.id),
        quantity="10",
        unit_price="450.00",
        traded_on="2026-08-06",
    )
    body = client.get("/api/v1/invest/plan?year=2026&month=8", headers=user_headers).json()
    assert _by_slug(body, "stocks")["actual"] == "3000.00"
    assert _by_slug(body, "mutual-funds")["actual"] == "4500.00"
    assert body["totals"]["planned"] == "10000.00"
    assert body["totals"]["actual"] == "7500.00"
    assert body["totals"]["remaining"] == "2500.00"


def test_etf_does_not_count_toward_stocks_or_mf(client, db: Session, user_headers):
    """Money has no ETF allocation category in I5 — ETF buys must not map silently."""
    _set_income_and_investment_plan(
        client,
        user_headers,
        year=2026,
        month=8,
        income="60000",
        stocks="5000.00",
        mutual_funds="0.00",
    )
    etf = _seed_asset(db, asset_type="etf", symbol="I5ETF")
    _buy(
        client,
        user_headers,
        asset_type="etf",
        asset_id=str(etf.id),
        quantity="10",
        unit_price="100.00",
        traded_on="2026-08-05",
    )
    body = client.get("/api/v1/invest/plan?year=2026&month=8", headers=user_headers).json()
    assert _by_slug(body, "stocks")["actual"] == "0.00"
    assert body["totals"]["actual"] == "0.00"


def test_plan_query_does_not_mutate_money(client, user_headers):
    month = client.post(
        "/api/v1/money/2026/8/income",
        json={"amount": "60000"},
        headers=user_headers,
    ).json()
    before_available = month["metrics"]["money_available"]
    before_income = month["income"]
    _set_income_and_investment_plan(
        client,
        user_headers,
        year=2026,
        month=8,
        income="60000",
        stocks="5000.00",
        mutual_funds="5000.00",
    )
    client.get("/api/v1/invest/plan?year=2026&month=8", headers=user_headers)
    after = client.get("/api/v1/money/2026/8", headers=user_headers).json()
    assert after["income"] == before_income or after["income"] == "60000.00"
    assert after["metrics"]["money_available"] is not None
    # I5 must not change income/available beyond what allocation already did
    again = client.get("/api/v1/invest/plan?year=2026&month=8", headers=user_headers)
    assert again.status_code == 200
    after2 = client.get("/api/v1/money/2026/8", headers=user_headers).json()
    assert after2["metrics"]["money_available"] == after["metrics"]["money_available"]
    assert after2["income"] == after["income"]
    assert after2["allocations"] == after["allocations"]
    _ = before_available


def test_requires_auth(client):
    response = client.get("/api/v1/invest/plan?year=2026&month=8")
    assert response.status_code == 401

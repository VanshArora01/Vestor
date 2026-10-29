from uuid import uuid4

import pytest

from tests.conftest import auth_headers, category_by_slug, get_allocation_categories, get_spending_categories


@pytest.fixture
def user_headers(db):
    email = f"cat-{uuid4().hex[:8]}@example.com"
    return email, auth_headers(db, email)


def test_create_custom_money_plan_category(client, user_headers):
    _, headers = user_headers
    response = client.post(
        "/api/v1/money/categories",
        json={"kind": "money_plan", "name": "Gold ETF", "semantic_type": "investment"},
        headers=headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Gold ETF"
    assert data["scope"] == "money_plan"
    assert data["semantic_type"] == "investment"
    assert data["is_custom"] is True
    assert data["is_system"] is False
    assert data["is_active"] is True

    categories = get_allocation_categories(client, headers)
    assert any(c["id"] == data["id"] for c in categories)


def test_create_custom_spending_category(client, user_headers):
    _, headers = user_headers
    response = client.post(
        "/api/v1/money/categories",
        json={"kind": "spending", "name": "Gym"},
        headers=headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Gym"
    assert data["scope"] == "spending"
    assert data["semantic_type"] is None
    assert data["is_custom"] is True

    categories = get_spending_categories(client, headers)
    assert any(c["id"] == data["id"] for c in categories)


def test_money_plan_requires_semantic_type(client, user_headers):
    _, headers = user_headers
    response = client.post(
        "/api/v1/money/categories",
        json={"kind": "allocation", "name": "PPF"},
        headers=headers,
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "INVALID_SEMANTIC_TYPE"


def test_duplicate_category_rejected(client, user_headers):
    _, headers = user_headers
    first = client.post(
        "/api/v1/money/categories",
        json={"kind": "spending", "name": "Pet Expenses"},
        headers=headers,
    )
    assert first.status_code == 201
    duplicate = client.post(
        "/api/v1/money/categories",
        json={"kind": "spending", "name": "  pet expenses  "},
        headers=headers,
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"]["code"] == "CATEGORY_EXISTS"

    system_dup = client.post(
        "/api/v1/money/categories",
        json={"kind": "spending", "name": "Food"},
        headers=headers,
    )
    assert system_dup.status_code == 409


def test_category_isolation_between_users(client, db):
    headers_a = auth_headers(db, f"iso-a-{uuid4().hex[:8]}@example.com")
    headers_b = auth_headers(db, f"iso-b-{uuid4().hex[:8]}@example.com")
    created = client.post(
        "/api/v1/money/categories",
        json={"kind": "allocation", "name": "FD", "semantic_type": "savings"},
        headers=headers_a,
    )
    assert created.status_code == 201
    category_id = created.json()["id"]

    categories_b = client.get("/api/v1/money/categories?kind=allocation", headers=headers_b)
    assert all(c["id"] != category_id for c in categories_b.json())

    rename = client.patch(
        f"/api/v1/money/categories/{category_id}?kind=allocation",
        json={"name": "Hacked FD"},
        headers=headers_b,
    )
    assert rename.status_code == 404

    hide = client.post(
        f"/api/v1/money/categories/{category_id}/deactivate?kind=allocation",
        headers=headers_b,
    )
    assert hide.status_code == 404


def test_hide_category_soft_deletes(client, user_headers):
    _, headers = user_headers
    created = client.post(
        "/api/v1/money/categories",
        json={"kind": "spending", "name": "Subscriptions"},
        headers=headers,
    )
    assert created.status_code == 201
    category_id = created.json()["id"]

    hidden = client.post(
        f"/api/v1/money/categories/{category_id}/deactivate?kind=spending",
        headers=headers,
    )
    assert hidden.status_code == 200
    assert hidden.json()["is_active"] is False

    active = get_spending_categories(client, headers)
    assert all(c["id"] != category_id for c in active)

    including_inactive = client.get(
        "/api/v1/money/categories?kind=spending&active_only=false",
        headers=headers,
    )
    assert including_inactive.status_code == 200
    match = next(c for c in including_inactive.json() if c["id"] == category_id)
    assert match["is_active"] is False


def test_historical_records_remain_after_hide(client, user_headers):
    _, headers = user_headers
    client.post("/api/v1/money/2026/9/income", json={"amount": "50000"}, headers=headers)
    created = client.post(
        "/api/v1/money/categories",
        json={"kind": "spending", "name": "Subscriptions"},
        headers=headers,
    )
    category_id = created.json()["id"]
    food = category_by_slug(get_spending_categories(client, headers), "food")

    save = client.put(
        "/api/v1/money/2026/9/spending",
        json={
            "items": [
                {"category_id": category_id, "amount": "1200"},
                {"category_id": food["id"], "amount": "3000"},
            ]
        },
        headers=headers,
    )
    assert save.status_code == 200

    client.post(
        f"/api/v1/money/categories/{category_id}/deactivate?kind=spending",
        headers=headers,
    )

    month = client.get("/api/v1/money/2026/9", headers=headers)
    assert month.status_code == 200
    data = month.json()
    assert data["metrics"]["spending_total"] == "4200.00"
    custom_line = next(s for s in data["spending"] if s["category_id"] == category_id)
    assert custom_line["category_name"] == "Subscriptions"
    assert custom_line["amount"] == "1200.00"
    assert custom_line["is_active"] is False


def test_system_category_protected(client, user_headers):
    _, headers = user_headers
    food = category_by_slug(get_spending_categories(client, headers), "food")
    rename = client.patch(
        f"/api/v1/money/categories/{food['id']}?kind=spending",
        json={"name": "Groceries"},
        headers=headers,
    )
    assert rename.status_code == 403
    assert rename.json()["detail"]["code"] == "SYSTEM_CATEGORY_PROTECTED"

    hide = client.post(
        f"/api/v1/money/categories/{food['id']}/deactivate?kind=spending",
        headers=headers,
    )
    assert hide.status_code == 403
    assert hide.json()["detail"]["code"] == "SYSTEM_CATEGORY_PROTECTED"

    emergency = category_by_slug(get_allocation_categories(client, headers), "emergency-fund")
    hide_plan = client.post(
        f"/api/v1/money/categories/{emergency['id']}/deactivate?kind=money_plan",
        headers=headers,
    )
    assert hide_plan.status_code == 403


def test_rename_custom_category(client, user_headers):
    _, headers = user_headers
    created = client.post(
        "/api/v1/money/categories",
        json={"kind": "money_plan", "name": "PPF", "semantic_type": "savings"},
        headers=headers,
    )
    category_id = created.json()["id"]
    renamed = client.patch(
        f"/api/v1/money/categories/{category_id}?kind=money_plan",
        json={"name": "Public Provident Fund", "semantic_type": "investment"},
        headers=headers,
    )
    assert renamed.status_code == 200
    data = renamed.json()
    assert data["name"] == "Public Provident Fund"
    assert data["semantic_type"] == "investment"
    assert data["slug"] == "public-provident-fund"


def test_spending_category_cannot_be_used_as_money_plan(client, user_headers):
    _, headers = user_headers
    client.post("/api/v1/money/2026/9/income", json={"amount": "40000"}, headers=headers)
    spending = client.post(
        "/api/v1/money/categories",
        json={"kind": "spending", "name": "Gym"},
        headers=headers,
    )
    spending_id = spending.json()["id"]
    response = client.put(
        "/api/v1/money/2026/9/allocation",
        json={"items": [{"category_id": spending_id, "amount": "1000"}]},
        headers=headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "CATEGORY_NOT_FOUND"

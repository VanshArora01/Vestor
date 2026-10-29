from uuid import uuid4

import pytest

from tests.conftest import auth_headers, category_by_slug, get_allocation_categories, get_spending_categories

pytestmark = pytest.mark.api


@pytest.fixture
def user_headers(db):
    email = f"money-{uuid4().hex[:8]}@example.com"
    return email, auth_headers(db, email)


def test_create_monthly_income(client, user_headers):
    _, headers = user_headers
    response = client.post(
        "/api/v1/money/2026/9/income",
        json={"amount": "60000"},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["income"] == "60000.00"
    assert data["metrics"]["income"] == "60000.00"


def test_invalid_income_rejected(client, user_headers):
    _, headers = user_headers
    for amount in ["0", "-100"]:
        response = client.post(
            "/api/v1/money/2026/9/income",
            json={"amount": amount},
            headers=headers,
        )
        assert response.status_code == 422
        assert response.json()["detail"]["code"] == "INVALID_INCOME"


def test_allocation_exceeds_income_blocked(client, user_headers):
    _, headers = user_headers
    client.post("/api/v1/money/2026/9/income", json={"amount": "60000"}, headers=headers)
    categories = get_allocation_categories(client, headers)
    others = category_by_slug(categories, "others")
    response = client.put(
        "/api/v1/money/2026/9/allocation",
        json={
            "items": [
                {"category_id": others["id"], "amount": "65000"},
            ]
        },
        headers=headers,
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "ALLOCATION_EXCEEDS_INCOME"


def test_allocation_can_reach_exactly_100_percent(client, user_headers):
    _, headers = user_headers
    client.post("/api/v1/money/2026/9/income", json={"amount": "60000"}, headers=headers)
    categories = get_allocation_categories(client, headers)
    items = [
        {"category_id": category_by_slug(categories, "emergency-fund")["id"], "amount": "5000"},
        {"category_id": category_by_slug(categories, "mutual-funds")["id"], "amount": "10000"},
        {"category_id": category_by_slug(categories, "stocks")["id"], "amount": "8000"},
        {"category_id": category_by_slug(categories, "personal-expenses")["id"], "amount": "17000"},
        {"category_id": category_by_slug(categories, "others")["id"], "amount": "20000"},
    ]
    response = client.put(
        "/api/v1/money/2026/9/allocation",
        json={"items": items, "require_complete": True},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["metrics"]["allocation_complete"] is True
    assert data["metrics"]["remaining_allocation"] == "0.00"


def test_add_remaining_to_others(client, user_headers):
    _, headers = user_headers
    client.post("/api/v1/money/2026/9/income", json={"amount": "60000"}, headers=headers)
    categories = get_allocation_categories(client, headers)
    items = [
        {"category_id": category_by_slug(categories, "emergency-fund")["id"], "amount": "5000"},
        {"category_id": category_by_slug(categories, "mutual-funds")["id"], "amount": "10000"},
        {"category_id": category_by_slug(categories, "stocks")["id"], "amount": "8000"},
        {"category_id": category_by_slug(categories, "personal-expenses")["id"], "amount": "17000"},
        {"category_id": category_by_slug(categories, "others")["id"], "amount": "15000"},
    ]
    client.put("/api/v1/money/2026/9/allocation", json={"items": items}, headers=headers)
    response = client.post("/api/v1/money/2026/9/allocation/add-remaining-to-others", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["metrics"]["allocation_complete"] is True
    others = next(a for a in data["allocations"] if a["category_slug"] == "others")
    assert others["amount"] == "20000.00"


def test_spending_categories_stored(client, user_headers):
    _, headers = user_headers
    client.post("/api/v1/money/2026/9/income", json={"amount": "60000"}, headers=headers)
    categories = get_spending_categories(client, headers)
    items = [
        {"category_id": category_by_slug(categories, "food")["id"], "amount": "3000"},
        {"category_id": category_by_slug(categories, "transport")["id"], "amount": "1500"},
        {"category_id": category_by_slug(categories, "utilities")["id"], "amount": "6000"},
    ]
    response = client.put("/api/v1/money/2026/9/spending", json={"items": items}, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["metrics"]["spending_total"] == "10500.00"


def test_spending_exceeds_available_income_blocked(client, user_headers):
    _, headers = user_headers
    client.post("/api/v1/money/2026/9/income", json={"amount": "30000"}, headers=headers)
    allocation_categories = get_allocation_categories(client, headers)
    client.put(
        "/api/v1/money/2026/9/allocation",
        json={
            "items": [
                {
                    "category_id": category_by_slug(allocation_categories, "others")["id"],
                    "amount": "25000",
                }
            ]
        },
        headers=headers,
    )
    spending_categories = get_spending_categories(client, headers)
    response = client.put(
        "/api/v1/money/2026/9/spending",
        json={
            "items": [
                {
                    "category_id": category_by_slug(spending_categories, "food")["id"],
                    "amount": "6000",
                }
            ]
        },
        headers=headers,
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "BUDGET_EXCEEDS_INCOME"


def test_money_available_metrics(client, user_headers):
    _, headers = user_headers
    client.post("/api/v1/money/2026/9/income", json={"amount": "30000"}, headers=headers)
    allocation_categories = get_allocation_categories(client, headers)
    client.put(
        "/api/v1/money/2026/9/allocation",
        json={
            "items": [
                {
                    "category_id": category_by_slug(allocation_categories, "others")["id"],
                    "amount": "22000",
                }
            ]
        },
        headers=headers,
    )
    spending_categories = get_spending_categories(client, headers)
    client.put(
        "/api/v1/money/2026/9/spending",
        json={
            "items": [
                {
                    "category_id": category_by_slug(spending_categories, "food")["id"],
                    "amount": "5000",
                }
            ]
        },
        headers=headers,
    )
    data = client.get("/api/v1/money/2026/9", headers=headers).json()
    assert data["metrics"]["money_available"] == "3000.00"
    assert data["metrics"]["money_available_before_spending"] == "8000.00"


def test_month_over_month_comparison(client, user_headers):
    _, headers = user_headers
    client.post("/api/v1/money/2026/8/income", json={"amount": "60000"}, headers=headers)
    spending_categories = get_spending_categories(client, headers)
    client.put(
        "/api/v1/money/2026/8/spending",
        json={
            "items": [
                {
                    "category_id": category_by_slug(spending_categories, "food")["id"],
                    "amount": "3000",
                }
            ]
        },
        headers=headers,
    )
    client.post("/api/v1/money/2026/9/income", json={"amount": "65000"}, headers=headers)
    client.put(
        "/api/v1/money/2026/9/spending",
        json={
            "items": [
                {
                    "category_id": category_by_slug(spending_categories, "food")["id"],
                    "amount": "4500",
                }
            ]
        },
        headers=headers,
    )
    response = client.get("/api/v1/money/2026/9/comparison", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["comparison"]["changes"]["income"] == "5000.00"
    assert data["comparison"]["changes"]["spending"] == "1500.00"


def test_locked_month_cannot_be_edited(client, user_headers):
    _, headers = user_headers
    client.post("/api/v1/money/2026/8/income", json={"amount": "60000"}, headers=headers)
    client.post("/api/v1/money/2026/9/income", json={"amount": "65000"}, headers=headers)
    august = client.get("/api/v1/money/2026/8", headers=headers).json()
    assert august["is_locked"] is True
    response = client.post(
        "/api/v1/money/2026/8/income",
        json={"amount": "70000"},
        headers=headers,
    )
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "MONTH_LOCKED"


def test_unlock_allows_editing(client, user_headers):
    _, headers = user_headers
    client.post("/api/v1/money/2026/8/income", json={"amount": "60000"}, headers=headers)
    client.post("/api/v1/money/2026/9/income", json={"amount": "65000"}, headers=headers)
    unlock = client.post("/api/v1/money/2026/8/unlock", headers=headers)
    assert unlock.status_code == 200
    assert unlock.json()["is_locked"] is False
    response = client.post(
        "/api/v1/money/2026/8/income",
        json={"amount": "62000"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["income"] == "62000.00"


def test_user_cannot_access_other_users_data(client, db):
    email_a = f"user-a-{uuid4().hex[:8]}@example.com"
    email_b = f"user-b-{uuid4().hex[:8]}@example.com"
    headers_a = auth_headers(db, email_a)
    headers_b = auth_headers(db, email_b)
    client.post("/api/v1/money/2026/9/income", json={"amount": "60000"}, headers=headers_a)
    response = client.get("/api/v1/money/2026/9", headers=headers_b)
    assert response.status_code == 200
    assert response.json()["income"] is None


def test_custom_categories_isolated(client, db):
    email_a = f"custom-a-{uuid4().hex[:8]}@example.com"
    email_b = f"custom-b-{uuid4().hex[:8]}@example.com"
    headers_a = auth_headers(db, email_a)
    headers_b = auth_headers(db, email_b)
    created = client.post(
        "/api/v1/money/categories",
        json={"kind": "allocation", "name": "Wedding", "semantic_type": "goal"},
        headers=headers_a,
    )
    assert created.status_code == 201
    category_id = created.json()["id"]
    categories_b = client.get("/api/v1/money/categories?kind=allocation", headers=headers_b)
    assert categories_b.status_code == 200
    assert all(c["id"] != category_id for c in categories_b.json())


def test_predefined_categories_available(client, user_headers):
    _, headers = user_headers
    allocation = get_allocation_categories(client, headers)
    spending = get_spending_categories(client, headers)
    allocation_slugs = {c["slug"] for c in allocation}
    spending_slugs = {c["slug"] for c in spending}
    assert "emergency-fund" in allocation_slugs
    assert "others" in allocation_slugs
    assert "food" in spending_slugs
    assert "others" in spending_slugs

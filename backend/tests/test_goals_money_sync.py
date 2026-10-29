"""Money Plan ↔ Goals synchronization tests."""

from datetime import date
from decimal import Decimal
from uuid import uuid4

from tests.conftest import auth_headers


def create_ps5_goal(**overrides):
    payload = {
        "name": "PS5",
        "goal_type": "general",
        "target_amount": "50000",
        "current_amount": "0",
        "planned_monthly_contribution": "0",
        "months_until_deadline": 12,
    }
    payload.update(overrides)
    return payload


def auth_for_new_user(db):
    return auth_headers(db, f"sync-{uuid4().hex[:8]}@example.com")


def test_money_allocation_updates_goal_progress(client, user_headers):
    created = client.post("/api/v1/goals", json=create_ps5_goal(), headers=user_headers)
    assert created.status_code == 201
    goal_id = created.json()["id"]

    client.post(
        "/api/v1/money/2026/9/income",
        json={"amount": "100000"},
        headers=user_headers,
    )
    allocated = client.put(
        "/api/v1/money/2026/9/allocation",
        json={"items": [{"goal_id": goal_id, "amount": "5000"}]},
        headers=user_headers,
    )
    assert allocated.status_code == 200

    goal = client.get(f"/api/v1/goals/{goal_id}", headers=user_headers)
    assert goal.status_code == 200
    data = goal.json()
    assert data["current_amount"] == "5000.00"
    assert data["metrics"]["remaining_amount"] == "45000.00"
    assert Decimal(data["metrics"]["progress_percentage"]) == Decimal("10.00")


def test_multiple_month_allocations_accumulate(client, user_headers):
    created = client.post("/api/v1/goals", json=create_ps5_goal(), headers=user_headers)
    goal_id = created.json()["id"]

    client.post("/api/v1/money/2026/9/income", json={"amount": "100000"}, headers=user_headers)
    client.put(
        "/api/v1/money/2026/9/allocation",
        json={"items": [{"goal_id": goal_id, "amount": "5000"}]},
        headers=user_headers,
    )

    client.post("/api/v1/money/2026/10/income", json={"amount": "100000"}, headers=user_headers)
    client.put(
        "/api/v1/money/2026/10/allocation",
        json={"items": [{"goal_id": goal_id, "amount": "5000"}]},
        headers=user_headers,
    )

    goal = client.get(f"/api/v1/goals/{goal_id}", headers=user_headers).json()
    assert goal["current_amount"] == "10000.00"
    assert Decimal(goal["metrics"]["progress_percentage"]) == Decimal("20.00")


def test_updating_allocation_replaces_not_adds(client, user_headers):
    created = client.post("/api/v1/goals", json=create_ps5_goal(), headers=user_headers)
    goal_id = created.json()["id"]

    client.post("/api/v1/money/2026/9/income", json={"amount": "100000"}, headers=user_headers)
    client.put(
        "/api/v1/money/2026/9/allocation",
        json={"items": [{"goal_id": goal_id, "amount": "5000"}]},
        headers=user_headers,
    )
    client.put(
        "/api/v1/money/2026/9/allocation",
        json={"items": [{"goal_id": goal_id, "amount": "7000"}]},
        headers=user_headers,
    )

    goal = client.get(f"/api/v1/goals/{goal_id}", headers=user_headers).json()
    assert goal["current_amount"] == "7000.00"
    assert Decimal(goal["metrics"]["progress_percentage"]) == Decimal("14.00")


def test_removing_allocation_reduces_goal_progress(client, user_headers):
    created = client.post("/api/v1/goals", json=create_ps5_goal(), headers=user_headers)
    goal_id = created.json()["id"]

    client.post("/api/v1/money/2026/9/income", json={"amount": "100000"}, headers=user_headers)
    client.put(
        "/api/v1/money/2026/9/allocation",
        json={"items": [{"goal_id": goal_id, "amount": "5000"}]},
        headers=user_headers,
    )
    client.put(
        "/api/v1/money/2026/9/allocation",
        json={"items": []},
        headers=user_headers,
    )

    goal = client.get(f"/api/v1/goals/{goal_id}", headers=user_headers).json()
    assert goal["current_amount"] == "0.00"
    assert Decimal(goal["metrics"]["progress_percentage"]) == Decimal("0.00")


def test_archive_removes_active_money_plan_option(client, user_headers):
    today = date.today()
    client.post(
        f"/api/v1/money/{today.year}/{today.month}/income",
        json={"amount": "100000"},
        headers=user_headers,
    )
    created = client.post(
        "/api/v1/goals",
        json=create_ps5_goal(planned_monthly_contribution="5000"),
        headers=user_headers,
    )
    goal_id = created.json()["id"]

    before = client.get(f"/api/v1/money/{today.year}/{today.month}", headers=user_headers).json()
    assert any(line.get("goal_id") == goal_id for line in before["allocations"])

    archived = client.post(f"/api/v1/goals/{goal_id}/archive", headers=user_headers)
    assert archived.status_code == 200

    after = client.get(f"/api/v1/money/{today.year}/{today.month}", headers=user_headers).json()
    assert all(line.get("goal_id") != goal_id for line in after["allocations"])


def test_archive_preserves_locked_month_history(client, user_headers):
    today = date.today()
    prev_year, prev_month = (today.year, today.month - 1) if today.month > 1 else (today.year - 1, 12)

    created = client.post("/api/v1/goals", json=create_ps5_goal(name="PS5 History"), headers=user_headers)
    goal_id = created.json()["id"]

    client.post(
        f"/api/v1/money/{prev_year}/{prev_month}/income",
        json={"amount": "100000"},
        headers=user_headers,
    )
    client.put(
        f"/api/v1/money/{prev_year}/{prev_month}/allocation",
        json={"items": [{"goal_id": goal_id, "amount": "5000"}]},
        headers=user_headers,
    )
    # Setting current month income locks previous month.
    client.post(
        f"/api/v1/money/{today.year}/{today.month}/income",
        json={"amount": "100000"},
        headers=user_headers,
    )
    client.post(f"/api/v1/goals/{goal_id}/archive", headers=user_headers)

    historical = client.get(
        f"/api/v1/money/{prev_year}/{prev_month}",
        headers=user_headers,
    ).json()
    assert any(
        line.get("goal_id") == goal_id and line.get("amount") == "5000.00"
        for line in historical["allocations"]
    )
    assert historical["is_locked"] is True

    current = client.get(f"/api/v1/money/{today.year}/{today.month}", headers=user_headers).json()
    assert all(line.get("goal_id") != goal_id for line in current["allocations"])

def test_money_goal_isolation_across_users(client, db, user_headers):
    created = client.post("/api/v1/goals", json=create_ps5_goal(), headers=user_headers)
    goal_id = created.json()["id"]
    client.post("/api/v1/money/2026/9/income", json={"amount": "100000"}, headers=user_headers)
    client.put(
        "/api/v1/money/2026/9/allocation",
        json={"items": [{"goal_id": goal_id, "amount": "5000"}]},
        headers=user_headers,
    )

    other = auth_for_new_user(db)
    assert client.get(f"/api/v1/goals/{goal_id}", headers=other).status_code == 404
    client.post("/api/v1/money/2026/9/income", json={"amount": "100000"}, headers=other)
    assert (
        client.put(
            "/api/v1/money/2026/9/allocation",
            json={"items": [{"goal_id": goal_id, "amount": "1000"}]},
            headers=other,
        ).status_code
        == 404
    )


def test_manual_contribution_and_plan_allocation_do_not_double_count_same_event(client, user_headers):
    """Opening/manual current_amount and plan allocations are additive but distinct sources."""
    created = client.post(
        "/api/v1/goals",
        json=create_ps5_goal(current_amount="10000"),
        headers=user_headers,
    )
    goal_id = created.json()["id"]
    client.post("/api/v1/money/2026/9/income", json={"amount": "100000"}, headers=user_headers)
    client.put(
        "/api/v1/money/2026/9/allocation",
        json={"items": [{"goal_id": goal_id, "amount": "5000"}]},
        headers=user_headers,
    )
    goal = client.get(f"/api/v1/goals/{goal_id}", headers=user_headers).json()
    # 10000 opening + 5000 plan = 15000 — not 20000
    assert goal["current_amount"] == "15000.00"

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest

from app.services.goals_calculations import (
    build_goal_metrics,
    compute_pace_status,
    compute_progress_percentage,
    compute_remaining_amount,
    compute_required_monthly,
)
from tests.conftest import auth_headers


def test_progress_calculation():
    assert compute_progress_percentage(Decimal("30000"), Decimal("80000")) == Decimal("37.50")
    assert compute_progress_percentage(Decimal("90000"), Decimal("80000")) == Decimal("100.00")


def test_remaining_amount():
    assert compute_remaining_amount(Decimal("80000"), Decimal("30000")) == Decimal("50000.00")


def test_required_monthly_contribution():
    assert compute_required_monthly(Decimal("60000"), 10) == Decimal("6000.00")
    assert compute_required_monthly(Decimal("60000"), 0) is None


def test_pace_status_ahead_on_track_behind():
    today = date(2026, 8, 9)
    deadline = date(2027, 6, 1)
    assert (
        compute_pace_status(
            current=Decimal("40000"),
            target=Decimal("100000"),
            deadline=deadline,
            planned_monthly=Decimal("7000"),
            today=today,
        )
        == "AHEAD"
    )
    assert (
        compute_pace_status(
            current=Decimal("40000"),
            target=Decimal("100000"),
            deadline=deadline,
            planned_monthly=Decimal("5500"),
            today=today,
        )
        == "ON_TRACK"
    )
    assert (
        compute_pace_status(
            current=Decimal("40000"),
            target=Decimal("100000"),
            deadline=deadline,
            planned_monthly=Decimal("3000"),
            today=today,
        )
        == "BEHIND"
    )


def test_completed_and_overdue_status():
    today = date(2026, 8, 9)
    assert (
        compute_pace_status(
            current=Decimal("100000"),
            target=Decimal("100000"),
            deadline=date(2027, 1, 1),
            planned_monthly=Decimal("5000"),
            today=today,
        )
        == "COMPLETED"
    )
    assert (
        compute_pace_status(
            current=Decimal("50000"),
            target=Decimal("100000"),
            deadline=date(2026, 1, 1),
            planned_monthly=Decimal("5000"),
            today=today,
        )
        == "OVERDUE"
    )


def test_build_goal_metrics_zero_planned():
    metrics = build_goal_metrics(
        target_amount=Decimal("100000"),
        current_amount=Decimal("40000"),
        planned_monthly_contribution=Decimal("0"),
        deadline=date.today() + timedelta(days=300),
        today=date.today(),
    )
    assert metrics["estimated_months"] is None
    assert metrics["pace_status"] == "BEHIND"


def create_goal_payload(**overrides):
    payload = {
        "name": "Laptop",
        "goal_type": "general",
        "target_amount": "80000",
        "current_amount": "30000",
        "planned_monthly_contribution": "5000",
        "months_until_deadline": 12,
        "description": "Work laptop",
    }
    payload.update(overrides)
    return payload


def test_create_goal(client, user_headers):
    response = client.post("/api/v1/goals", json=create_goal_payload(), headers=user_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Laptop"
    assert data["metrics"]["pace_status"] in {"AHEAD", "ON_TRACK", "BEHIND", "COMPLETED", "OVERDUE"}
    assert Decimal(data["metrics"]["progress_percentage"]) == Decimal("37.50")


def test_goal_user_isolation(client, db, user_headers):
    created = client.post("/api/v1/goals", json=create_goal_payload(), headers=user_headers)
    goal_id = created.json()["id"]

    other_headers = auth_headers(db, f"other-{uuid4().hex[:8]}@example.com")
    response = client.get(f"/api/v1/goals/{goal_id}", headers=other_headers)
    assert response.status_code == 404


def test_invalid_target_amount(client, user_headers):
    response = client.post(
        "/api/v1/goals",
        json=create_goal_payload(target_amount="0"),
        headers=user_headers,
    )
    assert response.status_code == 422


def test_add_contribution_updates_current_amount(client, user_headers):
    created = client.post("/api/v1/goals", json=create_goal_payload(), headers=user_headers)
    goal_id = created.json()["id"]

    response = client.post(
        f"/api/v1/goals/{goal_id}/contributions",
        json={"amount": "10000"},
        headers=user_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["current_amount"] == "40000.00"
    assert len(data["contributions"]) == 1


def test_emergency_fund_uniqueness(client, user_headers):
    first = client.post(
        "/api/v1/goals",
        json=create_goal_payload(name="Emergency Fund", goal_type="emergency_fund"),
        headers=user_headers,
    )
    assert first.status_code == 201

    second = client.post(
        "/api/v1/goals",
        json=create_goal_payload(name="Emergency Fund 2", goal_type="emergency_fund"),
        headers=user_headers,
    )
    assert second.status_code == 409


def test_archive_goal(client, user_headers):
    created = client.post("/api/v1/goals", json=create_goal_payload(), headers=user_headers)
    goal_id = created.json()["id"]

    archived = client.post(f"/api/v1/goals/{goal_id}/archive", headers=user_headers)
    assert archived.status_code == 200
    assert archived.json()["status"] == "archived"

    listed = client.get("/api/v1/goals", headers=user_headers)
    assert all(goal["id"] != goal_id for goal in listed.json()["goals"])


def test_goal_linked_money_allocation(client, user_headers):
    today = date.today()
    client.post(
        f"/api/v1/money/{today.year}/{today.month}/income",
        json={"amount": "100000"},
        headers=user_headers,
    )

    created = client.post("/api/v1/goals", json=create_goal_payload(), headers=user_headers)
    goal_id = created.json()["id"]

    month = client.get(f"/api/v1/money/{today.year}/{today.month}", headers=user_headers)
    assert month.status_code == 200
    allocations = month.json()["allocations"]
    goal_lines = [line for line in allocations if line.get("goal_id") == goal_id]
    assert len(goal_lines) == 1
    assert goal_lines[0]["line_type"] == "goal"
    assert goal_lines[0]["amount"] == "5000.00"


def test_update_planned_contribution_preserves_history(client, user_headers):
    today = date.today()
    prev_year, prev_month = (today.year, today.month - 1) if today.month > 1 else (today.year - 1, 12)

    created = client.post("/api/v1/goals", json=create_goal_payload(), headers=user_headers)
    goal_id = created.json()["id"]

    client.post(
        f"/api/v1/money/{prev_year}/{prev_month}/income",
        json={"amount": "100000"},
        headers=user_headers,
    )
    allocation_response = client.put(
        f"/api/v1/money/{prev_year}/{prev_month}/allocation",
        json={"items": [{"goal_id": goal_id, "amount": "5000"}]},
        headers=user_headers,
    )
    assert allocation_response.status_code == 200

    client.post(
        f"/api/v1/money/{today.year}/{today.month}/income",
        json={"amount": "100000"},
        headers=user_headers,
    )

    client.patch(
        f"/api/v1/goals/{goal_id}",
        json={"planned_monthly_contribution": "7000"},
        headers=user_headers,
    )

    previous_month = client.get(f"/api/v1/money/{prev_year}/{prev_month}", headers=user_headers)
    prev_goal_line = next(
        line for line in previous_month.json()["allocations"] if line.get("goal_id") == goal_id
    )
    assert prev_goal_line["amount"] == "5000.00"

    current_month = client.get(f"/api/v1/money/{today.year}/{today.month}", headers=user_headers)
    current_goal_line = next(
        line for line in current_month.json()["allocations"] if line.get("goal_id") == goal_id
    )
    assert current_goal_line["amount"] == "7000.00"

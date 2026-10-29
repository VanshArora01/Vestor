"""
Regression test — fresh user invariant.

A brand-new user MUST start with:
  - no user-specific Money allocations
  - no user-specific goals
  - zero income
  - zero carryover
  - zero available-to-plan

unless data has been explicitly created for that user.
"""
from decimal import Decimal

import pytest

from app.repositories.goals_repository import GoalsRepository
from app.services.money_service import MoneyService
from tests.conftest import create_user


def test_fresh_user_has_no_income(db):
    user = create_user(db, email="fresh_no_income@example.com")
    service = MoneyService(db)
    res = service.get_current_month_state(user)
    assert res["income"] == "0.00", "Fresh user should have zero income"


def test_fresh_user_has_zero_available_to_plan(db):
    user = create_user(db, email="fresh_zero_atp@example.com")
    service = MoneyService(db)
    res = service.get_current_month_state(user)
    assert res["metrics"]["available_to_plan"] == "0.00"
    assert res["metrics"]["carryover"] == "0.00"


def test_fresh_user_has_no_allocations(db):
    user = create_user(db, email="fresh_no_alloc@example.com")
    service = MoneyService(db)
    res = service.get_current_month_state(user)
    non_zero_allocs = [a for a in res["allocations"] if a.get("amount") not in (None, "0.00")]
    assert non_zero_allocs == [], (
        f"Fresh user should have no non-zero allocations but got: {non_zero_allocs}"
    )


def test_fresh_user_has_no_goals(db):
    user = create_user(db, email="fresh_no_goals@example.com")
    goals_repo = GoalsRepository(db)
    goals = goals_repo.list_goals(user.id)
    assert goals == [], f"Fresh user should have no goals but got: {goals}"


def test_fresh_user_has_no_spending(db):
    user = create_user(db, email="fresh_no_spending@example.com")
    service = MoneyService(db)
    res = service.get_current_month_state(user)
    assert res["spending"] == [], "Fresh user should have no spending records"


def test_fresh_user_has_zero_carryover_in_first_month(db):
    user = create_user(db, email="fresh_carryover_zero@example.com")
    service = MoneyService(db)
    res = service.get_month(user, 2026, 8)
    assert res["metrics"]["carryover"] == "0.00", (
        "First month carryover should be zero for a fresh user"
    )


def test_allocating_emergency_fund_category_does_not_create_goal(db):
    """Setting an allocation against the emergency-fund category must NOT auto-create a Goal."""
    from app.models.money import AllocationCategory

    user = create_user(db, email="fresh_ef_no_goal@example.com")
    service = MoneyService(db)
    goals_repo = GoalsRepository(db)

    service.set_income(user, 2026, 8, "100000.00")

    ef_cat = (
        db.query(AllocationCategory)
        .filter(AllocationCategory.slug == "emergency-fund")
        .first()
    )
    if ef_cat is None:
        pytest.skip("emergency-fund category not seeded — skipping")

    service.set_allocation(
        user, 2026, 8,
        [{"category_id": str(ef_cat.id), "amount": "10000.00"}],
    )

    goals = goals_repo.list_goals(user.id)
    assert goals == [], (
        f"Allocating to emergency-fund category must NOT auto-create goals, got: {goals}"
    )

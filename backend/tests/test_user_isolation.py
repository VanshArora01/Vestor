"""
Regression test -- multi-user isolation.

User A's data must NEVER appear in User B's view, and vice versa.
Tests cover: income, allocations, goals, spending, carryover.
"""
from decimal import Decimal

from app.models.money import AllocationCategory
from app.repositories.goals_repository import GoalsRepository
from app.services.money_service import MoneyService
from tests.conftest import create_user


def test_income_isolation(db):
    user_a = create_user(db, email="iso_income_a@example.com")
    user_b = create_user(db, email="iso_income_b@example.com")
    service = MoneyService(db)

    service.set_income(user_a, 2026, 8, "100000.00")

    res_b = service.get_month(user_b, 2026, 8)
    assert res_b["income"] == "0.00", "User B must not see User A's income"
    assert res_b["metrics"]["available_to_plan"] == "0.00"


def test_allocation_isolation(db):
    user_a = create_user(db, email="iso_alloc_a@example.com")
    user_b = create_user(db, email="iso_alloc_b@example.com")
    service = MoneyService(db)
    cat = db.query(AllocationCategory).filter(AllocationCategory.slug == "others").first()

    service.set_income(user_a, 2026, 8, "100000.00")
    service.set_allocation(user_a, 2026, 8, [{"category_id": str(cat.id), "amount": "50000.00"}])

    res_b = service.get_month(user_b, 2026, 8)
    non_zero = [a for a in res_b["allocations"] if a.get("amount") not in (None, "0.00")]
    assert non_zero == [], f"User B must not see User A's allocations, got: {non_zero}"


def test_goals_isolation(db):
    from app.models.goal import Goal
    from datetime import date

    user_a = create_user(db, email="iso_goals_a@example.com")
    user_b = create_user(db, email="iso_goals_b@example.com")

    # Explicitly create a goal for user A
    goal = Goal(
        user_id=user_a.id,
        name="User A Goal",
        goal_type="savings",
        target_amount=Decimal("500000.00"),
        current_amount=Decimal("0.00"),
        planned_monthly_contribution=Decimal("10000.00"),
        deadline=date(2031, 12, 31),
        status="active",
    )
    db.add(goal)
    db.commit()

    goals_b = GoalsRepository(db).list_goals(user_b.id)
    assert goals_b == [], f"User B must not see User A's goals, got: {goals_b}"


def test_spending_isolation(db):
    user_a = create_user(db, email="iso_spend_a@example.com")
    user_b = create_user(db, email="iso_spend_b@example.com")
    service = MoneyService(db)

    from app.models.money import SpendingCategory
    spend_cat = db.query(SpendingCategory).filter(SpendingCategory.slug == "others").first()
    if spend_cat is None:
        import pytest
        pytest.skip("Others spending category not seeded")

    service.set_income(user_a, 2026, 8, "100000.00")
    service.set_spending(user_a, 2026, 8, [{"category_id": str(spend_cat.id), "amount": "30000.00"}])

    res_b = service.get_month(user_b, 2026, 8)
    assert res_b["spending"] == [], f"User B must not see User A's spending, got: {res_b['spending']}"


def test_carryover_isolation(db):
    user_a = create_user(db, email="iso_carry_a@example.com")
    user_b = create_user(db, email="iso_carry_b@example.com")
    service = MoneyService(db)
    cat = db.query(AllocationCategory).filter(AllocationCategory.slug == "others").first()

    # User A: Aug income=100k, allocated=60k => carryover to Sep = 40k
    service.set_income(user_a, 2026, 8, "100000.00")
    service.set_allocation(user_a, 2026, 8, [{"category_id": str(cat.id), "amount": "60000.00"}])
    service.lock_month_service(user_a, 2026, 8)

    res_b = service.get_month(user_b, 2026, 9)
    assert res_b["metrics"]["carryover"] == "0.00", (
        "User B must not see User A's carryover, got: " + res_b["metrics"]["carryover"]
    )


def test_two_users_independent_plans(db):
    """User A and User B can have different plans for the same month independently."""
    user_a = create_user(db, email="iso_plan_a@example.com")
    user_b = create_user(db, email="iso_plan_b@example.com")
    service = MoneyService(db)
    cat = db.query(AllocationCategory).filter(AllocationCategory.slug == "others").first()

    service.set_income(user_a, 2026, 8, "100000.00")
    service.set_income(user_b, 2026, 8, "50000.00")
    service.set_allocation(user_a, 2026, 8, [{"category_id": str(cat.id), "amount": "80000.00"}])
    service.set_allocation(user_b, 2026, 8, [{"category_id": str(cat.id), "amount": "30000.00"}])

    res_a = service.get_month(user_a, 2026, 8)
    res_b = service.get_month(user_b, 2026, 8)

    assert res_a["income"] == "100000.00"
    assert res_b["income"] == "50000.00"
    assert res_a["metrics"]["allocated_total"] == "80000.00"
    assert res_b["metrics"]["allocated_total"] == "30000.00"

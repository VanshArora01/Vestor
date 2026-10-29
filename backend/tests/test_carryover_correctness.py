"""
Regression test -- carryover correctness.

Verifies the canonical carryover formula:
  carryover(M) = ATP(M-1) - allocated(M-1)

Spending is NEVER subtracted from ATP or from the carryover.
"""
from decimal import Decimal

from app.models.money import AllocationCategory, MonthlyFinance
from app.services.money_service import MoneyService
from tests.conftest import create_user


def test_positive_carryover_after_lock(db):
    """August: income=100k, allocated=80k => remaining=20k => Sept carryover=20k."""
    user = create_user(db, email="carryover_positive@example.com")
    service = MoneyService(db)
    cat = db.query(AllocationCategory).filter(AllocationCategory.slug == "others").first()

    service.set_income(user, 2026, 8, "100000.00")
    service.set_allocation(user, 2026, 8, [{"category_id": str(cat.id), "amount": "80000.00"}])
    service.lock_month_service(user, 2026, 8)

    res = service.get_month(user, 2026, 9)
    assert res["metrics"]["carryover"] == "20000.00"
    assert res["metrics"]["available_to_plan"] == "20000.00"


def test_zero_carryover_when_fully_allocated(db):
    """August: income=100k, allocated=100k => remaining=0 => Sept carryover=0."""
    user = create_user(db, email="carryover_zero@example.com")
    service = MoneyService(db)
    cat = db.query(AllocationCategory).filter(AllocationCategory.slug == "others").first()

    service.set_income(user, 2026, 8, "100000.00")
    service.set_allocation(user, 2026, 8, [{"category_id": str(cat.id), "amount": "100000.00"}])
    service.lock_month_service(user, 2026, 8)

    res = service.get_month(user, 2026, 9)
    assert res["metrics"]["carryover"] == "0.00"


def test_spending_does_not_reduce_carryover(db):
    """Spending is separate from allocations and must NOT reduce the carryover snapshot."""
    user = create_user(db, email="carryover_spending@example.com")
    service = MoneyService(db)
    alloc_cat = db.query(AllocationCategory).filter(AllocationCategory.slug == "others").first()

    from app.models.money import SpendingCategory
    spend_cat = db.query(SpendingCategory).filter(SpendingCategory.slug == "others").first()

    service.set_income(user, 2026, 8, "100000.00")
    service.set_allocation(user, 2026, 8, [{"category_id": str(alloc_cat.id), "amount": "60000.00"}])

    if spend_cat is not None:
        service.set_spending(user, 2026, 8, [{"category_id": str(spend_cat.id), "amount": "25000.00"}])

    service.lock_month_service(user, 2026, 8)

    # Carryover = ATP - allocated = 100k - 60k = 40k (spending=25k NOT subtracted)
    res = service.get_month(user, 2026, 9)
    assert res["metrics"]["carryover"] == "40000.00", (
        "Spending must not reduce carryover; carryover = ATP - allocated only"
    )


def test_negative_carryover_propagates(db):
    """
    Sept: income=95k, allocated=120k (> available 120k = 20k carryover + 100k income),
    so after locking, Oct carryover = 120k - 120k = 0.
    But if we force allocations > ATP, the service raises ALLOCATION_EXCEEDS_INCOME.
    So we test: Sept carryover 20k + income 95k = 115k ATP, allocate 120k => error.
    Instead test: lock with allocated = ATP exactly, then reduce income in DB.
    """
    user = create_user(db, email="carryover_negative@example.com")
    service = MoneyService(db)
    cat = db.query(AllocationCategory).filter(AllocationCategory.slug == "others").first()

    # Aug: income=100k, allocated=80k, carryover to Sep = 20k
    service.set_income(user, 2026, 8, "100000.00")
    service.set_allocation(user, 2026, 8, [{"category_id": str(cat.id), "amount": "80000.00"}])
    service.lock_month_service(user, 2026, 8)

    # Sep: carryover=20k, income=100k => ATP=120k. Allocate exactly 120k.
    service.set_income(user, 2026, 9, "100000.00")
    service.set_allocation(user, 2026, 9, [{"category_id": str(cat.id), "amount": "120000.00"}])

    # Directly drop Sep income to 95k to simulate negative scenario
    sep_rec = db.query(MonthlyFinance).filter(
        MonthlyFinance.user_id == user.id,
        MonthlyFinance.year == 2026,
        MonthlyFinance.month == 9,
    ).first()
    sep_rec.income = Decimal("95000.00")
    db.commit()

    service.lock_month_service(user, 2026, 9)

    # ATP_sep = carryover(20k) + income(95k) = 115k; allocated=120k => remaining = -5k
    res_oct = service.get_month(user, 2026, 10)
    assert res_oct["metrics"]["carryover"] == "-5000.00", (
        "Negative carryover must propagate correctly to next month"
    )
    assert res_oct["metrics"]["available_to_plan"] == "95000.00"


def test_carryover_is_frozen_after_lock(db):
    """Once locked, carryover snapshot must not change even if previous month income changes."""
    user = create_user(db, email="carryover_frozen@example.com")
    service = MoneyService(db)
    cat = db.query(AllocationCategory).filter(AllocationCategory.slug == "others").first()

    service.set_income(user, 2026, 8, "100000.00")
    service.set_allocation(user, 2026, 8, [{"category_id": str(cat.id), "amount": "80000.00"}])
    service.lock_month_service(user, 2026, 8)

    # Frozen carryover for Sep = 20k
    res_before = service.get_month(user, 2026, 9)
    assert res_before["metrics"]["carryover"] == "20000.00"

    # Tamper with Aug income after locking (should not affect frozen Sept carryover)
    aug_rec = db.query(MonthlyFinance).filter(
        MonthlyFinance.user_id == user.id,
        MonthlyFinance.year == 2026,
        MonthlyFinance.month == 8,
    ).first()
    aug_rec.income = Decimal("200000.00")
    db.commit()

    # Sept carryover must remain frozen at 20k
    res_after = service.get_month(user, 2026, 9)
    assert res_after["metrics"]["carryover"] == "20000.00", (
        "Carryover must be frozen from the lock-time snapshot, not recomputed"
    )

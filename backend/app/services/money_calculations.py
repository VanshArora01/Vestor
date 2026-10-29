from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any


TWO_PLACES = Decimal("0.01")
HUNDRED = Decimal("100")


def quantize_money(value: Decimal) -> Decimal:
    return value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def money_to_str(value: Decimal | None) -> str | None:
    if value is None:
        return None
    return format(quantize_money(value), "f")


def parse_money(value: str | Decimal) -> Decimal:
    if isinstance(value, Decimal):
        return quantize_money(value)
    return quantize_money(Decimal(str(value)))


def sum_amounts(amounts: list[Decimal]) -> Decimal:
    total = Decimal("0")
    for amount in amounts:
        total += amount
    return quantize_money(total)


def pct_of(part: Decimal, whole: Decimal) -> Decimal | None:
    if whole <= 0:
        return None
    return quantize_money((part / whole) * HUNDRED)


def pct_change(current: Decimal, previous: Decimal) -> Decimal | None:
    if previous == 0:
        return None
    return quantize_money(((current - previous) / previous) * HUNDRED)


def build_month_metrics(
    *,
    income: Decimal | None,
    carryover: Decimal | None = None,
    confirmed_income: Decimal | None = None,
    manual_income_adjustment: Decimal | None = None,
    allocated_total: Decimal,
    spending_total: Decimal,
    is_connected: bool = False,
) -> dict[str, Any]:
    """Build the metrics payload for a monthly finance record.

    Architecture Contract:
    - ATP = carryover + income  (spending does NOT reduce ATP)
    - Unallocated = ATP - allocated_total  (how much of the plan is left to assign)
    - Spending is the *actual* outflow, tracked separately for reporting.
    - money_available = ATP - allocated - spending  (purely informational: what's
      left in the account after both planned allocations AND actual spending)
    - exceeds_income reflects whether allocated+spending combined exceed ATP,
      surfaced to the UI as a warning only.
    """
    carryover_val = carryover or Decimal("0")
    income_val = income or Decimal("0")

    # Available to Plan = carryover + income.  Spending does NOT reduce this.
    available_to_plan = quantize_money(carryover_val + income_val)

    # Unallocated = how much of the plan remains to be assigned.
    unallocated = quantize_money(available_to_plan - allocated_total)
    remaining_allocation = unallocated

    # money_available_before_spending = unallocated (spending not yet deducted here)
    money_available_before_spending = unallocated

    # Informational: cash remaining after both the plan (allocated) and actual spending.
    raw_money_available = quantize_money(available_to_plan - allocated_total - spending_total)
    money_available = quantize_money(max(Decimal("0"), raw_money_available))

    # Warning flag: combined allocated + actual spending exceeds ATP.
    exceeds_income = (allocated_total + spending_total) > available_to_plan
    excess_amount = (
        quantize_money(allocated_total + spending_total - available_to_plan)
        if exceeds_income
        else None
    )

    allocation_complete = (
        available_to_plan > 0 and allocated_total == available_to_plan
    )
    allocation_exceeds = allocated_total > available_to_plan

    return {
        "income": money_to_str(income),
        "carryover": money_to_str(carryover_val),
        "confirmed_income": money_to_str(confirmed_income),
        "manual_income_adjustment": money_to_str(manual_income_adjustment),
        "available_to_plan": money_to_str(available_to_plan),
        "unallocated": money_to_str(unallocated),
        "allocated_total": money_to_str(allocated_total),
        "remaining_allocation": money_to_str(remaining_allocation),
        "money_available_before_spending": money_to_str(money_available_before_spending),
        "allocation_percentage": money_to_str(pct_of(allocated_total, available_to_plan))
        if available_to_plan > 0
        else None,
        "allocation_complete": allocation_complete,
        "allocation_exceeds_income": allocation_exceeds,
        "spending_total": money_to_str(spending_total),
        "money_available": money_to_str(money_available),
        "exceeds_income": exceeds_income,
        "excess_amount": money_to_str(excess_amount),
        "surplus": money_to_str(money_available),
        "spending_percentage": money_to_str(pct_of(spending_total, available_to_plan))
        if available_to_plan > 0
        else None,
        "savings_rate": money_to_str(pct_of(money_available, available_to_plan))
        if available_to_plan > 0
        else None,
    }


def build_comparison_metrics(
    *,
    current_income: Decimal | None,
    previous_income: Decimal | None,
    current_allocated: Decimal,
    previous_allocated: Decimal,
    current_spending: Decimal,
    previous_spending: Decimal,
) -> dict[str, Any]:
    current_income_value = current_income or Decimal("0")
    previous_income_value = previous_income or Decimal("0")
    current_raw_available = (
        quantize_money(current_income_value - current_allocated - current_spending)
        if current_income is not None
        else None
    )
    previous_raw_available = (
        quantize_money(previous_income_value - previous_allocated - previous_spending)
        if previous_income is not None
        else None
    )
    current_surplus = (
        quantize_money(max(Decimal("0"), current_raw_available))
        if current_raw_available is not None
        else None
    )
    previous_surplus = (
        quantize_money(max(Decimal("0"), previous_raw_available))
        if previous_raw_available is not None
        else None
    )

    income_change = None
    spending_change = None
    surplus_change = None
    if current_income is not None and previous_income is not None:
        income_change = quantize_money(current_income_value - previous_income_value)
    if previous_spending is not None:
        spending_change = quantize_money(current_spending - previous_spending)
    if current_surplus is not None and previous_surplus is not None:
        surplus_change = quantize_money(current_surplus - previous_surplus)

    return {
        "current": {
            "income": money_to_str(current_income),
            "spending": money_to_str(current_spending),
            "surplus": money_to_str(current_surplus),
        },
        "previous": {
            "income": money_to_str(previous_income),
            "spending": money_to_str(previous_spending),
            "surplus": money_to_str(previous_surplus),
        },
        "changes": {
            "income": money_to_str(income_change),
            "income_pct": money_to_str(pct_change(current_income_value, previous_income_value))
            if income_change is not None
            else None,
            "spending": money_to_str(spending_change),
            "spending_pct": money_to_str(pct_change(current_spending, previous_spending))
            if spending_change is not None
            else None,
            "surplus": money_to_str(surplus_change),
            "surplus_pct": money_to_str(pct_change(current_surplus, previous_surplus))
            if surplus_change is not None and previous_surplus is not None and previous_surplus != 0
            else None,
        },
    }

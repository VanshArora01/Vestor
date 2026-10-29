from __future__ import annotations

from calendar import monthrange
from datetime import date
from decimal import Decimal, ROUND_CEILING
from typing import Any

from app.services.money_calculations import money_to_str, quantize_money

GOAL_TYPES = frozenset({"general", "emergency_fund"})
GOAL_STATUSES = frozenset({"active", "archived", "completed"})
PACE_STATUSES = frozenset({"AHEAD", "ON_TRACK", "BEHIND", "COMPLETED", "OVERDUE"})
PACE_BAND = Decimal("0.05")


def months_between(start: date, end: date) -> int:
    """Inclusive month count from start through end (minimum 0)."""
    if end < start:
        return 0
    return (end.year - start.year) * 12 + (end.month - start.month) + 1


def add_months(base: date, months: int) -> date:
    year = base.year + (base.month - 1 + months) // 12
    month = (base.month - 1 + months) % 12 + 1
    day = min(base.day, monthrange(year, month)[1])
    return date(year, month, day)


def compute_progress_percentage(current: Decimal, target: Decimal) -> Decimal:
    if target <= 0:
        return Decimal("0")
    pct = (current / target) * Decimal("100")
    return quantize_money(min(pct, Decimal("100")))


def compute_remaining_amount(target: Decimal, current: Decimal) -> Decimal:
    return quantize_money(max(Decimal("0"), target - current))


def compute_required_monthly(remaining: Decimal, months_remaining: int) -> Decimal | None:
    if remaining <= 0:
        return Decimal("0")
    if months_remaining <= 0:
        return None
    return quantize_money(remaining / Decimal(months_remaining))


def compute_estimated_months(remaining: Decimal, planned_monthly: Decimal) -> int | None:
    if remaining <= 0:
        return 0
    if planned_monthly <= 0:
        return None
    months = (remaining / planned_monthly).to_integral_value(rounding=ROUND_CEILING)
    return int(months)


def compute_pace_status(
    *,
    current: Decimal,
    target: Decimal,
    deadline: date,
    planned_monthly: Decimal,
    today: date | None = None,
) -> str:
    reference = today or date.today()
    if current >= target:
        return "COMPLETED"
    if deadline < reference and current < target:
        return "OVERDUE"

    remaining = compute_remaining_amount(target, current)
    months_left = months_between(reference, deadline)
    required = compute_required_monthly(remaining, months_left)

    if required is None:
        return "OVERDUE"
    if required <= 0:
        return "COMPLETED"
    if planned_monthly <= 0:
        return "BEHIND"

    lower = required * (Decimal("1") - PACE_BAND)
    upper = required * (Decimal("1") + PACE_BAND)
    if planned_monthly > upper:
        return "AHEAD"
    if planned_monthly >= lower:
        return "ON_TRACK"
    return "BEHIND"


def build_goal_metrics(
    *,
    target_amount: Decimal,
    current_amount: Decimal,
    planned_monthly_contribution: Decimal,
    deadline: date,
    today: date | None = None,
) -> dict[str, Any]:
    reference = today or date.today()
    progress = compute_progress_percentage(current_amount, target_amount)
    remaining = compute_remaining_amount(target_amount, current_amount)
    months_left = months_between(reference, deadline)
    required_monthly = compute_required_monthly(remaining, months_left)
    estimated_months = compute_estimated_months(remaining, planned_monthly_contribution)
    estimated_completion = (
        add_months(reference, estimated_months) if estimated_months is not None else None
    )
    pace_status = compute_pace_status(
        current=current_amount,
        target=target_amount,
        deadline=deadline,
        planned_monthly=planned_monthly_contribution,
        today=reference,
    )

    deadline_reachable = False
    if pace_status == "COMPLETED":
        deadline_reachable = True
    elif required_monthly is not None and planned_monthly_contribution > 0:
        deadline_reachable = planned_monthly_contribution >= required_monthly

    monthly_gap = None
    if required_monthly is not None and planned_monthly_contribution > 0:
        monthly_gap = quantize_money(required_monthly - planned_monthly_contribution)

    return {
        "progress_percentage": money_to_str(progress),
        "remaining_amount": money_to_str(remaining),
        "months_remaining": months_left,
        "required_monthly_contribution": money_to_str(required_monthly)
        if required_monthly is not None
        else None,
        "planned_monthly_contribution": money_to_str(planned_monthly_contribution),
        "estimated_months": estimated_months,
        "estimated_completion_date": estimated_completion.isoformat()
        if estimated_completion is not None
        else None,
        "pace_status": pace_status,
        "deadline_reachable_at_plan": deadline_reachable,
        "monthly_gap": money_to_str(monthly_gap) if monthly_gap is not None else None,
    }

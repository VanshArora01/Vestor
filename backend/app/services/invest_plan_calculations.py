"""Money Plan ↔ Invest planned-vs-actual mapping (I5).

Money Plan = intent. Invest = actual. No FK between domains.
"""

from __future__ import annotations

from decimal import Decimal

from app.services.money_calculations import HUNDRED, money_to_str, quantize_money

# Explicit Money allocation slug → Invest asset_type(s).
# Only these categories participate in I5 planned-vs-actual.
# ETFs: Money seed has no ETF allocation category — not mapped in I5.
# Gold/FD/PPF/NPS: not Money investment-plan categories — excluded.
INVEST_PLAN_SLUG_TO_ASSET_TYPES: dict[str, frozenset[str]] = {
    "stocks": frozenset({"stock"}),
    "mutual-funds": frozenset({"mutual_fund"}),
}

# Display order for API categories
INVEST_PLAN_CATEGORY_ORDER: tuple[str, ...] = ("stocks", "mutual-funds")

PLAN_STATUSES = frozenset({"not_started", "under_plan", "complete", "over_plan"})


def plan_status(*, planned: Decimal, actual: Decimal) -> str:
    planned = quantize_money(planned)
    actual = quantize_money(actual)
    if actual <= 0:
        return "not_started"
    if planned <= 0:
        # Invested with no plan for this category
        return "over_plan"
    if actual < planned:
        return "under_plan"
    if actual == planned:
        return "complete"
    return "over_plan"


def remaining_amount(*, planned: Decimal, actual: Decimal) -> Decimal:
    diff = quantize_money(planned) - quantize_money(actual)
    return quantize_money(diff) if diff > 0 else Decimal("0.00")


def over_invested_amount(*, planned: Decimal, actual: Decimal) -> Decimal:
    diff = quantize_money(actual) - quantize_money(planned)
    return quantize_money(diff) if diff > 0 else Decimal("0.00")


def percentage_of_plan(*, planned: Decimal, actual: Decimal) -> Decimal | None:
    planned = quantize_money(planned)
    if planned <= 0:
        return None
    return quantize_money((quantize_money(actual) / planned) * HUNDRED)


def category_row(
    *,
    category_name: str,
    category_slug: str,
    planned: Decimal,
    actual: Decimal,
) -> dict:
    planned = quantize_money(planned)
    actual = quantize_money(actual)
    remaining = remaining_amount(planned=planned, actual=actual)
    over = over_invested_amount(planned=planned, actual=actual)
    pct = percentage_of_plan(planned=planned, actual=actual)
    return {
        "category": category_name,
        "category_slug": category_slug,
        "planned": money_to_str(planned) or "0.00",
        "actual": money_to_str(actual) or "0.00",
        "remaining": money_to_str(remaining) or "0.00",
        "over_invested": money_to_str(over) or "0.00",
        "percentage_of_plan": money_to_str(pct),
        "status": plan_status(planned=planned, actual=actual),
        "asset_types": sorted(INVEST_PLAN_SLUG_TO_ASSET_TYPES[category_slug]),
    }

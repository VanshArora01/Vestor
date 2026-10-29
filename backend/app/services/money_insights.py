from __future__ import annotations

from decimal import Decimal
from typing import Any

from app.services.money_calculations import money_to_str, pct_change, quantize_money, sum_amounts
from app.services.money_thresholds import (
    CATEGORY_SPENDING_INCREASE_MIN_AMOUNT,
    CATEGORY_SPENDING_INCREASE_PCT,
    EMERGENCY_ALLOCATION_INCREASE_PCT,
    EMERGENCY_ALLOCATION_SLUG,
    INVESTMENT_ALLOCATION_DECREASE_PCT,
    INVESTMENT_ALLOCATION_SLUGS,
)


def _signal(
    signal_type: str,
    severity: str,
    data: dict[str, Any],
    message: str,
    headline: str | None = None,
    body: str | None = None,
) -> dict[str, Any]:
    return {
        "type": signal_type,
        "severity": severity,
        "data": data,
        "message": message,
        "headline": headline or message,
        "body": body or message,
    }


def detect_insights(
    *,
    current_income: Decimal | None,
    previous_income: Decimal | None,
    current_spending_by_category: dict[str, dict[str, Any]],
    previous_spending_by_category: dict[str, dict[str, Any]],
    current_allocation_by_slug: dict[str, Decimal],
    previous_allocation_by_slug: dict[str, Decimal],
) -> list[dict[str, Any]]:
    signals: list[dict[str, Any]] = []

    for category_id, current in current_spending_by_category.items():
        previous = previous_spending_by_category.get(category_id)
        if previous is None:
            continue
        current_amount = current["amount"]
        previous_amount = previous["amount"]
        if previous_amount <= 0:
            continue
        change = quantize_money(current_amount - previous_amount)
        change_pct = pct_change(current_amount, previous_amount)
        if change <= 0 or change_pct is None:
            continue
        if change >= CATEGORY_SPENDING_INCREASE_MIN_AMOUNT and change_pct >= CATEGORY_SPENDING_INCREASE_PCT:
            signals.append(
                _signal(
                    "category_spending_increased",
                    "medium",
                    {
                        "category_id": category_id,
                        "category_name": current["name"],
                        "previous_amount": money_to_str(previous_amount),
                        "current_amount": money_to_str(current_amount),
                        "change": money_to_str(change),
                        "change_pct": money_to_str(change_pct),
                    },
                    f"{current['name']} spending increased by ₹{money_to_str(change)} compared with last month.",
                    headline=f"{current['name']} spending up by ₹{money_to_str(change)}",
                    body=f"You spent ₹{money_to_str(current_amount)} on {current['name']} this month, up ₹{money_to_str(change)} ({money_to_str(change_pct)}%) from ₹{money_to_str(previous_amount)} last month.",
                )
            )

    if current_income is not None and previous_income is not None:
        current_income_value = current_income
        previous_income_value = previous_income
        current_spending_total = sum_amounts(
            [item["amount"] for item in current_spending_by_category.values()]
        )
        previous_spending_total = sum_amounts(
            [item["amount"] for item in previous_spending_by_category.values()]
        )
        income_change = quantize_money(current_income_value - previous_income_value)
        spending_change = quantize_money(current_spending_total - previous_spending_total)
        if (
            income_change > 0
            and spending_change > income_change
            and previous_spending_total > 0
        ):
            outpaced_by = quantize_money(spending_change - income_change)
            signals.append(
                _signal(
                    "expense_growth_outpaced_income",
                    "high",
                    {
                        "income_change": money_to_str(income_change),
                        "expense_change": money_to_str(spending_change),
                        "outpaced_by": money_to_str(outpaced_by),
                    },
                    f"Spending increased by ₹{money_to_str(spending_change)}, outpacing income growth of ₹{money_to_str(income_change)} by ₹{money_to_str(outpaced_by)}.",
                    headline=f"Spending outpaced income by ₹{money_to_str(outpaced_by)}",
                    body=f"Monthly spending grew by ₹{money_to_str(spending_change)} while income grew by ₹{money_to_str(income_change)}, creating a ₹{money_to_str(outpaced_by)} net drift.",
                )
            )

    if current_income is not None and current_income > 0 and previous_income is not None and previous_income > 0:
        current_investment = sum_amounts(
            [current_allocation_by_slug.get(slug, Decimal("0")) for slug in INVESTMENT_ALLOCATION_SLUGS]
        )
        previous_investment = sum_amounts(
            [previous_allocation_by_slug.get(slug, Decimal("0")) for slug in INVESTMENT_ALLOCATION_SLUGS]
        )
        current_pct = (current_investment / current_income) * Decimal("100")
        previous_pct = (previous_investment / previous_income) * Decimal("100")
        pct_point_change = quantize_money(previous_pct - current_pct)
        if pct_point_change >= INVESTMENT_ALLOCATION_DECREASE_PCT:
            signals.append(
                _signal(
                    "investment_allocation_decreased",
                    "medium",
                    {
                        "previous_allocation": money_to_str(previous_investment),
                        "current_allocation": money_to_str(current_investment),
                        "pct_point_change": money_to_str(pct_point_change),
                    },
                    f"Investment allocation fell by {money_to_str(pct_point_change)} percentage points of income.",
                    headline=f"Investments down {money_to_str(pct_point_change)}% of income",
                    body=f"Allocated investment dropped from ₹{money_to_str(previous_investment)} to ₹{money_to_str(current_investment)}, declining {money_to_str(pct_point_change)}% as a share of income.",
                )
            )

        current_emergency = current_allocation_by_slug.get(EMERGENCY_ALLOCATION_SLUG, Decimal("0"))
        previous_emergency = previous_allocation_by_slug.get(EMERGENCY_ALLOCATION_SLUG, Decimal("0"))
        current_emergency_pct = (current_emergency / current_income) * Decimal("100")
        previous_emergency_pct = (previous_emergency / previous_income) * Decimal("100")
        emergency_pct_change = quantize_money(current_emergency_pct - previous_emergency_pct)
        if emergency_pct_change >= EMERGENCY_ALLOCATION_INCREASE_PCT:
            signals.append(
                _signal(
                    "emergency_allocation_increased",
                    "low",
                    {
                        "previous_allocation": money_to_str(previous_emergency),
                        "current_allocation": money_to_str(current_emergency),
                        "pct_point_change": money_to_str(emergency_pct_change),
                    },
                    f"Emergency Fund allocation increased by {money_to_str(emergency_pct_change)} percentage points of income.",
                    headline=f"Emergency Fund boosted +{money_to_str(emergency_pct_change)}%",
                    body=f"Emergency Fund commitment increased from ₹{money_to_str(previous_emergency)} to ₹{money_to_str(current_emergency)} (+{money_to_str(emergency_pct_change)}% of income).",
                )
            )

    return signals

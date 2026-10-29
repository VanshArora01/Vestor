from __future__ import annotations

from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from app.services.money_calculations import HUNDRED, money_to_str, quantize_money

SIX_PLACES = Decimal("0.000001")
SEARCHABLE_ASSET_TYPES = frozenset({"stock", "mutual_fund", "etf"})
ASSET_TYPES = frozenset(
    {"stock", "mutual_fund", "etf", "gold", "fd", "ppf", "nps", "other"}
)
INSTRUMENT_ASSET_TYPES = frozenset({"stock", "mutual_fund", "etf"})
MANUAL_ASSET_TYPES = frozenset({"ppf", "nps", "other"})
VALUATION_MODES = frozenset({"market", "benchmark", "deterministic", "manual"})
FD_COMPOUNDING = frozenset({"simple", "monthly", "quarterly", "yearly"})
TRANSACTION_TYPES_I1 = frozenset({"buy"})
HOLDING_STATUSES = frozenset({"open", "closed"})
GOLD_UNITS = frozenset({"grams"})


def quantize_units(value: Decimal) -> Decimal:
    return value.quantize(SIX_PLACES, rounding=ROUND_HALF_UP)


def units_to_str(value: Decimal | None) -> str | None:
    if value is None:
        return None
    return format(quantize_units(value), "f")


def parse_units(value: str | Decimal) -> Decimal:
    if isinstance(value, Decimal):
        return quantize_units(value)
    return quantize_units(Decimal(str(value)))


def valuation_mode_for_asset_type(asset_type: str) -> str:
    if asset_type in INSTRUMENT_ASSET_TYPES:
        return "market"
    if asset_type == "gold":
        return "benchmark"
    if asset_type == "fd":
        return "deterministic"
    return "manual"


def compute_lot_amount(*, quantity: Decimal, unit_price: Decimal) -> Decimal:
    return quantize_money(quantity * unit_price)


def aggregate_buy_lots(
    quantities: list[Decimal],
    amounts: list[Decimal],
) -> dict[str, Decimal]:
    total_quantity = Decimal("0")
    for qty in quantities:
        total_quantity += qty
    total_quantity = quantize_units(total_quantity)

    total_invested = Decimal("0")
    for amount in amounts:
        total_invested += amount
    total_invested = quantize_money(total_invested)

    average_cost = Decimal("0")
    if total_quantity > 0:
        average_cost = quantize_units(total_invested / total_quantity)

    return {
        "quantity": total_quantity,
        "total_invested": total_invested,
        "average_cost": average_cost,
    }


def compute_gain_loss(
    *,
    total_invested: Decimal,
    current_value: Decimal | None,
) -> Decimal | None:
    if current_value is None:
        return None
    return quantize_money(current_value - total_invested)


def compute_return_pct(
    *,
    total_invested: Decimal,
    current_value: Decimal | None,
) -> Decimal | None:
    if current_value is None or total_invested <= 0:
        return None
    gain = compute_gain_loss(total_invested=total_invested, current_value=current_value)
    if gain is None:
        return None
    return quantize_money((gain / total_invested) * HUNDRED)


def compute_portfolio_return_pct(
    *,
    total_invested: Decimal,
    total_current_value: Decimal | None,
) -> Decimal | None:
    """Portfolio return from totals — never average holding return percentages."""
    return compute_return_pct(total_invested=total_invested, current_value=total_current_value)


def year_fraction(start: date, end: date) -> Decimal:
    days = (end - start).days
    if days <= 0:
        return Decimal("0")
    return Decimal(days) / Decimal("365")


def compute_fd_values(
    *,
    principal: Decimal,
    annual_interest_rate: Decimal,
    start_date: date,
    maturity_date: date,
    compounding: str,
    as_of: date | None = None,
) -> dict[str, Any]:
    """Deterministic FD estimates. Never labeled as market price."""
    if compounding not in FD_COMPOUNDING:
        raise ValueError(f"Unsupported FD compounding: {compounding}")

    reference = as_of or date.today()
    if reference < start_date:
        reference = start_date
    if reference > maturity_date:
        reference = maturity_date

    rate = annual_interest_rate / HUNDRED
    principal = quantize_money(principal)

    def value_at(target: date) -> Decimal:
        t = year_fraction(start_date, target)
        if t <= 0:
            return principal
        if compounding == "simple":
            return quantize_money(principal * (Decimal("1") + rate * t))
        periods_per_year = {
            "monthly": Decimal("12"),
            "quarterly": Decimal("4"),
            "yearly": Decimal("1"),
        }[compounding]
        base = Decimal("1") + (rate / periods_per_year)
        exponent = periods_per_year * t
        return quantize_money(principal * (base**exponent))

    estimated_current_value = value_at(reference)
    maturity_value = value_at(maturity_date)
    accrued_interest = quantize_money(estimated_current_value - principal)

    return {
        "principal": principal,
        "accrued_interest": accrued_interest,
        "estimated_current_value": estimated_current_value,
        "maturity_value": maturity_value,
        "annual_interest_rate": quantize_money(annual_interest_rate),
        "as_of": reference.isoformat(),
    }


def holding_valuation_snapshot(
    *,
    valuation_mode: str,
    total_invested: Decimal,
    manual_current_value: Decimal | None = None,
    fd_estimate: dict[str, Any] | None = None,
    market_price: Decimal | None = None,
    quantity: Decimal | None = None,
) -> dict[str, Any]:
    """Resolve current value only from real sources — never fabricate market prices."""
    current_value: Decimal | None = None
    value_label: str | None = None

    if valuation_mode == "manual" and manual_current_value is not None:
        current_value = quantize_money(manual_current_value)
        value_label = "manual"
    elif valuation_mode == "deterministic" and fd_estimate is not None:
        current_value = quantize_money(fd_estimate["estimated_current_value"])
        value_label = "estimated"
    elif valuation_mode in {"market", "benchmark"} and market_price is not None and quantity is not None:
        current_value = quantize_money(quantity * market_price)
        value_label = "market" if valuation_mode == "market" else "benchmark"

    gain = compute_gain_loss(total_invested=total_invested, current_value=current_value)
    return_pct = compute_return_pct(total_invested=total_invested, current_value=current_value)

    return {
        "current_value": money_to_str(current_value),
        "absolute_gain_loss": money_to_str(gain),
        "return_pct": money_to_str(return_pct),
        "value_source": value_label,
        "has_current_valuation": current_value is not None,
    }

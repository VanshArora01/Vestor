from decimal import Decimal

import pytest

from app.services.money_calculations import (
    build_month_metrics,
    money_to_str,
    parse_money,
    pct_of,
    quantize_money,
    sum_amounts,
)

pytestmark = pytest.mark.unit


def test_parse_money_avoids_float_drift() -> None:
    assert parse_money("60000.00") == Decimal("60000.00")
    assert parse_money("0.10") + parse_money("0.20") == Decimal("0.30")


def test_sum_amounts_uses_decimal() -> None:
    total = sum_amounts([Decimal("10000.50"), Decimal("20000.25"), Decimal("29999.25")])
    assert total == Decimal("60000.00")


def test_build_month_metrics_money_available() -> None:
    metrics = build_month_metrics(
        income=Decimal("30000"),
        allocated_total=Decimal("22000"),
        spending_total=Decimal("5000"),
    )
    assert metrics["money_available"] == "3000.00"
    assert metrics["money_available_before_spending"] == "8000.00"
    assert metrics["surplus"] == "3000.00"
    assert metrics["exceeds_income"] is False


def test_build_month_metrics_no_spending() -> None:
    metrics = build_month_metrics(
        income=Decimal("30000"),
        allocated_total=Decimal("22000"),
        spending_total=Decimal("0"),
    )
    assert metrics["money_available"] == "8000.00"
    assert metrics["money_available_before_spending"] == "8000.00"


def test_build_month_metrics_fully_allocated() -> None:
    metrics = build_month_metrics(
        income=Decimal("30000"),
        allocated_total=Decimal("30000"),
        spending_total=Decimal("0"),
    )
    assert metrics["money_available"] == "0.00"
    assert metrics["allocation_complete"] is True


def test_build_month_metrics_allocation_and_spending_use_income() -> None:
    metrics = build_month_metrics(
        income=Decimal("30000"),
        allocated_total=Decimal("20000"),
        spending_total=Decimal("10000"),
    )
    assert metrics["money_available"] == "0.00"
    assert metrics["exceeds_income"] is False


def test_build_month_metrics_exceeds_income() -> None:
    metrics = build_month_metrics(
        income=Decimal("30000"),
        allocated_total=Decimal("25000"),
        spending_total=Decimal("6000"),
    )
    assert metrics["money_available"] == "0.00"
    assert metrics["exceeds_income"] is True
    assert metrics["excess_amount"] == "1000.00"


def test_pct_of_returns_none_for_zero_income() -> None:
    assert pct_of(Decimal("100"), Decimal("0")) is None


def test_money_to_str_quantizes() -> None:
    assert money_to_str(Decimal("10.005")) == "10.01"

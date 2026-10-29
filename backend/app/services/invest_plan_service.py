"""I5 integration: derive Money Plan vs Invest actual for a calendar month."""

from __future__ import annotations

import calendar
from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.models.money import AllocationCategory
from app.models.user import User
from app.repositories.invest_repository import InvestRepository
from app.repositories.money_repository import MoneyRepository
from app.services.invest_plan_calculations import (
    INVEST_PLAN_CATEGORY_ORDER,
    INVEST_PLAN_SLUG_TO_ASSET_TYPES,
    category_row,
    over_invested_amount,
    remaining_amount,
)
from app.services.money_calculations import money_to_str, parse_money, quantize_money, sum_amounts


class InvestPlanService:
    """Read-only comparison of Money investment allocations vs Invest BUY amounts.

    Does not mutate Money, Goals, or Invest records.
    """

    def __init__(self, db: Session) -> None:
        self.db = db
        self.money_repo = MoneyRepository(db)
        self.invest_repo = InvestRepository(db)

    def get_plan(self, user: User, *, year: int, month: int) -> dict[str, Any]:
        self._validate_year_month(year, month)
        from_date, to_date = self._month_bounds(year, month)

        planned_by_slug = self._planned_investment_amounts(user.id, year, month)
        actual_by_asset_type = self.invest_repo.sum_buy_amounts_by_asset_type(
            user.id,
            from_date=from_date,
            to_date=to_date,
        )
        category_meta = self._investment_plan_categories(user.id)

        categories: list[dict[str, Any]] = []
        for slug in INVEST_PLAN_CATEGORY_ORDER:
            meta = category_meta.get(slug)
            if meta is None:
                continue
            planned = planned_by_slug.get(slug, Decimal("0.00"))
            asset_types = INVEST_PLAN_SLUG_TO_ASSET_TYPES[slug]
            actual = sum_amounts(
                [actual_by_asset_type.get(asset_type, Decimal("0")) for asset_type in asset_types]
            )
            categories.append(
                category_row(
                    category_name=meta["name"],
                    category_slug=slug,
                    planned=planned,
                    actual=actual,
                )
            )

        total_planned = sum_amounts([parse_money(c["planned"]) for c in categories])
        total_actual = sum_amounts([parse_money(c["actual"]) for c in categories])
        total_remaining = remaining_amount(planned=total_planned, actual=total_actual)
        total_over = over_invested_amount(planned=total_planned, actual=total_actual)

        return {
            "year": year,
            "month": month,
            "month_key": f"{year:04d}-{month:02d}",
            "totals": {
                "planned": money_to_str(total_planned) or "0.00",
                "actual": money_to_str(total_actual) or "0.00",
                "remaining": money_to_str(total_remaining) or "0.00",
                "over_invested": money_to_str(total_over) or "0.00",
            },
            "categories": categories,
        }

    def _planned_investment_amounts(
        self,
        user_id: UUID,
        year: int,
        month: int,
    ) -> dict[str, Decimal]:
        """Sum Money allocation amounts for explicitly mapped investment slugs."""
        record = self.money_repo.get_month(user_id, year, month)
        planned: dict[str, Decimal] = {
            slug: Decimal("0.00") for slug in INVEST_PLAN_SLUG_TO_ASSET_TYPES
        }
        if record is None:
            return planned

        for allocation in record.allocations:
            # Goal-linked lines belong to Goals, not Invest planned-vs-actual.
            if allocation.category_id is None or allocation.goal_id is not None:
                continue
            category = allocation.category
            if category is None:
                continue
            slug = category.slug
            if slug not in INVEST_PLAN_SLUG_TO_ASSET_TYPES:
                continue
            if category.semantic_type != "investment":
                continue
            planned[slug] = quantize_money(planned[slug] + allocation.amount)
        return planned

    def _investment_plan_categories(self, user_id: UUID) -> dict[str, dict[str, str]]:
        rows = (
            self.db.query(AllocationCategory)
            .filter(
                AllocationCategory.slug.in_(tuple(INVEST_PLAN_SLUG_TO_ASSET_TYPES.keys())),
                (AllocationCategory.user_id.is_(None)) | (AllocationCategory.user_id == user_id),
            )
            .all()
        )
        result: dict[str, dict[str, str]] = {}
        for row in rows:
            if row.slug not in INVEST_PLAN_SLUG_TO_ASSET_TYPES:
                continue
            existing = result.get(row.slug)
            # Prefer global system categories over any user-scoped duplicate slug.
            if existing is None or row.user_id is None:
                result[row.slug] = {"name": row.name, "slug": row.slug}
        return result

    @staticmethod
    def _month_bounds(year: int, month: int) -> tuple[date, date]:
        last_day = calendar.monthrange(year, month)[1]
        return date(year, month, 1), date(year, month, last_day)

    @staticmethod
    def _validate_year_month(year: int, month: int) -> None:
        if year < 2000 or year > 2100:
            raise AppError("VALIDATION_ERROR", "year out of supported range", status_code=400)
        if month < 1 or month > 12:
            raise AppError("VALIDATION_ERROR", "month must be between 1 and 12", status_code=400)

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError, ConflictError, ForbiddenError, NotFoundError
from app.models.money import MonthlyFinance, IncomePattern
from app.models.user import User
from app.repositories.goals_repository import GoalsRepository
from app.repositories.money_repository import MoneyRepository, slugify
from app.services.money_calculations import (
    build_comparison_metrics,
    build_month_metrics,
    money_to_str,
    parse_money,
    pct_of,
    quantize_money,
    sum_amounts,
)
from app.services.money_insights import detect_insights

ALLOCATION_SEMANTIC_TYPES = frozenset({"savings", "investment", "goal", "expense", "other"})
KIND_ALIASES = {
    "allocation": "allocation",
    "money_plan": "allocation",
    "spending": "spending",
}
SCOPE_BY_KIND = {
    "allocation": "money_plan",
    "spending": "spending",
}


class MoneyService:
    def __init__(self, db: Session) -> None:
        self.repo = MoneyRepository(db)
        self.goals_repo = GoalsRepository(db)

    def get_current_month_state(self, user: User) -> dict[str, Any]:
        today = date.today()
        record = self.repo.get_current_month(user.id, today.year, today.month)
        if record.income is None and not record.allocations and not record.spendings:
            record = self.repo.get_or_create_month(user.id, today.year, today.month)
            record = self.repo.get_month(user.id, today.year, today.month) or record
        return self._build_month_response(record, user.id)

    def list_months(self, user: User) -> list[dict[str, Any]]:
        months = self.repo.list_months(user.id)
        return [self._build_month_summary(month) for month in months]

    def get_month(self, user: User, year: int, month: int) -> dict[str, Any]:
        self._validate_year_month(year, month)
        record = self.repo.get_month(user.id, year, month)
        if record is None:
            record = self.repo.get_or_create_month(user.id, year, month)
            record = self.repo.get_month(user.id, year, month) or record
        return self._build_month_response(record, user.id)

    def set_income(self, user: User, year: int, month: int, amount: str) -> dict[str, Any]:
        self._validate_year_month(year, month)
        income = parse_money(amount)
        if income <= 0:
            raise AppError(
                code="INVALID_INCOME",
                message="Income amount must be greater than zero",
                status_code=422,
            )

        record = self.repo.get_or_create_month(user.id, year, month)
        if record.is_locked:
            raise ConflictError(code="MONTH_LOCKED", message="This month is locked and cannot be edited")

        if self._is_user_connected(user.id):
            record.manual_income_adjustment = income
        else:
            record.income = income
            
        record.currency = "INR"
        self.repo.save_month(record)

        prev_year, prev_month = self._previous_month(year, month)
        prev_record = self.repo.get_month(user.id, prev_year, prev_month)
        if prev_record is not None:
            self.lock_month_service(user, prev_year, prev_month)

        refreshed = self.repo.get_month(user.id, year, month)
        if refreshed is None:
            raise NotFoundError(code="MONTH_NOT_FOUND", message="Month not found")
        return self._build_month_response(refreshed, user.id)

    def set_allocation(
        self,
        user: User,
        year: int,
        month: int,
        items: list[dict[str, str]],
        *,
        require_complete: bool = False,
    ) -> dict[str, Any]:
        self._validate_year_month(year, month)
        record = self._get_editable_month(user.id, year, month)
        
        is_connected = self._is_user_connected(user.id)
        if not is_connected and record.income is None:
            raise AppError(
                code="INCOME_REQUIRED",
                message="Set monthly income before allocating",
                status_code=422,
            )

        category_allocations, goal_allocations = self._parse_allocation_items(user.id, items)
        total = sum_amounts(
            [amount for _, amount in category_allocations]
            + [amount for _, amount in goal_allocations]
        )
        
        available_to_plan = self._get_available_to_plan(user.id, year, month)
        spending_total = sum_amounts([s.amount for s in record.spendings])

        if total > available_to_plan:
            excess = quantize_money(total - available_to_plan)
            raise AppError(
                code="ALLOCATION_EXCEEDS_INCOME",
                message=f"Your allocation exceeds your Available to Plan by ₹{money_to_str(excess)}.",
                status_code=422,
            )

        self._validate_budget_within_income(available_to_plan, total, spending_total)

        if require_complete and total != available_to_plan:
            remaining = quantize_money(available_to_plan - total)
            raise AppError(
                code="ALLOCATION_INCOMPLETE",
                message=f"₹{money_to_str(remaining)} remains unallocated",
                status_code=422,
            )

        self.repo.replace_allocations(record.id, category_allocations, goal_allocations)
        refreshed = self.repo.get_month(user.id, year, month)
        if refreshed is None:
            raise NotFoundError(code="MONTH_NOT_FOUND", message="Month not found")
        return self._build_month_response(refreshed, user.id)

    def add_remaining_to_others(self, user: User, year: int, month: int) -> dict[str, Any]:
        self._validate_year_month(year, month)
        record = self._get_editable_month(user.id, year, month)
        
        is_connected = self._is_user_connected(user.id)
        if not is_connected and record.income is None:
            raise AppError(
                code="INCOME_REQUIRED",
                message="Set monthly income before allocating",
                status_code=422,
            )

        others_category = self.repo.get_allocation_others_category()
        if others_category is None:
            raise NotFoundError(code="OTHERS_CATEGORY_NOT_FOUND", message="Others category not found")

        current_category_allocations = {
            a.category_id: a.amount for a in record.allocations if a.category_id is not None
        }
        current_goal_allocations = {
            a.goal_id: a.amount for a in record.allocations if a.goal_id is not None
        }
        total = sum_amounts(
            list(current_category_allocations.values()) + list(current_goal_allocations.values())
        )
        
        available_to_plan = self._get_available_to_plan(user.id, year, month)
        remaining = quantize_money(available_to_plan - total)
        if remaining <= 0:
            raise AppError(
                code="NO_REMAINING_ALLOCATION",
                message="No remaining amount to allocate",
                status_code=422,
            )

        current_category_allocations[others_category.id] = quantize_money(
            current_category_allocations.get(others_category.id, Decimal("0")) + remaining
        )
        category_items = [
            {"category_id": str(category_id), "amount": money_to_str(amount)}
            for category_id, amount in current_category_allocations.items()
            if amount > 0
        ]
        goal_items = [
            {"goal_id": str(goal_id), "amount": money_to_str(amount)}
            for goal_id, amount in current_goal_allocations.items()
            if amount > 0
        ]
        return self.set_allocation(user, year, month, category_items + goal_items, require_complete=True)

    def add_remaining_to_goals(self, user: User, year: int, month: int) -> dict[str, Any]:
        """Send leftover cash after spending into active goals in one confirmed action."""
        self._validate_year_month(year, month)
        record = self._get_editable_month(user.id, year, month)

        is_connected = self._is_user_connected(user.id)
        if not is_connected and record.income is None:
            raise AppError(
                code="INCOME_REQUIRED",
                message="Set monthly income before allocating",
                status_code=422,
            )

        goals = [g for g in self.goals_repo.list_goals(user.id, active_only=True) if g.status == "active"]
        if not goals:
            raise AppError(
                code="NO_ACTIVE_GOALS",
                message="Create a goal first, then send leftover money to it.",
                status_code=422,
            )

        available_to_plan = self._get_available_to_plan(user.id, year, month)
        allocated_total = sum_amounts([a.amount for a in record.allocations])
        spending_total = sum_amounts([s.amount for s in record.spendings])
        leftover = quantize_money(available_to_plan - spending_total - allocated_total)
        if leftover <= 0:
            raise AppError(
                code="NO_REMAINING_ALLOCATION",
                message="No leftover after spending to send to goals",
                status_code=422,
            )

        current_category_allocations = {
            a.category_id: a.amount for a in record.allocations if a.category_id is not None
        }
        current_goal_allocations = {
            a.goal_id: a.amount for a in record.allocations if a.goal_id is not None
        }

        weights = [g.planned_monthly_contribution or Decimal("0") for g in goals]
        weight_total = sum_amounts(weights)
        shares: list[Decimal] = []
        assigned = Decimal("0.00")
        if weight_total > 0:
            for index, goal in enumerate(goals):
                if index == len(goals) - 1:
                    share = leftover - assigned
                else:
                    share = quantize_money(leftover * (goal.planned_monthly_contribution / weight_total))
                    assigned += share
                shares.append(share)
        else:
            even = quantize_money(leftover / Decimal(len(goals)))
            for index, _goal in enumerate(goals):
                if index == len(goals) - 1:
                    shares.append(leftover - assigned)
                else:
                    shares.append(even)
                    assigned += even

        for goal, share in zip(goals, shares):
            if share <= 0:
                continue
            current_goal_allocations[goal.id] = quantize_money(
                current_goal_allocations.get(goal.id, Decimal("0")) + share
            )

        category_items = [
            {"category_id": str(category_id), "amount": money_to_str(amount)}
            for category_id, amount in current_category_allocations.items()
            if amount > 0
        ]
        goal_items = [
            {"goal_id": str(goal_id), "amount": money_to_str(amount)}
            for goal_id, amount in current_goal_allocations.items()
            if amount > 0
        ]
        return self.set_allocation(user, year, month, category_items + goal_items)

    def set_spending(self, user: User, year: int, month: int, items: list[dict[str, str]]) -> dict[str, Any]:
        self._validate_year_month(year, month)
        record = self._get_editable_month(user.id, year, month)
        spendings = self._parse_spending_items(user.id, items)
        total = sum_amounts([amount for _, amount in spendings])
        
        available_to_plan = self._get_available_to_plan(user.id, year, month)
        is_connected = self._is_user_connected(user.id)
        if is_connected or record.income is not None:
            allocated_total = sum_amounts([a.amount for a in record.allocations])
            self._validate_budget_within_income(available_to_plan, allocated_total, total)
        self.repo.replace_spendings(record.id, spendings)
        refreshed = self.repo.get_month(user.id, year, month)
        if refreshed is None:
            raise NotFoundError(code="MONTH_NOT_FOUND", message="Month not found")
        return self._build_month_response(refreshed, user.id)

    def get_comparison(self, user: User, year: int, month: int) -> dict[str, Any]:
        self._validate_year_month(year, month)
        current = self.repo.get_month(user.id, year, month)
        if current is None:
            raise NotFoundError(code="MONTH_NOT_FOUND", message="Month not found")

        prev_year, prev_month = self._previous_month(year, month)
        previous = self.repo.get_month(user.id, prev_year, prev_month)

        current_spending_total = sum_amounts([s.amount for s in current.spendings])
        previous_spending_total = (
            sum_amounts([s.amount for s in previous.spendings]) if previous else Decimal("0")
        )
        current_allocated_total = sum_amounts([a.amount for a in current.allocations])
        previous_allocated_total = (
            sum_amounts([a.amount for a in previous.allocations]) if previous else Decimal("0")
        )

        comparison = build_comparison_metrics(
            current_income=current.income,
            previous_income=previous.income if previous else None,
            current_allocated=current_allocated_total,
            previous_allocated=previous_allocated_total,
            current_spending=current_spending_total,
            previous_spending=previous_spending_total,
        )

        spending_changes = self._category_changes(
            current.spendings,
            previous.spendings if previous else [],
            key="spending",
        )
        allocation_changes = self._allocation_changes(
            current.allocations,
            previous.allocations if previous else [],
        )

        current_spending_map = {
            str(s.category_id): {"name": s.category.name, "amount": s.amount}
            for s in current.spendings
        }
        previous_spending_map = {
            str(s.category_id): {"name": s.category.name, "amount": s.amount}
            for s in (previous.spendings if previous else [])
        }
        current_allocation_map = {
            a.category.slug: a.amount
            for a in current.allocations
            if a.category_id is not None and a.category is not None
        }
        previous_allocation_map = {
            a.category.slug: a.amount
            for a in (previous.allocations if previous else [])
            if a.category_id is not None and a.category is not None
        }

        insights = detect_insights(
            current_income=current.income,
            previous_income=previous.income if previous else None,
            current_spending_by_category=current_spending_map,
            previous_spending_by_category=previous_spending_map,
            current_allocation_by_slug=current_allocation_map,
            previous_allocation_by_slug=previous_allocation_map,
        )

        return {
            "year": year,
            "month": month,
            "previous_year": prev_year if previous else None,
            "previous_month": prev_month if previous else None,
            "comparison": comparison,
            "spending_changes": spending_changes,
            "allocation_changes": allocation_changes,
            "insights": insights,
        }

    def unlock_month(self, user: User, year: int, month: int) -> dict[str, Any]:
        self._validate_year_month(year, month)
        record = self.repo.unlock_month(user.id, year, month)
        if record is None:
            raise NotFoundError(code="MONTH_NOT_FOUND", message="Month not found")
        return self._build_month_response(record, user.id)

    def list_categories(
        self,
        user: User,
        kind: str,
        *,
        active_only: bool = True,
    ) -> list[dict[str, Any]]:
        normalized_kind = self._normalize_category_kind(kind)
        if normalized_kind == "allocation":
            categories = self.repo.list_allocation_categories(user.id, active_only=active_only)
        else:
            categories = self.repo.list_spending_categories(user.id, active_only=active_only)
        return [self._category_to_dict(category, normalized_kind) for category in categories]

    def create_category(
        self,
        user: User,
        kind: str,
        name: str,
        semantic_type: str | None = None,
    ) -> dict[str, Any]:
        normalized_kind = self._normalize_category_kind(kind)
        normalized = name.strip()
        if not normalized:
            raise AppError(
                code="INVALID_CATEGORY_NAME",
                message="Category name is required",
                status_code=422,
            )
        if normalized_kind == "allocation":
            resolved_semantic = self._require_semantic_type(semantic_type)
            existing = self.repo.find_allocation_category_by_name(user.id, normalized)
            if existing is not None:
                raise ConflictError(
                    code="CATEGORY_EXISTS",
                    message="A Money Plan category with this name already exists",
                )
            category = self.repo.create_allocation_category(
                user_id=user.id,
                name=normalized,
                semantic_type=resolved_semantic,
            )
        else:
            if semantic_type is not None:
                raise AppError(
                    code="SEMANTIC_TYPE_NOT_ALLOWED",
                    message="Spending categories do not use semantic type",
                    status_code=422,
                )
            existing = self.repo.find_spending_category_by_name(user.id, normalized)
            if existing is not None:
                raise ConflictError(
                    code="CATEGORY_EXISTS",
                    message="A spending category with this name already exists",
                )
            category = self.repo.create_spending_category(user_id=user.id, name=normalized)
        return self._category_to_dict(category, normalized_kind)

    def update_category(
        self,
        user: User,
        kind: str,
        category_id: UUID,
        *,
        name: str | None = None,
        semantic_type: str | None = None,
        is_active: bool | None = None,
    ) -> dict[str, Any]:
        normalized_kind = self._normalize_category_kind(kind)
        if name is None and semantic_type is None and is_active is None:
            raise AppError(
                code="NO_CATEGORY_UPDATES",
                message="Provide at least one field to update",
                status_code=422,
            )

        if normalized_kind == "allocation":
            category = self.repo.get_allocation_category(category_id, user.id)
            if category is None:
                raise NotFoundError(code="CATEGORY_NOT_FOUND", message="Money Plan category not found")
            self._ensure_custom_category_mutable(category)
            if name is not None:
                normalized = name.strip()
                if not normalized:
                    raise AppError(
                        code="INVALID_CATEGORY_NAME",
                        message="Category name is required",
                        status_code=422,
                    )
                existing = self.repo.find_allocation_category_by_name(
                    user.id, normalized, exclude_id=category.id
                )
                if existing is not None:
                    raise ConflictError(
                        code="CATEGORY_EXISTS",
                        message="A Money Plan category with this name already exists",
                    )
                category.name = normalized
                category.slug = slugify(normalized)
            if semantic_type is not None:
                category.semantic_type = self._require_semantic_type(semantic_type)
            if is_active is not None:
                category.is_active = is_active
            category = self.repo.save_allocation_category(category)
        else:
            category = self.repo.get_spending_category(category_id, user.id)
            if category is None:
                raise NotFoundError(code="CATEGORY_NOT_FOUND", message="Spending category not found")
            self._ensure_custom_category_mutable(category)
            if semantic_type is not None:
                raise AppError(
                    code="SEMANTIC_TYPE_NOT_ALLOWED",
                    message="Spending categories do not use semantic type",
                    status_code=422,
                )
            if name is not None:
                normalized = name.strip()
                if not normalized:
                    raise AppError(
                        code="INVALID_CATEGORY_NAME",
                        message="Category name is required",
                        status_code=422,
                    )
                existing = self.repo.find_spending_category_by_name(
                    user.id, normalized, exclude_id=category.id
                )
                if existing is not None:
                    raise ConflictError(
                        code="CATEGORY_EXISTS",
                        message="A spending category with this name already exists",
                    )
                category.name = normalized
                category.slug = slugify(normalized)
            if is_active is not None:
                category.is_active = is_active
            category = self.repo.save_spending_category(category)

        return self._category_to_dict(category, normalized_kind)

    def deactivate_category(self, user: User, kind: str, category_id: UUID) -> dict[str, Any]:
        return self.update_category(user, kind, category_id, is_active=False)

    def _get_editable_month(self, user_id: UUID, year: int, month: int) -> MonthlyFinance:
        record = self.repo.get_month(user_id, year, month)
        if record is None:
            record = self.repo.get_or_create_month(user_id, year, month)
            record = self.repo.get_month(user_id, year, month) or record
        if record.is_locked:
            raise ConflictError(code="MONTH_LOCKED", message="This month is locked and cannot be edited")
        return record

    def _parse_allocation_items(
        self,
        user_id: UUID,
        items: list[dict[str, str]],
    ) -> tuple[list[tuple[UUID, Decimal]], list[tuple[UUID, Decimal]]]:
        category_parsed: list[tuple[UUID, Decimal]] = []
        goal_parsed: list[tuple[UUID, Decimal]] = []
        seen_categories: set[UUID] = set()
        seen_goals: set[UUID] = set()

        for item in items:
            category_raw = item.get("category_id")
            goal_raw = item.get("goal_id")
            has_category = category_raw is not None and category_raw != ""
            has_goal = goal_raw is not None and goal_raw != ""
            if has_category == has_goal:
                raise AppError(
                    code="INVALID_ALLOCATION_ITEM",
                    message="Each allocation item must have exactly one of category_id or goal_id",
                    status_code=422,
                )

            amount = parse_money(item["amount"])
            if amount < 0:
                raise AppError(
                    code="INVALID_AMOUNT",
                    message="Allocation amount cannot be negative",
                    status_code=422,
                )
            if amount <= 0:
                continue

            if has_category:
                category_id = UUID(category_raw)
                if category_id in seen_categories:
                    raise AppError(
                        code="DUPLICATE_CATEGORY",
                        message="Duplicate allocation category in request",
                        status_code=422,
                    )
                category = self.repo.get_allocation_category(category_id, user_id)
                if category is None:
                    raise NotFoundError(code="CATEGORY_NOT_FOUND", message="Allocation category not found")
                if category.slug == "goals":
                    raise AppError(
                        code="GOALS_CATEGORY_DIRECT_ALLOCATION_NOT_ALLOWED",
                        message="Direct allocation to Goals category is not allowed. Allocate to individual goals instead.",
                        status_code=422,
                    )
                category_parsed.append((category_id, amount))
                seen_categories.add(category_id)
            else:
                goal_id = UUID(goal_raw)
                if goal_id in seen_goals:
                    raise AppError(
                        code="DUPLICATE_GOAL",
                        message="Duplicate goal allocation in request",
                        status_code=422,
                    )
                goal = self.repo.get_goal(user_id, goal_id)
                if goal is None:
                    raise NotFoundError(code="GOAL_NOT_FOUND", message="Goal not found or not active")
                goal_parsed.append((goal_id, amount))
                seen_goals.add(goal_id)

        return category_parsed, goal_parsed

    def _parse_spending_items(self, user_id: UUID, items: list[dict[str, str]]) -> list[tuple[UUID, Decimal]]:
        parsed: list[tuple[UUID, Decimal]] = []
        seen: set[UUID] = set()
        for item in items:
            category_id = UUID(item["category_id"])
            if category_id in seen:
                raise AppError(
                    code="DUPLICATE_CATEGORY",
                    message="Duplicate spending category in request",
                    status_code=422,
                )
            category = self.repo.get_spending_category(category_id, user_id)
            if category is None:
                raise NotFoundError(code="CATEGORY_NOT_FOUND", message="Spending category not found")
            amount = parse_money(item["amount"])
            if amount < 0:
                raise AppError(
                    code="INVALID_AMOUNT",
                    message="Spending amount cannot be negative",
                    status_code=422,
                )
            if amount > 0:
                parsed.append((category_id, amount))
            seen.add(category_id)
        return parsed

    def _build_month_summary(self, record: MonthlyFinance) -> dict[str, Any]:
        allocated_total = sum_amounts([a.amount for a in record.allocations])
        spending_total = sum_amounts([s.amount for s in record.spendings])
        
        is_connected = self._is_user_connected(record.user_id)
        carryover = self._get_carryover(record.user_id, record.year, record.month)
        
        if is_connected:
            confirmed_income = self._get_confirmed_income_from_transactions(record.user_id, record.year, record.month)
            manual_income_adjustment = record.manual_income_adjustment or Decimal("0.00")
            resolved_income = confirmed_income + manual_income_adjustment
        else:
            confirmed_income = Decimal("0.00")
            manual_income_adjustment = Decimal("0.00")
            resolved_income = record.income or Decimal("0.00")

        metrics = build_month_metrics(
            income=resolved_income,
            carryover=carryover,
            confirmed_income=confirmed_income,
            manual_income_adjustment=manual_income_adjustment,
            allocated_total=allocated_total,
            spending_total=spending_total,
            is_connected=is_connected
        )
        return {
            "year": record.year,
            "month": record.month,
            "is_locked": record.is_locked,
            "has_income": resolved_income > 0,
            "metrics": metrics,
        }

    def _build_month_response(self, record: MonthlyFinance, user_id: UUID) -> dict[str, Any]:
        allocated_total = sum_amounts([a.amount for a in record.allocations])
        spending_total = sum_amounts([s.amount for s in record.spendings])
        
        is_connected = self._is_user_connected(record.user_id)
        carryover = self._get_carryover(record.user_id, record.year, record.month)
        
        if is_connected:
            confirmed_income = self._get_confirmed_income_from_transactions(record.user_id, record.year, record.month)
            manual_income_adjustment = record.manual_income_adjustment or Decimal("0.00")
            resolved_income = confirmed_income + manual_income_adjustment
        else:
            confirmed_income = Decimal("0.00")
            manual_income_adjustment = Decimal("0.00")
            resolved_income = record.income or Decimal("0.00")

        metrics = build_month_metrics(
            income=resolved_income,
            carryover=carryover,
            confirmed_income=confirmed_income,
            manual_income_adjustment=manual_income_adjustment,
            allocated_total=allocated_total,
            spending_total=spending_total,
            is_connected=is_connected
        )

        prev_year, prev_month = self._previous_month(record.year, record.month)
        previous = self.repo.get_month(user_id, prev_year, prev_month)
        context = None
        if previous is not None and previous.allocations:
            investment_total = sum_amounts(
                [
                    a.amount
                    for a in previous.allocations
                    if a.category_id is not None
                    and a.category is not None
                    and (
                        getattr(a.category, "semantic_type", None) == "investment"
                        or a.category.slug in {"mutual-funds", "stocks"}
                    )
                ]
            )
            if investment_total > 0:
                context = {
                    "message": f"Last month you allocated ₹{money_to_str(investment_total)} toward investments.",
                }

        insights: list[dict[str, Any]] = []
        if previous is not None:
            current_spending_map = {
                str(s.category_id): {"name": s.category.name, "amount": s.amount}
                for s in record.spendings
            }
            previous_spending_map = {
                str(s.category_id): {"name": s.category.name, "amount": s.amount}
                for s in previous.spendings
            }
            current_allocation_map = {
                a.category.slug: a.amount
                for a in record.allocations
                if a.category_id is not None and a.category is not None
            }
            previous_allocation_map = {
                a.category.slug: a.amount
                for a in previous.allocations
                if a.category_id is not None and a.category is not None
            }
            insights = detect_insights(
                current_income=resolved_income,
                previous_income=previous.income,
                current_spending_by_category=current_spending_map,
                previous_spending_by_category=previous_spending_map,
                current_allocation_by_slug=current_allocation_map,
                previous_allocation_by_slug=previous_allocation_map,
            )

        # Candidates for first-time confirmation
        candidates = []
        if is_connected:
            candidates_txs = self._get_income_candidates_from_transactions(record.user_id, record.year, record.month)
            candidates = [
                {
                    "id": str(t.id),
                    "narration": t.narration,
                    "amount": money_to_str(t.amount),
                    "transaction_timestamp": t.transaction_timestamp.isoformat()
                }
                for t in candidates_txs
            ]

        # Is history incomplete check
        is_history_incomplete = self._is_history_incomplete(record.user_id, record.year, record.month)

        allocation_lines = self._build_allocation_lines(record, user_id, resolved_income)

        return {
            "year": record.year,
            "month": record.month,
            "currency": record.currency,
            "is_locked": record.is_locked,
            "income": money_to_str(resolved_income),
            "metrics": metrics,
            "allocations": allocation_lines,
            "spending": [
                {
                    "category_id": str(s.category_id),
                    "category_name": s.category.name,
                    "category_slug": s.category.slug,
                    "is_others": s.category.is_others,
                    "is_custom": s.category.user_id is not None,
                    "is_active": s.category.is_active,
                    "amount": money_to_str(s.amount),
                    "percentage": money_to_str(pct_of(s.amount, resolved_income))
                    if resolved_income and resolved_income > 0
                    else None,
                }
                for s in record.spendings
            ],
            "context": context,
            "insights": insights,
            "is_connected": is_connected,
            "income_candidates": candidates,
            "is_history_incomplete": is_history_incomplete,
        }

    def _build_allocation_lines(self, record: MonthlyFinance, user_id: UUID, resolved_income: Decimal) -> list[dict[str, Any]]:
        lines: list[dict[str, Any]] = []
        allocated_goal_ids: set[UUID] = set()

        # Aggregate total allocated to goals
        active_goal_allocs = []
        for a in record.allocations:
            if a.goal_id is not None:
                goal_active = a.goal is not None and a.goal.status == "active"
                if record.is_locked or goal_active:
                    active_goal_allocs.append(a.amount)
        goal_allocations_sum = sum_amounts(active_goal_allocs)

        from app.models.money import AllocationCategory
        goals_category = self.repo.db.query(AllocationCategory).filter(
            AllocationCategory.slug == "goals",
            AllocationCategory.user_id.is_(None)
        ).first()

        if goals_category is not None:
            lines.append(
                {
                    "line_type": "category",
                    "category_id": str(goals_category.id),
                    "goal_id": None,
                    "category_name": goals_category.name,
                    "goal_name": None,
                    "category_slug": goals_category.slug,
                    "is_others": goals_category.is_others,
                    "is_custom": False,
                    "is_active": goals_category.is_active,
                    "semantic_type": goals_category.semantic_type,
                    "amount": money_to_str(goal_allocations_sum),
                    "percentage": money_to_str(pct_of(goal_allocations_sum, resolved_income))
                    if resolved_income and resolved_income > 0
                    else None,
                }
            )

        for allocation in record.allocations:
            if allocation.goal_id is not None:
                goal = allocation.goal
                goal_active = goal is not None and goal.status == "active"
                # Historical months keep archived goal allocations for reporting.
                # Current unlocked months should not surface archived goals as active lines.
                if not goal_active and not record.is_locked:
                    continue
                allocated_goal_ids.add(allocation.goal_id)
                lines.append(
                    {
                        "line_type": "goal",
                        "category_id": None,
                        "goal_id": str(allocation.goal_id),
                        "category_name": None,
                        "goal_name": goal.name if goal else "Goal",
                        "category_slug": f"goal-{allocation.goal_id}",
                        "is_others": False,
                        "is_custom": False,
                        "is_active": goal_active,
                        "semantic_type": "goal",
                        "amount": money_to_str(allocation.amount),
                        "percentage": money_to_str(pct_of(allocation.amount, resolved_income))
                        if resolved_income and resolved_income > 0
                        else None,
                        "planned_monthly_contribution": money_to_str(goal.planned_monthly_contribution) if goal else None,
                    }
                )
            elif allocation.category_id is not None and allocation.category is not None:
                if allocation.category.slug == "goals":
                    continue
                lines.append(
                    {
                        "line_type": "category",
                        "category_id": str(allocation.category_id),
                        "goal_id": None,
                        "category_name": allocation.category.name,
                        "goal_name": None,
                        "category_slug": allocation.category.slug,
                        "is_others": allocation.category.is_others,
                        "is_custom": allocation.category.user_id is not None,
                        "is_active": allocation.category.is_active,
                        "semantic_type": allocation.category.semantic_type,
                        "amount": money_to_str(allocation.amount),
                        "percentage": money_to_str(pct_of(allocation.amount, resolved_income))
                        if resolved_income and resolved_income > 0
                        else None,
                    }
                )

        active_goals = self.goals_repo.list_goals(user_id, active_only=True)
        for goal in active_goals:
            if goal.id in allocated_goal_ids:
                continue
            lines.append(
                {
                    "line_type": "goal",
                    "category_id": None,
                    "goal_id": str(goal.id),
                    "category_name": None,
                    "goal_name": goal.name,
                    "category_slug": f"goal-{goal.id}",
                    "is_others": False,
                    "is_custom": False,
                    "is_active": True,
                    "semantic_type": "goal",
                    "amount": None,
                    "percentage": None,
                    "planned_monthly_contribution": money_to_str(goal.planned_monthly_contribution),
                }
            )

        return lines

    def _allocation_changes(self, current_items, previous_items) -> list[dict[str, Any]]:
        def allocation_key(item) -> str:
            if item.goal_id is not None:
                return f"goal:{item.goal_id}"
            return f"category:{item.category_id}"

        def allocation_name(item) -> str:
            if item.goal_id is not None:
                return item.goal.name if item.goal else "Goal"
            return item.category.name if item.category else "Category"

        previous_map = {allocation_key(item): item for item in previous_items}
        changes: list[dict[str, Any]] = []
        seen: set[str] = set()

        for item in current_items:
            key = allocation_key(item)
            seen.add(key)
            previous = previous_map.get(key)
            previous_amount = previous.amount if previous else Decimal("0")
            change = quantize_money(item.amount - previous_amount)
            changes.append(
                {
                    "category_id": str(item.category_id) if item.category_id else None,
                    "goal_id": str(item.goal_id) if item.goal_id else None,
                    "line_type": "goal" if item.goal_id else "category",
                    "category_name": allocation_name(item),
                    "allocation": money_to_str(item.amount),
                    "previous_amount": money_to_str(previous_amount),
                    "change": money_to_str(change),
                }
            )

        for key, previous in previous_map.items():
            if key in seen:
                continue
            changes.append(
                {
                    "category_id": str(previous.category_id) if previous.category_id else None,
                    "goal_id": str(previous.goal_id) if previous.goal_id else None,
                    "line_type": "goal" if previous.goal_id else "category",
                    "category_name": allocation_name(previous),
                    "allocation": money_to_str(Decimal("0")),
                    "previous_amount": money_to_str(previous.amount),
                    "change": money_to_str(quantize_money(Decimal("0") - previous.amount)),
                }
            )
        return changes

    def _category_changes(self, current_items, previous_items, *, key: str) -> list[dict[str, Any]]:
        previous_map = {str(item.category_id): item for item in previous_items}
        changes: list[dict[str, Any]] = []
        seen: set[str] = set()

        for item in current_items:
            category_id = str(item.category_id)
            seen.add(category_id)
            previous = previous_map.get(category_id)
            previous_amount = previous.amount if previous else Decimal("0")
            change = quantize_money(item.amount - previous_amount)
            changes.append(
                {
                    "category_id": category_id,
                    "category_name": item.category.name,
                    key: money_to_str(item.amount),
                    "previous_amount": money_to_str(previous_amount),
                    "change": money_to_str(change),
                }
            )

        for category_id, previous in previous_map.items():
            if category_id in seen:
                continue
            changes.append(
                {
                    "category_id": category_id,
                    "category_name": previous.category.name,
                    key: money_to_str(Decimal("0")),
                    "previous_amount": money_to_str(previous.amount),
                    "change": money_to_str(quantize_money(Decimal("0") - previous.amount)),
                }
            )
        return changes

    @staticmethod
    def _category_to_dict(category, kind: str) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "id": str(category.id),
            "name": category.name,
            "slug": category.slug,
            "scope": SCOPE_BY_KIND[kind],
            "is_system": category.is_system,
            "is_others": category.is_others,
            "is_custom": category.user_id is not None,
            "is_active": category.is_active,
        }
        if kind == "allocation":
            payload["semantic_type"] = category.semantic_type
        else:
            payload["semantic_type"] = None
        return payload

    @staticmethod
    def _normalize_category_kind(kind: str) -> str:
        normalized = KIND_ALIASES.get(kind)
        if normalized is None:
            raise AppError(
                code="INVALID_CATEGORY_KIND",
                message="Category kind must be money_plan/allocation or spending",
                status_code=422,
            )
        return normalized

    @staticmethod
    def _require_semantic_type(semantic_type: str | None) -> str:
        if semantic_type is None or semantic_type not in ALLOCATION_SEMANTIC_TYPES:
            raise AppError(
                code="INVALID_SEMANTIC_TYPE",
                message="Money Plan categories require a semantic type: savings, investment, goal, expense, or other",
                status_code=422,
            )
        return semantic_type

    @staticmethod
    def _ensure_custom_category_mutable(category) -> None:
        if category.is_system or category.user_id is None:
            raise ForbiddenError(
                code="SYSTEM_CATEGORY_PROTECTED",
                message="System categories cannot be renamed or hidden",
            )

    @staticmethod
    def _validate_budget_within_income(
        available_to_plan: Decimal,
        allocated_total: Decimal,
        spending_total: Decimal,
    ) -> None:
        # Per the architecture contract, allocations (plan) and spending (actual) are
        # separate concepts. Only allocations are checked against ATP here.
        # Spending does not reduce ATP — it is tracked separately for reporting.
        if allocated_total > available_to_plan:
            excess = quantize_money(allocated_total - available_to_plan)
            raise AppError(
                code="BUDGET_EXCEEDS_INCOME",
                message=(
                    f"Your allocation exceeds this month's Available to Plan by "
                    f"₹{money_to_str(excess)}."
                ),
                status_code=422,
            )

    @staticmethod
    def _validate_year_month(year: int, month: int) -> None:
        if year < 2000 or year > 2100:
            raise AppError(code="INVALID_YEAR", message="Invalid year", status_code=422)
        if month < 1 or month > 12:
            raise AppError(code="INVALID_MONTH", message="Invalid month", status_code=422)

    @staticmethod
    def _previous_month(year: int, month: int) -> tuple[int, int]:
        if month == 1:
            return year - 1, 12
        return year, month - 1

    @staticmethod
    def _next_month(year: int, month: int) -> tuple[int, int]:
        if month == 12:
            return year + 1, 1
        return year, month + 1

    def _is_user_connected(self, user_id: UUID) -> bool:
        from app.models.banking import ConnectedAccount, FinancialConnection, ConnectionStatus
        stmt = (
            select(ConnectedAccount)
            .join(FinancialConnection, ConnectedAccount.connection_id == FinancialConnection.id)
            .where(
                ConnectedAccount.user_id == user_id,
                ConnectedAccount.status == "ACTIVE",
                FinancialConnection.status == ConnectionStatus.ACTIVE.value
            )
        )
        return len(self.repo.db.scalars(stmt).all()) > 0

    def _get_carryover(self, user_id: UUID, year: int, month: int) -> Decimal:
        """Return the carryover amount for the given month.

        Carryover is the unallocated surplus from the previous month.
        - If the previous month is LOCKED: use the frozen snapshot written to
          current_month.carryover by lock_month_service. This is the canonical
          value and must never be recomputed after locking.
        - If the previous month is NOT yet locked: compute dynamically as
          prev_ATP - prev_allocated. Spending is NOT subtracted — per the
          architecture contract, spending and allocations are separate concepts.
        """
        # First, check if the current month already has a frozen carryover snapshot
        # (written by lock_month_service when the previous month was locked).
        current_record = self.repo.get_month(user_id, year, month)
        if current_record is not None and current_record.carryover is not None:
            return current_record.carryover

        # No frozen snapshot yet — compute from previous month dynamically.
        prev_year, prev_month = self._previous_month(year, month)
        prev_record = self.repo.get_month(user_id, prev_year, prev_month)
        if prev_record is None:
            return Decimal("0.00")

        prev_available = self._get_available_to_plan(user_id, prev_year, prev_month)
        prev_allocated = sum_amounts([a.amount for a in prev_record.allocations])
        return quantize_money(prev_available - prev_allocated)

    def _get_available_to_plan(self, user_id: UUID, year: int, month: int) -> Decimal:
        record = self.repo.get_month(user_id, year, month)
        if record is None:
            record = self.repo.get_or_create_month(user_id, year, month)
        
        carryover = self._get_carryover(user_id, year, month)
        
        if self._is_user_connected(user_id):
            confirmed_inc = self._get_confirmed_income_from_transactions(user_id, year, month)
            manual_adj = record.manual_income_adjustment or Decimal("0.00")
            return quantize_money(carryover + confirmed_inc + manual_adj)
        else:
            income_val = record.income or Decimal("0.00")
            return quantize_money(carryover + income_val)

    def _get_confirmed_income_from_transactions(self, user_id: UUID, year: int, month: int) -> Decimal:
        from app.models.banking import BankTransaction
        import calendar
        from datetime import datetime, timezone
        
        _, num_days = calendar.monthrange(year, month)
        start_dt = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)
        end_dt = datetime(year, month, num_days, 23, 59, 59, 999999, tzinfo=timezone.utc)
        
        from app.models.banking import ConnectedAccount
        txs = self.repo.db.scalars(
            select(BankTransaction).join(ConnectedAccount, BankTransaction.connected_account_id == ConnectedAccount.id).where(
                BankTransaction.user_id == user_id,
                ConnectedAccount.user_id == user_id,
                ConnectedAccount.institution_name != "Vestor Simulated Bank",
                BankTransaction.source != "DEMO",
                BankTransaction.transaction_timestamp >= start_dt,
                BankTransaction.transaction_timestamp <= end_dt,
                BankTransaction.transaction_type == "CREDIT",
                BankTransaction.classification == "INCOME",
                BankTransaction.classification_status.in_(["USER_CONFIRMED", "USER_CORRECTED"])
            )
        ).all()
        return sum_amounts([t.amount for t in txs])

    def _get_income_candidates_from_transactions(self, user_id: UUID, year: int, month: int) -> list:
        from app.models.banking import BankTransaction
        import calendar
        from datetime import datetime, timezone
        
        _, num_days = calendar.monthrange(year, month)
        start_dt = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)
        end_dt = datetime(year, month, num_days, 23, 59, 59, 999999, tzinfo=timezone.utc)
        
        from app.models.banking import ConnectedAccount
        txs = self.repo.db.scalars(
            select(BankTransaction).join(ConnectedAccount, BankTransaction.connected_account_id == ConnectedAccount.id).where(
                BankTransaction.user_id == user_id,
                ConnectedAccount.user_id == user_id,
                ConnectedAccount.institution_name != "Vestor Simulated Bank",
                BankTransaction.source != "DEMO",
                BankTransaction.transaction_timestamp >= start_dt,
                BankTransaction.transaction_timestamp <= end_dt,
                BankTransaction.transaction_type == "CREDIT",
                BankTransaction.classification == "INCOME",
                BankTransaction.classification_status == "SYSTEM_CLASSIFIED"
            )
        ).all()
        return txs

    def _is_history_incomplete(self, user_id: UUID, year: int, month: int) -> bool:
        from app.models.banking import FinancialConnection
        from datetime import date
        
        stmt = (
            select(FinancialConnection)
            .where(
                FinancialConnection.user_id == user_id,
                FinancialConnection.status == "ACTIVE"
            )
        )
        conns = self.repo.db.scalars(stmt).all()
        for conn in conns:
            if conn.created_at:
                created_date = conn.created_at.date()
                target_start_date = date(year, month, 1)
                if created_date > target_start_date:
                    return True
        return False

    def lock_month_service(self, user: User, year: int, month: int) -> None:
        """Lock a month and freeze the carryover snapshot for the next month.

        Carryover = ATP - allocated_total.
        Spending is tracked separately (actual vs. plan) and is NOT subtracted
        from the carry-over per the Vestor Architecture Contract.
        """
        record = self.repo.get_month(user.id, year, month)
        if record is None or record.is_locked:
            return

        # 1. Canonical remaining = Available-to-Plan minus what was allocated.
        #    Spending is intentionally excluded — it is actual vs. plan and
        #    must not be double-counted in the carryover.
        available = self._get_available_to_plan(user.id, year, month)
        allocated = sum_amounts([a.amount for a in record.allocations])
        remaining = quantize_money(available - allocated)

        # 2. Write the frozen carryover snapshot to next month BEFORE locking
        #    so that _get_carryover() can read it from current_month.carryover.
        next_year, next_month = self._next_month(year, month)
        next_record = self.repo.get_or_create_month(user.id, next_year, next_month)
        next_record.carryover = remaining
        self.repo.save_month(next_record)

        # 3. Lock the month.
        self.repo.lock_month(user.id, year, month)

    def set_adjustment(self, user: User, year: int, month: int, amount: str) -> dict[str, Any]:
        self._validate_year_month(year, month)
        adj = parse_money(amount)
        record = self.repo.get_or_create_month(user.id, year, month)
        if record.is_locked:
            raise ConflictError(code="MONTH_LOCKED", message="This month is locked and cannot be edited")
        record.manual_income_adjustment = adj
        self.repo.save_month(record)
        return self._build_month_response(record, user.id)

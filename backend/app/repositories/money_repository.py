from __future__ import annotations

import re
from decimal import Decimal
from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.goal import Goal
from app.models.money import (
    AllocationCategory,
    MonthlyAllocation,
    MonthlyFinance,
    MonthlySpending,
    SpendingCategory,
)


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower())
    return slug.strip("-") or "category"


class MoneyRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_or_create_month(self, user_id: UUID, year: int, month: int) -> MonthlyFinance:
        record = self.get_month(user_id, year, month)
        if record is not None:
            return record
        record = MonthlyFinance(user_id=user_id, year=year, month=month, currency="INR")
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def get_month(self, user_id: UUID, year: int, month: int) -> MonthlyFinance | None:
        return (
            self.db.query(MonthlyFinance)
            .options(
                joinedload(MonthlyFinance.allocations).joinedload(MonthlyAllocation.category),
                joinedload(MonthlyFinance.allocations).joinedload(MonthlyAllocation.goal),
                joinedload(MonthlyFinance.spendings).joinedload(MonthlySpending.category),
            )
            .filter(
                MonthlyFinance.user_id == user_id,
                MonthlyFinance.year == year,
                MonthlyFinance.month == month,
            )
            .first()
        )

    def list_months(self, user_id: UUID) -> list[MonthlyFinance]:
        return (
            self.db.query(MonthlyFinance)
            .filter(MonthlyFinance.user_id == user_id)
            .order_by(MonthlyFinance.year.desc(), MonthlyFinance.month.desc())
            .all()
        )

    def get_latest_month_with_income(self, user_id: UUID) -> MonthlyFinance | None:
        return (
            self.db.query(MonthlyFinance)
            .options(
                joinedload(MonthlyFinance.allocations).joinedload(MonthlyAllocation.category),
                joinedload(MonthlyFinance.allocations).joinedload(MonthlyAllocation.goal),
                joinedload(MonthlyFinance.spendings).joinedload(MonthlySpending.category),
            )
            .filter(MonthlyFinance.user_id == user_id, MonthlyFinance.income.isnot(None))
            .order_by(MonthlyFinance.year.desc(), MonthlyFinance.month.desc())
            .first()
        )

    def get_current_month(self, user_id: UUID, year: int, month: int) -> MonthlyFinance:
        latest = self.get_latest_month_with_income(user_id)
        if latest is not None:
            return latest
        return self.get_or_create_month(user_id, year, month)

    def save_month(self, record: MonthlyFinance) -> MonthlyFinance:
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return self.get_month(record.user_id, record.year, record.month) or record

    def list_allocation_categories(
        self,
        user_id: UUID,
        *,
        active_only: bool = True,
    ) -> list[AllocationCategory]:
        query = self.db.query(AllocationCategory).filter(
            or_(AllocationCategory.user_id.is_(None), AllocationCategory.user_id == user_id)
        )
        if active_only:
            query = query.filter(AllocationCategory.is_active.is_(True))
        return query.order_by(
            AllocationCategory.is_system.desc(),
            AllocationCategory.name.asc(),
        ).all()

    def list_spending_categories(
        self,
        user_id: UUID,
        *,
        active_only: bool = True,
    ) -> list[SpendingCategory]:
        query = self.db.query(SpendingCategory).filter(
            or_(SpendingCategory.user_id.is_(None), SpendingCategory.user_id == user_id)
        )
        if active_only:
            query = query.filter(SpendingCategory.is_active.is_(True))
        return query.order_by(
            SpendingCategory.is_system.desc(),
            SpendingCategory.name.asc(),
        ).all()

    def get_allocation_category(self, category_id: UUID, user_id: UUID) -> AllocationCategory | None:
        return (
            self.db.query(AllocationCategory)
            .filter(
                AllocationCategory.id == category_id,
                or_(AllocationCategory.user_id.is_(None), AllocationCategory.user_id == user_id),
            )
            .first()
        )

    def get_spending_category(self, category_id: UUID, user_id: UUID) -> SpendingCategory | None:
        return (
            self.db.query(SpendingCategory)
            .filter(
                SpendingCategory.id == category_id,
                or_(SpendingCategory.user_id.is_(None), SpendingCategory.user_id == user_id),
            )
            .first()
        )

    def get_owned_allocation_category(
        self, category_id: UUID, user_id: UUID
    ) -> AllocationCategory | None:
        return (
            self.db.query(AllocationCategory)
            .filter(
                AllocationCategory.id == category_id,
                AllocationCategory.user_id == user_id,
            )
            .first()
        )

    def get_owned_spending_category(
        self, category_id: UUID, user_id: UUID
    ) -> SpendingCategory | None:
        return (
            self.db.query(SpendingCategory)
            .filter(
                SpendingCategory.id == category_id,
                SpendingCategory.user_id == user_id,
            )
            .first()
        )

    def get_allocation_others_category(self) -> AllocationCategory | None:
        return (
            self.db.query(AllocationCategory)
            .filter(AllocationCategory.is_others.is_(True), AllocationCategory.user_id.is_(None))
            .first()
        )

    def create_allocation_category(
        self,
        *,
        user_id: UUID,
        name: str,
        semantic_type: str,
    ) -> AllocationCategory:
        category = AllocationCategory(
            name=name.strip(),
            slug=slugify(name),
            is_system=False,
            is_others=False,
            is_active=True,
            semantic_type=semantic_type,
            user_id=user_id,
        )
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category

    def create_spending_category(self, *, user_id: UUID, name: str) -> SpendingCategory:
        category = SpendingCategory(
            name=name.strip(),
            slug=slugify(name),
            is_system=False,
            is_others=False,
            is_active=True,
            user_id=user_id,
        )
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category

    def save_allocation_category(self, category: AllocationCategory) -> AllocationCategory:
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category

    def save_spending_category(self, category: SpendingCategory) -> SpendingCategory:
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category

    def replace_allocations(
        self,
        monthly_finance_id: UUID,
        category_allocations: list[tuple[UUID, Decimal]],
        goal_allocations: list[tuple[UUID, Decimal]],
    ) -> None:
        self.db.query(MonthlyAllocation).filter(
            MonthlyAllocation.monthly_finance_id == monthly_finance_id
        ).delete(synchronize_session=False)
        for category_id, amount in category_allocations:
            if amount <= 0:
                continue
            self.db.add(
                MonthlyAllocation(
                    monthly_finance_id=monthly_finance_id,
                    category_id=category_id,
                    goal_id=None,
                    amount=amount,
                )
            )
        for goal_id, amount in goal_allocations:
            if amount <= 0:
                continue
            self.db.add(
                MonthlyAllocation(
                    monthly_finance_id=monthly_finance_id,
                    category_id=None,
                    goal_id=goal_id,
                    amount=amount,
                )
            )
        self.db.commit()

    def get_goal(self, user_id: UUID, goal_id: UUID) -> Goal | None:
        return (
            self.db.query(Goal)
            .filter(Goal.id == goal_id, Goal.user_id == user_id, Goal.status == "active")
            .first()
        )

    def replace_spendings(
        self,
        monthly_finance_id: UUID,
        spendings: list[tuple[UUID, Decimal]],
    ) -> None:
        self.db.query(MonthlySpending).filter(
            MonthlySpending.monthly_finance_id == monthly_finance_id
        ).delete(synchronize_session=False)
        for category_id, amount in spendings:
            if amount <= 0:
                continue
            self.db.add(
                MonthlySpending(
                    monthly_finance_id=monthly_finance_id,
                    category_id=category_id,
                    amount=amount,
                )
            )
        self.db.commit()

    def lock_month(self, user_id: UUID, year: int, month: int) -> None:
        record = self.get_month(user_id, year, month)
        if record is None:
            return
        record.is_locked = True
        self.db.add(record)
        self.db.commit()

    def unlock_month(self, user_id: UUID, year: int, month: int) -> MonthlyFinance | None:
        record = self.get_month(user_id, year, month)
        if record is None:
            return None
        record.is_locked = False
        self.db.add(record)
        self.db.commit()
        return self.get_month(user_id, year, month)

    def find_allocation_category_by_name(
        self,
        user_id: UUID,
        name: str,
        *,
        exclude_id: UUID | None = None,
    ) -> AllocationCategory | None:
        normalized = name.strip().lower()
        query = self.db.query(AllocationCategory).filter(
            or_(AllocationCategory.user_id.is_(None), AllocationCategory.user_id == user_id),
            AllocationCategory.name.ilike(normalized),
        )
        if exclude_id is not None:
            query = query.filter(AllocationCategory.id != exclude_id)
        return query.first()

    def find_spending_category_by_name(
        self,
        user_id: UUID,
        name: str,
        *,
        exclude_id: UUID | None = None,
    ) -> SpendingCategory | None:
        normalized = name.strip().lower()
        query = self.db.query(SpendingCategory).filter(
            or_(SpendingCategory.user_id.is_(None), SpendingCategory.user_id == user_id),
            SpendingCategory.name.ilike(normalized),
        )
        if exclude_id is not None:
            query = query.filter(SpendingCategory.id != exclude_id)
        return query.first()

    def count_allocation_usages(self, category_id: UUID, user_id: UUID) -> int:
        return (
            self.db.query(MonthlyAllocation)
            .join(MonthlyFinance, MonthlyAllocation.monthly_finance_id == MonthlyFinance.id)
            .filter(
                MonthlyAllocation.category_id == category_id,
                MonthlyFinance.user_id == user_id,
            )
            .count()
        )

    def count_spending_usages(self, category_id: UUID, user_id: UUID) -> int:
        return (
            self.db.query(MonthlySpending)
            .join(MonthlyFinance, MonthlySpending.monthly_finance_id == MonthlyFinance.id)
            .filter(
                MonthlySpending.category_id == category_id,
                MonthlyFinance.user_id == user_id,
            )
            .count()
        )

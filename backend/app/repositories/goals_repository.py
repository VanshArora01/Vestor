from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.models.goal import Goal, GoalContribution


class GoalsRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_goals(
        self,
        user_id: UUID,
        *,
        include_archived: bool = False,
        active_only: bool = False,
    ) -> list[Goal]:
        query = self.db.query(Goal).filter(Goal.user_id == user_id)
        if active_only:
            query = query.filter(Goal.status == "active")
        elif not include_archived:
            query = query.filter(Goal.status.in_(["active", "completed"]))
        return query.order_by(Goal.deadline.asc(), Goal.created_at.asc()).all()

    def get_goal(self, user_id: UUID, goal_id: UUID) -> Goal | None:
        return (
            self.db.query(Goal)
            .options(joinedload(Goal.contributions))
            .filter(Goal.id == goal_id, Goal.user_id == user_id)
            .first()
        )

    def get_active_emergency_fund_goal(self, user_id: UUID) -> Goal | None:
        return (
            self.db.query(Goal)
            .filter(
                Goal.user_id == user_id,
                Goal.goal_type == "emergency_fund",
                Goal.status == "active",
            )
            .first()
        )

    def create_goal(self, goal: Goal) -> Goal:
        self.db.add(goal)
        self.db.commit()
        self.db.refresh(goal)
        return goal

    def save_goal(self, goal: Goal) -> Goal:
        self.db.add(goal)
        self.db.commit()
        self.db.refresh(goal)
        return self.get_goal(goal.user_id, goal.id) or goal

    def add_contribution(self, contribution: GoalContribution) -> GoalContribution:
        self.db.add(contribution)
        self.db.commit()
        self.db.refresh(contribution)
        return contribution

    def list_contributions(self, goal_id: UUID, *, limit: int | None = None) -> list[GoalContribution]:
        query = (
            self.db.query(GoalContribution)
            .filter(GoalContribution.goal_id == goal_id)
            .order_by(GoalContribution.contributed_on.desc(), GoalContribution.created_at.desc())
        )
        if limit is not None:
            query = query.limit(limit)
        return query.all()

    def list_plan_allocations_for_goal(self, goal_id: UUID) -> list[tuple[int, int, Decimal]]:
        from app.models.money import MonthlyAllocation, MonthlyFinance

        rows = (
            self.db.query(MonthlyFinance.year, MonthlyFinance.month, MonthlyAllocation.amount)
            .join(MonthlyAllocation, MonthlyAllocation.monthly_finance_id == MonthlyFinance.id)
            .filter(MonthlyAllocation.goal_id == goal_id)
            .order_by(MonthlyFinance.year.asc(), MonthlyFinance.month.asc())
            .all()
        )
        return [(year, month, amount) for year, month, amount in rows]

    def sum_plan_allocations_for_goal(self, goal_id: UUID) -> Decimal:
        from sqlalchemy import func

        from app.models.money import MonthlyAllocation

        total = (
            self.db.query(func.coalesce(func.sum(MonthlyAllocation.amount), 0))
            .filter(MonthlyAllocation.goal_id == goal_id)
            .scalar()
        )
        return Decimal(str(total))

    def remove_goal_allocation_from_month(
        self,
        *,
        user_id: UUID,
        goal_id: UUID,
        year: int,
        month: int,
    ) -> None:
        from app.models.money import MonthlyAllocation, MonthlyFinance

        record = (
            self.db.query(MonthlyFinance)
            .filter(
                MonthlyFinance.user_id == user_id,
                MonthlyFinance.year == year,
                MonthlyFinance.month == month,
                MonthlyFinance.is_locked.is_(False),
            )
            .first()
        )
        if record is None:
            return
        self.db.query(MonthlyAllocation).filter(
            MonthlyAllocation.monthly_finance_id == record.id,
            MonthlyAllocation.goal_id == goal_id,
        ).delete(synchronize_session=False)
        self.db.commit()

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.models.goal import Goal, GoalContribution
from app.models.user import User
from app.repositories.goals_repository import GoalsRepository
from app.repositories.money_repository import MoneyRepository
from app.services.goals_calculations import add_months, build_goal_metrics
from app.services.money_calculations import money_to_str, parse_money, quantize_money, sum_amounts


class GoalsService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = GoalsRepository(db)
        self.money_repo = MoneyRepository(db)

    def list_goals(self, user: User, *, include_archived: bool = False) -> dict[str, Any]:
        goals = self.repo.list_goals(user.id, include_archived=include_archived)
        active_goals = [g for g in goals if g.status == "active"]
        return {
            "goals": [self._goal_to_dict(g) for g in goals],
            "summary": self._build_summary(active_goals),
        }

    def get_summary(self, user: User) -> dict[str, Any]:
        goals = self.repo.list_goals(user.id, active_only=True)
        return self._build_summary(goals)

    def get_goal(self, user: User, goal_id: UUID) -> dict[str, Any]:
        goal = self._require_goal(user.id, goal_id)
        payload = self._goal_to_dict(goal)
        payload["contributions"] = [
            self._contribution_to_dict(c) for c in self.repo.list_contributions(goal.id, limit=50)
        ]
        payload["plan_history"] = [
            {"year": year, "month": month, "amount": money_to_str(amount)}
            for year, month, amount in self.repo.list_plan_allocations_for_goal(goal.id)
        ]
        return payload

    def create_goal(self, user: User, payload: dict[str, Any]) -> dict[str, Any]:
        if payload.get("goal_type") == "emergency_fund":
            existing = self.repo.get_active_emergency_fund_goal(user.id)
            if existing is not None:
                raise ConflictError(
                    code="EMERGENCY_FUND_EXISTS",
                    message="An active Emergency Fund goal already exists",
                )

        # Validate linked account
        linked_account_id = payload.get("linked_account_id")
        if linked_account_id:
            from app.models.banking import ConnectedAccount
            from sqlalchemy import select
            account = self.db.scalars(
                select(ConnectedAccount).where(
                    ConnectedAccount.id == linked_account_id,
                    ConnectedAccount.user_id == user.id
                )
            ).first()
            if not account:
                raise AppError(
                    code="INVALID_LINKED_ACCOUNT",
                    message="The specified linked account was not found or belongs to another user",
                    status_code=422
                )

        target = self._parse_positive_amount(payload["target_amount"], field="target_amount")
        current = (
            parse_money(payload["current_amount"])
            if payload.get("current_amount") is not None
            else Decimal("0")
        )
        if current < 0:
            raise AppError(code="INVALID_AMOUNT", message="Current amount cannot be negative", status_code=422)
        if current > target:
            raise AppError(
                code="INVALID_CURRENT_AMOUNT",
                message="Current amount cannot exceed target amount",
                status_code=422,
            )

        planned = self._parse_non_negative_amount(
            payload["planned_monthly_contribution"],
            field="planned_monthly_contribution",
        )
        deadline = self._resolve_deadline(payload)

        goal = Goal(
            user_id=user.id,
            name=payload["name"].strip(),
            goal_type=payload.get("goal_type", "general"),
            target_amount=target,
            current_amount=quantize_money(current),
            planned_monthly_contribution=planned,
            deadline=deadline,
            description=payload.get("description"),
            status="completed" if current >= target else "active",
            linked_account_id=linked_account_id,
        )
        goal = self.repo.create_goal(goal)

        # Record starting progress as an initial contribution if current > 0
        if current > 0:
            contribution = GoalContribution(
                goal_id=goal.id,
                amount=current,
                contributed_on=date.today(),
                source="manual",
                linked_account_id=linked_account_id,
            )
            self.repo.add_contribution(contribution)

        seeded, seed_message = self._seed_current_month_allocation(user, goal)
        result = self._goal_to_dict(goal)
        result["money_plan_seeded"] = seeded
        result["money_plan_seed_message"] = seed_message
        return result

    def update_goal(self, user: User, goal_id: UUID, payload: dict[str, Any]) -> dict[str, Any]:
        goal = self._require_goal(user.id, goal_id)
        if goal.status == "archived":
            raise ConflictError(code="GOAL_ARCHIVED", message="Archived goals cannot be edited")

        if payload.get("name") is not None:
            goal.name = payload["name"].strip()
        if payload.get("target_amount") is not None:
            target = self._parse_positive_amount(payload["target_amount"], field="target_amount")
            if self._effective_current_amount(goal) > target:
                raise AppError(
                    code="INVALID_TARGET_AMOUNT",
                    message="Target amount cannot be less than current amount",
                    status_code=422,
                )
            goal.target_amount = target
        if payload.get("description") is not None:
            goal.description = payload["description"]
        if payload.get("deadline") is not None or payload.get("months_until_deadline") is not None:
            goal.deadline = self._resolve_deadline(
                {
                    "deadline": payload.get("deadline", goal.deadline),
                    "months_until_deadline": payload.get("months_until_deadline"),
                },
                default_deadline=goal.deadline,
            )

        planned_changed = False
        if payload.get("planned_monthly_contribution") is not None:
            goal.planned_monthly_contribution = self._parse_non_negative_amount(
                payload["planned_monthly_contribution"],
                field="planned_monthly_contribution",
            )
            planned_changed = True

        if "linked_account_id" in payload:
            linked_id = payload["linked_account_id"]
            if linked_id is not None:
                from app.models.banking import ConnectedAccount
                from sqlalchemy import select
                account = self.db.scalars(
                    select(ConnectedAccount).where(
                        ConnectedAccount.id == linked_id,
                        ConnectedAccount.user_id == user.id
                    )
                ).first()
                if not account:
                    raise AppError(
                        code="INVALID_LINKED_ACCOUNT",
                        message="The specified linked account was not found or belongs to another user",
                        status_code=422
                    )
                goal.linked_account_id = account.id
            else:
                goal.linked_account_id = None
            
            # Update all contributions of this goal to point to the new linked account
            for contribution in goal.contributions:
                contribution.linked_account_id = goal.linked_account_id

        if self._effective_current_amount(goal) >= goal.target_amount:
            goal.status = "completed"
        elif goal.status == "completed":
            goal.status = "active"

        goal = self.repo.save_goal(goal)

        seed_message = None
        seeded = None
        if planned_changed:
            seeded, seed_message = self._seed_current_month_allocation(user, goal)

        result = self._goal_to_dict(goal)
        if seeded is not None:
            result["money_plan_seeded"] = seeded
            result["money_plan_seed_message"] = seed_message
        return result

    def add_contribution(self, user: User, goal_id: UUID, payload: dict[str, Any]) -> dict[str, Any]:
        goal = self._require_goal(user.id, goal_id)
        if goal.status == "archived":
            raise ConflictError(code="GOAL_ARCHIVED", message="Cannot contribute to an archived goal")

        amount = self._parse_positive_amount(payload["amount"], field="amount")
        contributed_on = payload.get("contributed_on") or date.today()

        contribution = GoalContribution(
            goal_id=goal.id,
            amount=amount,
            contributed_on=contributed_on,
            source="manual",
            linked_account_id=goal.linked_account_id,
        )
        self.repo.add_contribution(contribution)

        goal.current_amount = quantize_money(goal.current_amount + amount)
        if self._effective_current_amount(goal) >= goal.target_amount:
            # Cap stored opening+manual so effective never exceeds target after plan sums.
            plan_total = self.repo.sum_plan_allocations_for_goal(goal.id)
            goal.current_amount = quantize_money(
                max(Decimal("0"), goal.target_amount - plan_total)
            )
            goal.status = "completed"
        goal = self.repo.save_goal(goal)

        detail = self._goal_to_dict(goal)
        detail["contributions"] = [
            self._contribution_to_dict(c) for c in self.repo.list_contributions(goal.id, limit=50)
        ]
        detail["plan_history"] = [
            {"year": year, "month": month, "amount": money_to_str(amt)}
            for year, month, amt in self.repo.list_plan_allocations_for_goal(goal.id)
        ]
        return detail

    def get_projection(self, user: User, goal_id: UUID) -> dict[str, Any]:
        goal = self._require_goal(user.id, goal_id)
        metrics = build_goal_metrics(
            target_amount=goal.target_amount,
            current_amount=self._effective_current_amount(goal),
            planned_monthly_contribution=goal.planned_monthly_contribution,
            deadline=goal.deadline,
        )
        message = self._projection_message(goal, metrics)
        return {"goal_id": str(goal.id), "metrics": metrics, "message": message}

    def archive_goal(self, user: User, goal_id: UUID) -> dict[str, Any]:
        goal = self._require_goal(user.id, goal_id)
        goal.status = "archived"
        goal = self.repo.save_goal(goal)

        # Remove from current unlocked month only — keep locked/historical allocations.
        today = date.today()
        self.repo.remove_goal_allocation_from_month(
            user_id=user.id,
            goal_id=goal.id,
            year=today.year,
            month=today.month,
        )
        return self._goal_to_dict(goal)

    def list_active_goals_for_money_plan(self, user_id: UUID) -> list[Goal]:
        return self.repo.list_goals(user_id, active_only=True)

    def get_goal_for_allocation(self, user_id: UUID, goal_id: UUID) -> Goal | None:
        goal = self.repo.get_goal(user_id, goal_id)
        if goal is None or goal.status != "active":
            return None
        return goal

    def _effective_current_amount(self, goal: Goal) -> Decimal:
        """
        Accumulated = opening/manual saved (goals.current_amount)
        + SUM(monthly_allocations where goal_id = goal).

        Money Plan goal lines and goal_contributions are not both added as
        independent ledgers for the same event: contributions update
        goals.current_amount; plan allocations are summed separately.
        """
        if goal.goal_type == "emergency_fund":
            return quantize_money(goal.current_amount)
        plan_total = self.repo.sum_plan_allocations_for_goal(goal.id)
        combined = quantize_money(goal.current_amount + plan_total)
        return quantize_money(min(goal.target_amount, combined))

    def _seed_current_month_allocation(self, user: User, goal: Goal) -> tuple[bool, str | None]:
        if goal.planned_monthly_contribution <= 0:
            return False, "No planned contribution set; Money Plan not updated"

        today = date.today()
        record = self.money_repo.get_month(user.id, today.year, today.month)
        if record is None:
            record = self.money_repo.get_or_create_month(user.id, today.year, today.month)
            record = self.money_repo.get_month(user.id, today.year, today.month) or record

        if record.is_locked:
            return False, "Current month is locked; allocation not updated"
        if record.income is None:
            return False, "Set monthly income in Money before seeding goal allocation"

        existing_goal_allocs = {
            a.goal_id: a.amount for a in record.allocations if a.goal_id is not None
        }
        category_allocs = [
            (a.category_id, a.amount) for a in record.allocations 
            if a.category_id is not None and a.category is not None and a.category.slug != "goals"
        ]
        goal_allocs = [
            (gid, amt) for gid, amt in existing_goal_allocs.items() if gid != goal.id
        ]
        goal_allocs.append((goal.id, goal.planned_monthly_contribution))

        category_total = sum_amounts([amt for _, amt in category_allocs])
        goal_total = sum_amounts([amt for _, amt in goal_allocs])
        new_total = quantize_money(category_total + goal_total)
        if new_total > record.income:
            return (
                False,
                "Goal created, but allocation exceeds income for the current month",
            )

        parsed_category = [(cid, amt) for cid, amt in category_allocs if cid is not None]
        parsed_goal = [(gid, amt) for gid, amt in goal_allocs]
        self.money_repo.replace_allocations(record.id, parsed_category, parsed_goal)
        return True, None

    def _require_goal(self, user_id: UUID, goal_id: UUID) -> Goal:
        goal = self.repo.get_goal(user_id, goal_id)
        if goal is None:
            raise NotFoundError(code="GOAL_NOT_FOUND", message="Goal not found")
        return goal

    def _build_summary(self, goals: list[Goal]) -> dict[str, Any]:
        if not goals:
            return {
                "total_goals": 0,
                "total_target": money_to_str(Decimal("0")),
                "total_saved": money_to_str(Decimal("0")),
                "overall_progress_percentage": money_to_str(Decimal("0")),
            }
        total_target = sum_amounts([g.target_amount for g in goals])
        total_saved = sum_amounts([self._effective_current_amount(g) for g in goals])
        overall = (
            quantize_money((total_saved / total_target) * Decimal("100"))
            if total_target > 0
            else Decimal("0")
        )
        return {
            "total_goals": len(goals),
            "total_target": money_to_str(total_target),
            "total_saved": money_to_str(total_saved),
            "overall_progress_percentage": money_to_str(min(overall, Decimal("100"))),
        }

    def _goal_to_dict(self, goal: Goal) -> dict[str, Any]:
        effective_current = self._effective_current_amount(goal)
        metrics = build_goal_metrics(
            target_amount=goal.target_amount,
            current_amount=effective_current,
            planned_monthly_contribution=goal.planned_monthly_contribution,
            deadline=goal.deadline,
        )
        status = goal.status
        if status != "archived" and effective_current >= goal.target_amount:
            status = "completed"

        linked_account_dict = None
        if goal.linked_account:
            linked_account_dict = {
                "id": str(goal.linked_account.id),
                "institution_name": goal.linked_account.institution_name,
                "masked_account_number": goal.linked_account.masked_account_number,
                "account_type": goal.linked_account.account_type
            }

        return {
            "id": str(goal.id),
            "name": goal.name,
            "goal_type": goal.goal_type,
            "target_amount": money_to_str(goal.target_amount),
            "current_amount": money_to_str(effective_current),
            "planned_monthly_contribution": money_to_str(goal.planned_monthly_contribution),
            "deadline": goal.deadline.isoformat(),
            "description": goal.description,
            "status": status,
            "metrics": metrics,
            "linked_account_id": str(goal.linked_account_id) if goal.linked_account_id else None,
            "linked_account": linked_account_dict,
        }

    @staticmethod
    def _contribution_to_dict(contribution: GoalContribution) -> dict[str, Any]:
        return {
            "id": str(contribution.id),
            "amount": money_to_str(contribution.amount),
            "contributed_on": contribution.contributed_on.isoformat(),
            "source": contribution.source,
            "created_at": contribution.created_at.isoformat(),
            "linked_account_id": str(contribution.linked_account_id) if contribution.linked_account_id else None,
        }

    @staticmethod
    def _parse_positive_amount(value: str, *, field: str) -> Decimal:
        amount = parse_money(value)
        if amount <= 0:
            raise AppError(
                code="INVALID_AMOUNT",
                message=f"{field} must be greater than zero",
                status_code=422,
            )
        return amount

    @staticmethod
    def _parse_non_negative_amount(value: str, *, field: str) -> Decimal:
        amount = parse_money(value)
        if amount < 0:
            raise AppError(
                code="INVALID_AMOUNT",
                message=f"{field} cannot be negative",
                status_code=422,
            )
        return amount

    @staticmethod
    def _resolve_deadline(
        payload: dict[str, Any],
        *,
        default_deadline: date | None = None,
    ) -> date:
        if payload.get("deadline") is not None:
            deadline = payload["deadline"]
            if isinstance(deadline, str):
                deadline = date.fromisoformat(deadline)
            if deadline <= date.today():
                raise AppError(
                    code="INVALID_DEADLINE",
                    message="Deadline must be in the future",
                    status_code=422,
                )
            return deadline

        months = payload.get("months_until_deadline")
        if months is not None:
            return add_months(date.today(), int(months))

        if default_deadline is not None:
            return default_deadline

        raise AppError(
            code="DEADLINE_REQUIRED",
            message="Provide deadline or months_until_deadline",
            status_code=422,
        )

    @staticmethod
    def _projection_message(goal: Goal, metrics: dict[str, Any]) -> str:
        status = metrics["pace_status"]
        if status == "COMPLETED":
            return "Goal reached."
        if metrics["estimated_months"] is None:
            return "No contribution plan set."
        eta = metrics["estimated_completion_date"]
        if status == "OVERDUE":
            required = metrics["required_monthly_contribution"]
            return (
                f"Deadline passed. To catch up you would need ₹{required}/month "
                f"with {metrics['months_remaining']} months remaining on the calendar."
            )
        return (
            f"At your current pace of ₹{metrics['planned_monthly_contribution']}/month, "
            f"you'll reach this goal in approximately {metrics['estimated_months']} months"
            f"{f' (around {eta})' if eta else ''}."
        )

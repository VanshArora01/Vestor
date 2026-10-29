from __future__ import annotations

from datetime import date
from typing import Any, Optional, List
from uuid import UUID

from pydantic import BaseModel, Field


class CreateGoalRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    goal_type: str = Field(default="general", pattern="^(general|emergency_fund|savings)$")
    target_amount: str
    current_amount: str | None = None
    planned_monthly_contribution: str
    deadline: date | None = None
    months_until_deadline: int | None = Field(default=None, ge=1, le=600)
    description: str | None = Field(default=None, max_length=2000)
    linked_account_id: UUID | None = None


class UpdateGoalRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    target_amount: str | None = None
    planned_monthly_contribution: str | None = None
    deadline: date | None = None
    months_until_deadline: int | None = Field(default=None, ge=1, le=600)
    description: str | None = Field(default=None, max_length=2000)
    linked_account_id: UUID | None = None


class ContributionRequest(BaseModel):
    amount: str
    contributed_on: date | None = None
    linked_account_id: UUID | None = None


class GoalContributionResponse(BaseModel):
    id: str
    amount: str
    contributed_on: str
    source: str
    created_at: str
    linked_account_id: Optional[UUID] = None


class GoalMetricsResponse(BaseModel):
    progress_percentage: str
    remaining_amount: str
    months_remaining: int
    required_monthly_contribution: str | None
    planned_monthly_contribution: str
    estimated_months: int | None
    estimated_completion_date: str | None
    pace_status: str
    deadline_reachable_at_plan: bool
    monthly_gap: str | None = None


class GoalLinkedAccountSchema(BaseModel):
    id: UUID
    institution_name: str
    masked_account_number: str
    account_type: str


class GoalResponse(BaseModel):
    id: str
    name: str
    goal_type: str
    target_amount: str
    current_amount: str
    planned_monthly_contribution: str
    deadline: str
    description: str | None
    status: str
    metrics: GoalMetricsResponse
    money_plan_seeded: bool | None = None
    money_plan_seed_message: str | None = None
    linked_account_id: Optional[UUID] = None
    linked_account: Optional[GoalLinkedAccountSchema] = None


class GoalDetailResponse(GoalResponse):
    contributions: list[GoalContributionResponse] = []
    plan_history: list[dict[str, Any]] = []


class GoalsSummaryResponse(BaseModel):
    total_goals: int
    total_target: str
    total_saved: str
    overall_progress_percentage: str


class GoalsListResponse(BaseModel):
    goals: list[GoalResponse]
    summary: GoalsSummaryResponse


class GoalProjectionResponse(BaseModel):
    goal_id: str
    metrics: GoalMetricsResponse
    message: str

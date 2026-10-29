from __future__ import annotations

from pydantic import BaseModel, Field, model_validator


class IncomeRequest(BaseModel):
    amount: str = Field(..., description="Monthly income in INR as decimal string")


class AdjustmentRequest(BaseModel):
    amount: str = Field(..., description="Explicit manual income adjustment")





class AllocationItemRequest(BaseModel):
    category_id: str | None = None
    goal_id: str | None = None
    amount: str

    @model_validator(mode="after")
    def validate_xor(self) -> AllocationItemRequest:
        has_category = self.category_id is not None and self.category_id != ""
        has_goal = self.goal_id is not None and self.goal_id != ""
        if has_category == has_goal:
            raise ValueError("Each allocation item must have exactly one of category_id or goal_id")
        return self


class AllocationRequest(BaseModel):
    items: list[AllocationItemRequest]
    require_complete: bool = False


class SpendingItemRequest(BaseModel):
    category_id: str
    amount: str


class SpendingRequest(BaseModel):
    items: list[SpendingItemRequest]


class CreateCategoryRequest(BaseModel):
    kind: str = Field(..., pattern="^(allocation|money_plan|spending)$")
    name: str = Field(..., min_length=1, max_length=100)
    semantic_type: str | None = Field(
        default=None,
        pattern="^(savings|investment|goal|expense|other)$",
        description="Required for Money Plan (allocation) categories",
    )


class UpdateCategoryRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    semantic_type: str | None = Field(
        default=None,
        pattern="^(savings|investment|goal|expense|other)$",
    )
    is_active: bool | None = None


class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    scope: str
    is_system: bool
    is_others: bool
    is_custom: bool
    is_active: bool
    semantic_type: str | None = None


class AllocationLineResponse(BaseModel):
    line_type: str
    category_id: str | None = None
    goal_id: str | None = None
    category_name: str | None = None
    goal_name: str | None = None
    category_slug: str | None = None
    is_others: bool = False
    is_custom: bool = False
    is_active: bool = True
    semantic_type: str | None = None
    amount: str | None
    percentage: str | None


class SpendingLineResponse(BaseModel):
    category_id: str
    category_name: str
    category_slug: str
    is_others: bool
    is_custom: bool = False
    is_active: bool = True
    amount: str | None
    percentage: str | None


class MonthMetricsResponse(BaseModel):
    income: str | None
    carryover: str | None = None
    confirmed_income: str | None = None
    manual_income_adjustment: str | None = None
    available_to_plan: str | None = None
    unallocated: str | None = None
    allocated_total: str | None
    remaining_allocation: str | None
    money_available_before_spending: str | None
    allocation_percentage: str | None
    allocation_complete: bool
    allocation_exceeds_income: bool
    spending_total: str | None
    money_available: str | None
    exceeds_income: bool
    excess_amount: str | None
    surplus: str | None
    spending_percentage: str | None
    savings_rate: str | None


class InsightResponse(BaseModel):
    type: str
    severity: str
    data: dict
    message: str


class MonthContextResponse(BaseModel):
    message: str


class IncomeCandidateResponse(BaseModel):
    id: str
    narration: str
    amount: str
    transaction_timestamp: str


class MonthStateResponse(BaseModel):
    year: int
    month: int
    currency: str
    is_locked: bool
    income: str | None
    metrics: MonthMetricsResponse
    allocations: list[AllocationLineResponse]
    spending: list[SpendingLineResponse]
    context: MonthContextResponse | None = None
    insights: list[InsightResponse] = []
    is_connected: bool = False
    is_history_incomplete: bool = False
    income_candidates: list[IncomeCandidateResponse] = []
    income_conflict: dict | None = None


class MonthSummaryResponse(BaseModel):
    year: int
    month: int
    is_locked: bool
    has_income: bool
    metrics: MonthMetricsResponse


class ComparisonChangesResponse(BaseModel):
    income: str | None = None
    income_pct: str | None = None
    spending: str | None = None
    spending_pct: str | None = None
    surplus: str | None = None
    surplus_pct: str | None = None


class ComparisonSideResponse(BaseModel):
    income: str | None
    spending: str | None
    surplus: str | None


class ComparisonMetricsResponse(BaseModel):
    current: ComparisonSideResponse
    previous: ComparisonSideResponse
    changes: ComparisonChangesResponse


class CategoryChangeResponse(BaseModel):
    category_id: str
    category_name: str
    change: str | None
    previous_amount: str | None


class SpendingChangeResponse(CategoryChangeResponse):
    spending: str | None = None


class AllocationChangeResponse(CategoryChangeResponse):
    allocation: str | None = None
    goal_id: str | None = None
    line_type: str | None = None


class ComparisonResponse(BaseModel):
    year: int
    month: int
    previous_year: int | None
    previous_month: int | None
    comparison: ComparisonMetricsResponse
    spending_changes: list[SpendingChangeResponse]
    allocation_changes: list[AllocationChangeResponse]
    insights: list[InsightResponse]


class ReconciliationItemResponse(BaseModel):
    name: str
    planned: str
    actual: str | None
    remaining: str | None
    status: str
    provenance: str
    category_slug: str
    line_type: str


class MoneyReconciliationResponse(BaseModel):
    month: str
    planned_allocation_total: str
    actual_allocation_total: str | None
    planned_spending_total: str
    actual_spending_total: str | None
    actual_income_total: str | None
    actual_investment_total: str | None
    items: list[ReconciliationItemResponse]


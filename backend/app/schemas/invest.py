from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field, model_validator


class InvestmentTransactionCreate(BaseModel):
    asset_type: str = Field(..., pattern="^(stock|mutual_fund|etf|gold|fd|ppf|nps|other)$")
    asset_id: str | None = None
    quantity: str | None = None
    unit_price: str | None = None
    traded_on: date
    notes: str | None = Field(default=None, max_length=2000)
    display_name: str | None = Field(default=None, min_length=1, max_length=255)
    gold_unit: str | None = Field(default=None, pattern="^grams$")
    fd_principal: str | None = None
    fd_interest_rate: str | None = None
    fd_start_date: date | None = None
    fd_maturity_date: date | None = None
    fd_compounding: str | None = Field(
        default=None, pattern="^(simple|monthly|quarterly|yearly)$"
    )
    amount: str | None = Field(
        default=None,
        description="Ignored for priced lots; server computes amount. Optional seed for manual types.",
    )
    manual_current_value: str | None = None

    @model_validator(mode="after")
    def validate_type_fields(self) -> InvestmentTransactionCreate:
        if self.asset_type in {"stock", "mutual_fund", "etf"}:
            if not self.asset_id:
                raise ValueError("asset_id is required for stock, mutual_fund, and etf")
            if self.quantity is None or self.unit_price is None:
                raise ValueError("quantity and unit_price are required for instrument buys")
        elif self.asset_type == "gold":
            if self.quantity is None or self.unit_price is None:
                raise ValueError("quantity and unit_price are required for gold")
            if self.gold_unit is None:
                raise ValueError("gold_unit is required for gold (grams)")
        elif self.asset_type == "fd":
            missing = [
                name
                for name, value in [
                    ("display_name", self.display_name),
                    ("fd_principal", self.fd_principal),
                    ("fd_interest_rate", self.fd_interest_rate),
                    ("fd_start_date", self.fd_start_date),
                    ("fd_maturity_date", self.fd_maturity_date),
                    ("fd_compounding", self.fd_compounding),
                ]
                if value is None
            ]
            if missing:
                raise ValueError(f"FD requires: {', '.join(missing)}")
            if self.fd_start_date and self.fd_maturity_date and self.fd_maturity_date <= self.fd_start_date:
                raise ValueError("fd_maturity_date must be after fd_start_date")
        elif self.asset_type in {"ppf", "nps", "other"}:
            if not self.display_name:
                raise ValueError("display_name is required for ppf, nps, and other")
            if self.amount is None and (self.quantity is None or self.unit_price is None):
                raise ValueError(
                    "Provide amount, or quantity and unit_price, for ppf/nps/other buys"
                )
        return self


class InvestmentTransactionResponse(BaseModel):
    id: str
    holding_id: str
    asset_id: str | None = None
    transaction_type: str
    quantity: str | None = None
    unit_price: str | None = None
    amount: str
    traded_on: str
    notes: str | None = None
    created_at: str


class HoldingResponse(BaseModel):
    id: str
    asset_id: str | None = None
    asset_type: str
    display_name: str
    symbol: str | None = None
    quantity: str
    total_invested: str
    average_cost: str
    valuation_mode: str
    valuation_status: str
    manual_current_value: str | None = None
    manual_value_updated_at: str | None = None
    current_value: str | None = None
    absolute_gain_loss: str | None = None
    return_pct: str | None = None
    value_source: str | None = None
    has_current_valuation: bool
    latest_price: str | None = None
    price_timestamp: str | None = None
    price_fetched_at: str | None = None
    price_status: str | None = None
    status: str
    gold_unit: str | None = None
    fd_principal: str | None = None
    fd_interest_rate: str | None = None
    fd_start_date: str | None = None
    fd_maturity_date: str | None = None
    fd_compounding: str | None = None
    estimated_current_value: str | None = None
    maturity_value: str | None = None
    accrued_interest: str | None = None
    created_at: str
    updated_at: str


class HoldingDetailResponse(BaseModel):
    """POST /transactions response — includes the newly created lot."""

    holding: HoldingResponse
    transaction: InvestmentTransactionResponse
    transactions: list[InvestmentTransactionResponse]


class HoldingLotsResponse(BaseModel):
    """GET /holdings/{id} response."""

    holding: HoldingResponse
    transactions: list[InvestmentTransactionResponse]


class InvestSummaryResponse(BaseModel):
    total_invested: str
    valued_invested: str = "0.00"
    current_value: str | None = None
    absolute_gain_loss: str | None = None
    return_pct: str | None = None
    total_holdings: int
    total_transactions: int
    valued_holdings: int
    unvalued_holdings: int
    valuation_complete: bool
    fresh_holdings: int = 0
    stale_holdings: int = 0
    valuation_notice: str | None = None
    partially_valued: bool = False


class HoldingsListResponse(BaseModel):
    items: list[HoldingResponse]
    total: int
    limit: int
    offset: int


class HistoryItemResponse(BaseModel):
    id: str
    holding_id: str
    asset_id: str | None = None
    asset_type: str
    display_name: str
    symbol: str | None = None
    transaction_type: str
    quantity: str | None = None
    unit_price: str | None = None
    amount: str
    traded_on: str
    notes: str | None = None
    created_at: str


class HistoryListResponse(BaseModel):
    items: list[HistoryItemResponse]
    total: int
    limit: int
    offset: int


class AssetSearchItemResponse(BaseModel):
    id: str
    name: str
    symbol: str | None = None
    exchange: str | None = None
    asset_type: str
    isin: str | None = None
    active: bool


class AssetSearchResponse(BaseModel):
    items: list[AssetSearchItemResponse]
    total: int
    limit: int


class AssetDetailResponse(BaseModel):
    id: str
    name: str
    symbol: str | None = None
    exchange: str | None = None
    asset_type: str
    provider_symbol: str | None = None
    isin: str | None = None
    active: bool


class InvestPlanCategoryResponse(BaseModel):
    category: str
    category_slug: str
    planned: str
    actual: str
    remaining: str
    over_invested: str
    percentage_of_plan: str | None = None
    status: str
    asset_types: list[str]


class InvestPlanTotalsResponse(BaseModel):
    planned: str
    actual: str
    remaining: str
    over_invested: str


class InvestPlanResponse(BaseModel):
    year: int
    month: int
    month_key: str
    totals: InvestPlanTotalsResponse
    categories: list[InvestPlanCategoryResponse]


class PerformanceSnapshotResponse(BaseModel):
    date: str
    total_invested: str
    total_value: str | None = None
    absolute_gain_loss: str | None = None
    return_pct: str | None = None
    valuation_status: str
    total_holdings: int
    valued_holdings: int
    unvalued_holdings: int


class InvestPerformanceResponse(BaseModel):
    from_date: str | None = None
    to_date: str | None = None
    snapshots: list[PerformanceSnapshotResponse]

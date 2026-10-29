from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class PaperAccountCreate(BaseModel):
    starting_capital: Decimal = Field(default=Decimal("100000.00"), ge=1000, le=1000000000)


class PaperOrderCreate(BaseModel):
    asset_id: UUID
    side: Literal["buy", "sell"]
    quantity: Decimal = Field(gt=0, max_digits=18, decimal_places=6)
    idempotency_key: UUID


class PaperAccountSummaryResponse(BaseModel):
    starting_capital: str
    available_cash: str
    invested_cost_basis: str
    current_market_value: str | None
    portfolio_equity: str | None
    realised_pnl: str
    unrealised_pnl: str | None
    total_pnl: str | None
    net_deposits_withdrawals: str
    valuation_complete: bool
    unvalued_positions: int


class PaperPositionResponse(BaseModel):
    asset_id: str
    symbol: str
    name: str
    exchange: str
    quantity: str
    average_cost: str
    cost_basis: str
    current_price: str | None
    market_value: str | None
    unrealised_pnl: str | None
    price_status: str
    price_timestamp: str | None


class PaperOrderResponse(BaseModel):
    id: str
    asset_id: str
    symbol: str
    instrument_name: str
    exchange: str
    side: str
    quantity: str
    execution_price: str
    gross_amount: str
    charges: str
    realised_pnl: str
    status: str
    created_at: str


class PaperPortfolioResponse(BaseModel):
    account_id: str
    summary: PaperAccountSummaryResponse
    positions: list[PaperPositionResponse]


class PaperOrderResultResponse(BaseModel):
    order: PaperOrderResponse
    portfolio: PaperPortfolioResponse


class PaperInstrumentResponse(BaseModel):
    id: str
    symbol: str
    name: str
    exchange: str
    instrument_type: str
    isin: str | None
    provider_symbol: str | None
    price: str | None
    previous_close: str | None
    change_pct: str | None
    price_status: str
    price_timestamp: str | None
    fetched_at: str | None


class PaperInstrumentListResponse(BaseModel):
    items: list[PaperInstrumentResponse]
    total: int
    limit: int
    offset: int
    source: str


class PaperWatchlistResponse(BaseModel):
    items: list[PaperInstrumentResponse]


class PaperOrderListResponse(BaseModel):
    items: list[PaperOrderResponse]
    total: int
    limit: int
    offset: int


class PaperCandleResponse(BaseModel):
    time: str
    open: str
    high: str
    low: str
    close: str
    volume: int


class PaperCandlesResponse(BaseModel):
    asset_id: str
    symbol: str
    range: str
    interval: str
    source: str
    retrieved_at: str
    data_status: str
    candles: list[PaperCandleResponse]


class PaperMoversResponse(BaseModel):
    source: str
    universe: str
    gainers: list[PaperInstrumentResponse]
    losers: list[PaperInstrumentResponse]


class PaperMarketStatusResponse(BaseModel):
    exchange: str
    session: str
    observed_at: str
    note: str

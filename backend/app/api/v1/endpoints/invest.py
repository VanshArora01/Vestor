from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.invest import (
    AssetDetailResponse,
    AssetSearchResponse,
    HoldingDetailResponse,
    HoldingLotsResponse,
    HoldingsListResponse,
    HistoryListResponse,
    InvestPerformanceResponse,
    InvestPlanResponse,
    InvestSummaryResponse,
    InvestmentTransactionCreate,
)
from app.services.invest_plan_service import InvestPlanService
from app.services.invest_service import InvestService
from app.services.market_data_service import MarketDataService
from app.repositories.invest_repository import InvestRepository
from app.services.portfolio_snapshot_service import PortfolioSnapshotService

router = APIRouter(prefix="/invest", tags=["invest"])


@router.post("/prices/refresh")
def refresh_investment_prices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Refresh market-priced assets in the authenticated user's open portfolio."""
    holdings = InvestRepository(db).list_all_holdings_for_summary(current_user.id, status="open")
    asset_ids = [
        holding.asset_id
        for holding in holdings
        if holding.asset_id is not None and holding.valuation_mode == "market"
    ]
    result = MarketDataService(db).refresh_asset_ids(asset_ids)
    return result


@router.post("/transactions", response_model=HoldingDetailResponse, status_code=201)
def create_investment_transaction(
    payload: InvestmentTransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HoldingDetailResponse:
    """Creates a new investment transaction.

    Validates the payload and creates a new holding if needed.
    """
    result = InvestService(db).create_buy_transaction(
        current_user,
        payload.model_dump(),
    )
    return HoldingDetailResponse.model_validate(result)


@router.get("/assets/search", response_model=AssetSearchResponse)
def search_invest_assets(
    q: str = Query(..., min_length=1, max_length=100),
    asset_type: str | None = Query(default=None, alias="type"),
    exchange: str | None = Query(default=None),
    limit: int | None = Query(default=None, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AssetSearchResponse:
    """Searches for investment assets by name, symbol, or ISIN.

    Returns a paginated list of matching assets with their details.
    """
    _ = current_user  # JWT required; assets are global reference data
    return AssetSearchResponse.model_validate(
        InvestService(db).search_assets(
            q=q,
            asset_type=asset_type,
            exchange=exchange,
            limit=limit,
        )
    )


@router.get("/assets/{asset_id}", response_model=AssetDetailResponse)
def get_invest_asset(
    asset_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AssetDetailResponse:
    """Returns detailed information about a specific investment asset.

    Includes asset details and provider information where applicable.
    """
    _ = current_user
    return AssetDetailResponse.model_validate(InvestService(db).get_asset(asset_id))


@router.get("/summary", response_model=InvestSummaryResponse)
def get_invest_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvestSummaryResponse:
    """Returns the current portfolio summary including total invested, current value,
    unrealised gain/loss, and return percentage.

    This endpoint includes the latest market prices where available.
    """
    return InvestSummaryResponse.model_validate(InvestService(db).get_summary(current_user))


@router.get("/plan", response_model=InvestPlanResponse)
def get_invest_plan(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvestPlanResponse:
    """Returns the investment plan for a specific month.

    Compares planned investment allocations with actual BUY transactions.
    """
    return InvestPlanResponse.model_validate(
        InvestPlanService(db).get_plan(current_user, year=year, month=month)
    )


@router.get("/performance", response_model=InvestPerformanceResponse)
def get_invest_performance(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvestPerformanceResponse:
    """Persisted daily portfolio snapshots only — no live provider calls.

    This endpoint returns historical portfolio valuations based on persisted snapshots.
    For current market prices, use the refresh endpoint.
    """
    return InvestPerformanceResponse.model_validate(
        PortfolioSnapshotService(db).get_performance(
            current_user,
            from_date=from_date,
            to_date=to_date,
        )
    )


@router.get("/holdings", response_model=HoldingsListResponse)
def list_invest_holdings(
    asset_type: str | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int | None = Query(default=None, ge=1, le=100),
    offset: int | None = Query(default=None, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HoldingsListResponse:
    """Returns a paginated list of the user's investment holdings.

    Includes current market prices where available and valuation status.
    """
    return HoldingsListResponse.model_validate(
        InvestService(db).list_holdings(
            current_user,
            asset_type=asset_type,
            status=status,
            limit=limit,
            offset=offset,
        )
    )


@router.get("/holdings/{holding_id}", response_model=HoldingLotsResponse)
def get_invest_holding(
    holding_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HoldingLotsResponse:
    """Returns detailed information about a specific investment holding.

    Includes current market price and valuation status where applicable.
    """
    return HoldingLotsResponse.model_validate(
        InvestService(db).get_holding(current_user, holding_id)
    )


@router.get("/history", response_model=HistoryListResponse)
def list_invest_history(
    asset_type: str | None = Query(default=None),
    transaction_type: str | None = Query(default=None),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    limit: int | None = Query(default=None, ge=1, le=100),
    offset: int | None = Query(default=None, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HistoryListResponse:
    """Returns a paginated list of investment transactions.

    Includes transaction details and associated holding information.
    """
    return HistoryListResponse.model_validate(
        InvestService(db).list_history(
            current_user,
            asset_type=asset_type,
            transaction_type=transaction_type,
            from_date=from_date,
            to_date=to_date,
            limit=limit,
            offset=offset,
        )
    )


@router.get("/export")
def export_invest_history(
    asset_type: str | None = Query(default=None),
    transaction_type: str | None = Query(default=None),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Exports investment transaction history as a CSV file.

    Includes all transaction details and associated holding information.
    """
    csv_body = InvestService(db).export_history_csv(
        current_user,
        asset_type=asset_type,
        transaction_type=transaction_type,
        from_date=from_date,
        to_date=to_date,
    )
    return Response(
        content=csv_body,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="vestor-investment-history.csv"'
        },
    )

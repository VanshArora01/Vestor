from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.paper_trading import (
    PaperAccountCreate,
    PaperCandlesResponse,
    PaperInstrumentListResponse,
    PaperInstrumentResponse,
    PaperMarketStatusResponse,
    PaperMoversResponse,
    PaperOrderCreate,
    PaperOrderListResponse,
    PaperOrderResultResponse,
    PaperPortfolioResponse,
    PaperWatchlistResponse,
)
from app.services.paper_trading_service import PaperTradingService

router = APIRouter(prefix="/paper-trading", tags=["paper-trading"])


@router.get("/account", response_model=PaperPortfolioResponse | None)
def get_paper_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict | None:
    return PaperTradingService(db).get_account(current_user.id)


@router.post("/account", response_model=PaperPortfolioResponse, status_code=201)
def create_paper_account(
    payload: PaperAccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return PaperTradingService(db).create_account(current_user.id, payload.starting_capital)


@router.get("/portfolio", response_model=PaperPortfolioResponse)
def get_paper_portfolio(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return PaperTradingService(db).get_portfolio(current_user.id)


@router.get("/instruments", response_model=PaperInstrumentListResponse)
def list_paper_instruments(
    q: str | None = Query(default=None, max_length=100),
    exchange: Literal["NSE", "BSE"] | None = None,
    category: Literal["equity", "index"] | None = None,
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return PaperTradingService(db).list_instruments(
        query=q,
        exchange=exchange,
        category=category,
        limit=limit,
        offset=offset,
    )


@router.get("/movers", response_model=PaperMoversResponse)
def get_paper_movers(
    exchange: Literal["NSE", "BSE"] | None = None,
    limit: int = Query(default=5, ge=1, le=10),
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return PaperTradingService(db).get_movers(exchange=exchange, limit=limit)


@router.get("/market-status/{exchange}", response_model=PaperMarketStatusResponse)
def get_market_status(
    exchange: Literal["NSE", "BSE"],
    _current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    return PaperTradingService.market_status(exchange)


@router.get("/instruments/{asset_id}/quote", response_model=PaperInstrumentResponse)
def get_instrument_quote(
    asset_id: UUID,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return PaperTradingService(db).get_quote(asset_id)


@router.post("/instruments/{asset_id}/refresh", response_model=PaperInstrumentResponse)
def refresh_instrument_quote(
    asset_id: UUID,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return PaperTradingService(db).refresh_quote(asset_id)


@router.get("/instruments/{asset_id}/candles", response_model=PaperCandlesResponse)
def get_instrument_candles(
    asset_id: UUID,
    range: Literal["1D", "1W", "1M", "3M", "1Y"] = "1D",
    interval: str | None = Query(default=None, max_length=8),
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return PaperTradingService(db).get_candles(asset_id, range, interval)


@router.get("/watchlist", response_model=PaperWatchlistResponse)
def get_paper_watchlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return PaperTradingService(db).list_watchlist(current_user.id)


@router.post("/watchlist/{asset_id}", response_model=PaperWatchlistResponse)
def add_paper_watchlist_item(
    asset_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return PaperTradingService(db).add_watchlist_item(current_user.id, asset_id)


@router.delete("/watchlist/{asset_id}", response_model=PaperWatchlistResponse)
def remove_paper_watchlist_item(
    asset_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return PaperTradingService(db).remove_watchlist_item(current_user.id, asset_id)


@router.get("/orders", response_model=PaperOrderListResponse)
def get_paper_orders(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return PaperTradingService(db).list_orders(current_user.id, limit=limit, offset=offset)


@router.post("/orders", response_model=PaperOrderResultResponse, status_code=201)
def place_paper_order(
    payload: PaperOrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return PaperTradingService(db).place_order(
        current_user.id,
        asset_id=payload.asset_id,
        side=payload.side,
        quantity=payload.quantity,
        idempotency_key=payload.idempotency_key,
    )

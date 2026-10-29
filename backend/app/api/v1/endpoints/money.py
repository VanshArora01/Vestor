from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.money import (
    AdjustmentRequest,
    AllocationRequest,
    CreateCategoryRequest,
    IncomeRequest,
    MoneyReconciliationResponse,
    MonthStateResponse,
    SpendingRequest,
    UpdateCategoryRequest,
)
from app.services.money_reconciliation_service import MoneyReconciliationService
from app.services.money_service import MoneyService

router = APIRouter(prefix="/money", tags=["money"])


@router.get("/current", response_model=MonthStateResponse)
def get_current_month(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return MoneyService(db).get_current_month_state(current_user)


@router.get("/months")
def list_months(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    return MoneyService(db).list_months(current_user)


@router.get("/categories")
def list_categories(
    kind: str = Query(..., pattern="^(allocation|money_plan|spending)$"),
    active_only: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    return MoneyService(db).list_categories(current_user, kind, active_only=active_only)


@router.post("/categories")
def create_category(
    payload: CreateCategoryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return MoneyService(db).create_category(
        current_user,
        payload.kind,
        payload.name,
        semantic_type=payload.semantic_type,
    )


@router.patch("/categories/{category_id}")
def update_category(
    category_id: UUID,
    payload: UpdateCategoryRequest,
    kind: str = Query(..., pattern="^(allocation|money_plan|spending)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return MoneyService(db).update_category(
        current_user,
        kind,
        category_id,
        name=payload.name,
        semantic_type=payload.semantic_type,
        is_active=payload.is_active,
    )


@router.post("/categories/{category_id}/deactivate")
def deactivate_category(
    category_id: UUID,
    kind: str = Query(..., pattern="^(allocation|money_plan|spending)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return MoneyService(db).deactivate_category(current_user, kind, category_id)


@router.get("/reconciliation/{year}/{month}", response_model=MoneyReconciliationResponse)
def get_money_reconciliation(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return MoneyReconciliationService(db).reconcile_month(current_user.id, year, month)


@router.post("/reconciliation/{year}/{month}", response_model=MoneyReconciliationResponse)
def post_money_reconciliation(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Read-only alias. Reconciliation never mutates the user's plan."""
    return MoneyReconciliationService(db).reconcile_month(current_user.id, year, month)


@router.get("/{year}/{month}", response_model=MonthStateResponse)
def get_month(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return MoneyService(db).get_month(current_user, year, month)


@router.get("/{year}/{month}/comparison")
def get_comparison(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return MoneyService(db).get_comparison(current_user, year, month)


@router.post("/{year}/{month}/income", response_model=MonthStateResponse)
def set_income(
    year: int,
    month: int,
    payload: IncomeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return MoneyService(db).set_income(current_user, year, month, payload.amount)


@router.post("/{year}/{month}/adjustment", response_model=MonthStateResponse)
def set_adjustment(
    year: int,
    month: int,
    payload: AdjustmentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return MoneyService(db).set_adjustment(current_user, year, month, payload.amount)


@router.put("/{year}/{month}/allocation", response_model=MonthStateResponse)
def set_allocation(
    year: int,
    month: int,
    payload: AllocationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    items = [item.model_dump() for item in payload.items]
    return MoneyService(db).set_allocation(
        current_user,
        year,
        month,
        items,
        require_complete=payload.require_complete,
    )


@router.post("/{year}/{month}/allocation/add-remaining-to-others", response_model=MonthStateResponse)
def add_remaining_to_others(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return MoneyService(db).add_remaining_to_others(current_user, year, month)


@router.post("/{year}/{month}/allocation/add-remaining-to-goals", response_model=MonthStateResponse)
def add_remaining_to_goals(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return MoneyService(db).add_remaining_to_goals(current_user, year, month)


@router.put("/{year}/{month}/spending", response_model=MonthStateResponse)
def set_spending(
    year: int,
    month: int,
    payload: SpendingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    items = [item.model_dump() for item in payload.items]
    return MoneyService(db).set_spending(current_user, year, month, items)


@router.post("/{year}/{month}/unlock", response_model=MonthStateResponse)
def unlock_month(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return MoneyService(db).unlock_month(current_user, year, month)




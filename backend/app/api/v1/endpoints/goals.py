from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.goals import (
    ContributionRequest,
    CreateGoalRequest,
    GoalDetailResponse,
    GoalProjectionResponse,
    GoalResponse,
    GoalsListResponse,
    GoalsSummaryResponse,
    UpdateGoalRequest,
)
from app.services.goals_service import GoalsService

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("", response_model=GoalsListResponse)
def list_goals(
    include_archived: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GoalsListResponse:
    return GoalsService(db).list_goals(current_user, include_archived=include_archived)


@router.get("/summary", response_model=GoalsSummaryResponse)
def goals_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GoalsSummaryResponse:
    return GoalsService(db).get_summary(current_user)


@router.post("", response_model=GoalResponse, status_code=201)
def create_goal(
    payload: CreateGoalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GoalResponse:
    return GoalsService(db).create_goal(current_user, payload.model_dump())


@router.get("/{goal_id}", response_model=GoalDetailResponse)
def get_goal(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GoalDetailResponse:
    return GoalsService(db).get_goal(current_user, goal_id)


@router.patch("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: UUID,
    payload: UpdateGoalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GoalResponse:
    return GoalsService(db).update_goal(
        current_user,
        goal_id,
        payload.model_dump(exclude_unset=True),
    )


@router.post("/{goal_id}/contributions", response_model=GoalDetailResponse)
def add_contribution(
    goal_id: UUID,
    payload: ContributionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GoalDetailResponse:
    return GoalsService(db).add_contribution(
        current_user,
        goal_id,
        payload.model_dump(exclude_unset=True),
    )


@router.get("/{goal_id}/projection", response_model=GoalProjectionResponse)
def get_projection(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GoalProjectionResponse:
    return GoalsService(db).get_projection(current_user, goal_id)


@router.post("/{goal_id}/archive", response_model=GoalResponse)
def archive_goal(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GoalResponse:
    return GoalsService(db).archive_goal(current_user, goal_id)

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.academy import (
    RecommendationResponse,
    UpdateLessonProgressRequest,
    UserProgressResponse,
)
from app.services.academy_service import AcademyService

router = APIRouter(prefix="/academy", tags=["academy"])


@router.get("/progress", response_model=UserProgressResponse)
def get_user_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserProgressResponse:
  """Get authenticated user's academy progress, streaks, and XP."""
  return AcademyService(db).get_user_progress(current_user.id)


@router.put("/progress/{lesson_id}", response_model=UserProgressResponse)
def update_lesson_progress(
    lesson_id: str,
    payload: UpdateLessonProgressRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserProgressResponse:
  """Update stage or completion status for a lesson."""
  return AcademyService(db).update_lesson_progress(
      current_user.id, lesson_id, payload
  )


@router.get("/recommendation", response_model=RecommendationResponse)
def get_recommendation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecommendationResponse:
  """Get deterministic next recommended lesson based on user progress."""
  return AcademyService(db).get_recommendation(current_user.id)

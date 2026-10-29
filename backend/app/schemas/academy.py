from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class LessonProgressItem(BaseModel):
  lesson_id: str
  current_stage: str = "hook"
  is_completed: bool = False
  quiz_score: Optional[int] = None
  prediction_answer: Optional[str] = None
  quiz_answers: Optional[Dict[str, str]] = None
  completed_at: Optional[datetime] = None


class UserProgressResponse(BaseModel):
  completed_lessons: List[str]
  lesson_progress: Dict[str, LessonProgressItem]
  streak_days: int = 1
  total_xp: int = 0
  last_active_date: str


class UpdateLessonProgressRequest(BaseModel):
  current_stage: Optional[str] = None
  is_completed: Optional[bool] = None
  quiz_score: Optional[int] = None
  prediction_answer: Optional[str] = None
  quiz_answers: Optional[Dict[str, str]] = None


class RecommendationResponse(BaseModel):
  recommended_lesson_id: str
  reason: str
  path_title: str
  tier: int

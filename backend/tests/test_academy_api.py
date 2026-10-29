from uuid import uuid4
import pytest
from app.models.user import User
from app.services.academy_service import AcademyService
from app.schemas.academy import UpdateLessonProgressRequest


def test_academy_service_progress_lifecycle(db):
  user_id = uuid4()
  user = User(
      id=user_id,
      email=f"learn_{user_id.hex[:6]}@example.com",
      password_hash="pw",
      name="Test Learner",
  )
  db.add(user)
  db.commit()

  service = AcademyService(db)

  # Initial state
  progress = service.get_user_progress(user_id)
  assert progress.completed_lessons == []
  assert progress.total_xp == 0
  assert progress.streak_days == 1

  # Update stage
  updated = service.update_lesson_progress(
      user_id=user_id,
      lesson_id="budgeting-50-30-20",
      payload=UpdateLessonProgressRequest(
          current_stage="predict",
          prediction_answer="opt-2",
      ),
  )
  assert "budgeting-50-30-20" in updated.lesson_progress
  assert updated.lesson_progress["budgeting-50-30-20"].current_stage == "predict"
  assert updated.completed_lessons == []

  # Complete lesson
  completed = service.update_lesson_progress(
      user_id=user_id,
      lesson_id="budgeting-50-30-20",
      payload=UpdateLessonProgressRequest(
          current_stage="act",
          is_completed=True,
          quiz_score=100,
      ),
  )
  assert "budgeting-50-30-20" in completed.completed_lessons
  assert completed.total_xp == 80  # 50 base + 30 quiz

  # Check recommendation progresses to next flagship lesson
  rec = service.get_recommendation(user_id)
  assert rec.recommended_lesson_id == "emergency-fund"
  assert rec.path_title == "Safety"

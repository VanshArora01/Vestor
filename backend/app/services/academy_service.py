from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.academy import UserAcademyProgress, UserGamification
from app.schemas.academy import (
    LessonProgressItem,
    RecommendationResponse,
    UpdateLessonProgressRequest,
    UserProgressResponse,
)


def get_today_str() -> str:
  return datetime.now(timezone.utc).strftime("%Y-%m-%d")


class AcademyService:

  def __init__(self, db: Session) -> None:
    self.db = db

  def get_or_create_gamification(self, user_id: UUID) -> UserGamification:
    stmt = select(UserGamification).where(UserGamification.user_id == user_id)
    gamification = self.db.scalars(stmt).first()
    if not gamification:
      gamification = UserGamification(
          user_id=user_id,
          total_xp=0,
          streak_days=1,
          last_active_date=get_today_str(),
      )
      self.db.add(gamification)
      self.db.commit()
      self.db.refresh(gamification)
    return gamification

  def update_streak(self, gamification: UserGamification) -> None:
    today = get_today_str()
    if gamification.last_active_date == today:
      return

    last_dt = datetime.strptime(gamification.last_active_date, "%Y-%m-%d")
    today_dt = datetime.strptime(today, "%Y-%m-%d")
    diff_days = (today_dt - last_dt).days

    if diff_days == 1:
      gamification.streak_days += 1
    elif diff_days > 1:
      gamification.streak_days = 1

    gamification.last_active_date = today

  def get_user_progress(self, user_id: UUID) -> UserProgressResponse:
    gamification = self.get_or_create_gamification(user_id)

    stmt = select(UserAcademyProgress).where(
        UserAcademyProgress.user_id == user_id
    )
    progress_rows = self.db.scalars(stmt).all()

    completed_lessons: List[str] = []
    lesson_progress: Dict[str, LessonProgressItem] = {}

    for row in progress_rows:
      if row.is_completed:
        completed_lessons.append(row.lesson_id)

      lesson_progress[row.lesson_id] = LessonProgressItem(
          lesson_id=row.lesson_id,
          current_stage=row.current_stage,
          is_completed=row.is_completed,
          quiz_score=row.quiz_score,
          prediction_answer=row.prediction_answer,
          quiz_answers=row.quiz_answers,
          completed_at=row.completed_at,
      )

    return UserProgressResponse(
        completed_lessons=completed_lessons,
        lesson_progress=lesson_progress,
        streak_days=gamification.streak_days,
        total_xp=gamification.total_xp,
        last_active_date=gamification.last_active_date,
    )

  def update_lesson_progress(
      self,
      user_id: UUID,
      lesson_id: str,
      payload: UpdateLessonProgressRequest,
  ) -> UserProgressResponse:
    gamification = self.get_or_create_gamification(user_id)
    self.update_streak(gamification)

    stmt = select(UserAcademyProgress).where(
        UserAcademyProgress.user_id == user_id,
        UserAcademyProgress.lesson_id == lesson_id,
    )
    record = self.db.scalars(stmt).first()

    if not record:
      record = UserAcademyProgress(
          user_id=user_id,
          lesson_id=lesson_id,
          current_stage=payload.current_stage or "hook",
      )
      self.db.add(record)

    if payload.current_stage:
      record.current_stage = payload.current_stage

    if payload.prediction_answer:
      record.prediction_answer = payload.prediction_answer

    if payload.quiz_answers:
      record.quiz_answers = payload.quiz_answers

    if payload.quiz_score is not None:
      record.quiz_score = payload.quiz_score

    # Check completion
    if payload.is_completed and not record.is_completed:
      record.is_completed = True
      record.completed_at = datetime.now(timezone.utc)
      # Award XP: 50 base XP + quiz accuracy bonus up to 30 XP
      score = payload.quiz_score if payload.quiz_score is not None else 100
      bonus_xp = 50 + int((score / 100) * 30)
      gamification.total_xp += bonus_xp

    self.db.commit()
    return self.get_user_progress(user_id)

  def get_recommendation(self, user_id: UUID) -> RecommendationResponse:
    stmt = select(UserAcademyProgress).where(
        UserAcademyProgress.user_id == user_id,
        UserAcademyProgress.is_completed.is_(True),
    )
    completed_rows = self.db.scalars(stmt).all()
    completed_ids = {r.lesson_id for r in completed_rows}

    # Deterministic sequence of flagship lessons
    sequence = [
        (
            "budgeting-50-30-20",
            (
                "Start with the core cash flow partitioning framework to gain"
                " control of your monthly take-home salary."
            ),
            "Budgeting",
            1,
        ),
        (
            "emergency-fund",
            (
                "Now that your cash flow is mapped, establish a 3–6 month liquid"
                " safety runway before investing in equities."
            ),
            "Safety",
            1,
        ),
        (
            "compound-interest",
            (
                "Your baseline safety net is modeled; discover the mathematical"
                " engine of exponential compound interest."
            ),
            "Investing Basics",
            1,
        ),
        (
            "inflation-purchasing-power",
            (
                "Learn how retail inflation silently erodes cash purchasing"
                " power and dictates your required investment hurdle rate."
            ),
            "Foundations",
            1,
        ),
        (
            "sip-mutual-funds",
            (
                "Deploy long-term compounding against inflation through"
                " rupee-cost averaging and systematic mutual fund investing."
            ),
            "Mutual Funds",
            1,
        ),
    ]

    for lid, reason, path_title, tier in sequence:
      if lid not in completed_ids:
        return RecommendationResponse(
            recommended_lesson_id=lid,
            reason=reason,
            path_title=path_title,
            tier=tier,
        )

    # All 5 completed
    return RecommendationResponse(
        recommended_lesson_id="budgeting-50-30-20",
        reason=(
            "You have completed all flagship lessons! Revisit your budgeting"
            " allocations or explore upcoming specialized path topics."
        ),
        path_title="Review & Advanced Mastery",
        tier=1,
    )

from datetime import datetime, timezone
import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.models.base import Base


class UserAcademyProgress(Base):
  __tablename__ = "user_academy_progress"

  id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
  user_id = Column(
      UUID(as_uuid=True),
      ForeignKey("users.id", ondelete="CASCADE"),
      nullable=False,
      index=True,
  )
  lesson_id = Column(String(100), nullable=False, index=True)
  current_stage = Column(String(32), nullable=False, default="hook")
  is_completed = Column(Boolean, nullable=False, default=False)
  quiz_score = Column(Integer, nullable=True)
  prediction_answer = Column(String(100), nullable=True)
  quiz_answers = Column(JSONB, nullable=True)
  completed_at = Column(DateTime(timezone=True), nullable=True)
  created_at = Column(
      DateTime(timezone=True),
      default=lambda: datetime.now(timezone.utc),
      nullable=False,
  )
  updated_at = Column(
      DateTime(timezone=True),
      default=lambda: datetime.now(timezone.utc),
      onupdate=lambda: datetime.now(timezone.utc),
      nullable=False,
  )

  __table_args__ = (
      UniqueConstraint("user_id", "lesson_id", name="uq_user_academy_lesson"),
  )


class UserGamification(Base):
  __tablename__ = "user_gamification"

  id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
  user_id = Column(
      UUID(as_uuid=True),
      ForeignKey("users.id", ondelete="CASCADE"),
      nullable=False,
      unique=True,
      index=True,
  )
  total_xp = Column(Integer, nullable=False, default=0)
  streak_days = Column(Integer, nullable=False, default=1)
  last_active_date = Column(String(32), nullable=False)
  updated_at = Column(
      DateTime(timezone=True),
      default=lambda: datetime.now(timezone.utc),
      onupdate=lambda: datetime.now(timezone.utc),
      nullable=False,
  )

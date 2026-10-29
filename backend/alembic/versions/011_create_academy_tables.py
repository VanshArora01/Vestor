"""Create academy progress and gamification tables

Revision ID: 011_create_academy_tables
Revises: 010_create_advisor
Create Date: 2026-10-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "011_create_academy_tables"
down_revision: Union[str, None] = "010_create_advisor"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_academy_progress",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lesson_id", sa.String(length=100), nullable=False),
        sa.Column("current_stage", sa.String(length=32), server_default="hook", nullable=False),
        sa.Column("is_completed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("quiz_score", sa.Integer(), nullable=True),
        sa.Column("prediction_answer", sa.String(length=100), nullable=True),
        sa.Column("quiz_answers", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "lesson_id", name="uq_user_academy_lesson"),
    )
    op.create_index(
        op.f("ix_user_academy_progress_user_id"),
        "user_academy_progress",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_academy_progress_lesson_id"),
        "user_academy_progress",
        ["lesson_id"],
        unique=False,
    )

    op.create_table(
        "user_gamification",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("total_xp", sa.Integer(), server_default="0", nullable=False),
        sa.Column("streak_days", sa.Integer(), server_default="1", nullable=False),
        sa.Column("last_active_date", sa.String(length=32), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_user_gamification_user_id"),
    )
    op.create_index(
        op.f("ix_user_gamification_user_id"),
        "user_gamification",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_user_gamification_user_id"), table_name="user_gamification")
    op.drop_table("user_gamification")
    op.drop_index(op.f("ix_user_academy_progress_lesson_id"), table_name="user_academy_progress")
    op.drop_index(op.f("ix_user_academy_progress_user_id"), table_name="user_academy_progress")
    op.drop_table("user_academy_progress")

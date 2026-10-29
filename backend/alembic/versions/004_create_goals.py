"""Create goals tables and goal-linked monthly allocations

Revision ID: 004_create_goals
Revises: 003_money_category_meta
Create Date: 2026-08-09
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "004_create_goals"
down_revision: Union[str, None] = "003_money_category_meta"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "goals",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("goal_type", sa.String(length=32), nullable=False, server_default="general"),
        sa.Column("target_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("current_amount", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("planned_monthly_contribution", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("deadline", sa.Date(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_goals_user_id", "goals", ["user_id"])
    op.create_index(
        "uq_goals_user_active_emergency_fund",
        "goals",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("goal_type = 'emergency_fund' AND status = 'active'"),
    )

    op.create_table(
        "goal_contributions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("goal_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("contributed_on", sa.Date(), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False, server_default="manual"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["goal_id"], ["goals.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_goal_contributions_goal_id", "goal_contributions", ["goal_id"])
    op.create_index(
        "ix_goal_contributions_goal_contributed_on",
        "goal_contributions",
        ["goal_id", "contributed_on"],
    )

    op.drop_constraint(
        "uq_monthly_allocations_finance_category",
        "monthly_allocations",
        type_="unique",
    )
    op.alter_column("monthly_allocations", "category_id", nullable=True)
    op.add_column(
        "monthly_allocations",
        sa.Column("goal_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_monthly_allocations_goal_id",
        "monthly_allocations",
        "goals",
        ["goal_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index("ix_monthly_allocations_goal_id", "monthly_allocations", ["goal_id"])
    op.create_check_constraint(
        "ck_monthly_allocations_category_xor_goal",
        "monthly_allocations",
        "(category_id IS NULL) <> (goal_id IS NULL)",
    )
    op.create_index(
        "uq_monthly_allocations_finance_category",
        "monthly_allocations",
        ["monthly_finance_id", "category_id"],
        unique=True,
        postgresql_where=sa.text("category_id IS NOT NULL"),
    )
    op.create_index(
        "uq_monthly_allocations_finance_goal",
        "monthly_allocations",
        ["monthly_finance_id", "goal_id"],
        unique=True,
        postgresql_where=sa.text("goal_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_monthly_allocations_finance_goal", table_name="monthly_allocations")
    op.drop_index("uq_monthly_allocations_finance_category", table_name="monthly_allocations")
    op.drop_constraint("ck_monthly_allocations_category_xor_goal", "monthly_allocations", type_="check")
    op.drop_index("ix_monthly_allocations_goal_id", table_name="monthly_allocations")
    op.drop_constraint("fk_monthly_allocations_goal_id", "monthly_allocations", type_="foreignkey")
    op.drop_column("monthly_allocations", "goal_id")
    op.alter_column("monthly_allocations", "category_id", nullable=False)
    op.create_unique_constraint(
        "uq_monthly_allocations_finance_category",
        "monthly_allocations",
        ["monthly_finance_id", "category_id"],
    )

    op.drop_index("ix_goal_contributions_goal_contributed_on", table_name="goal_contributions")
    op.drop_index("ix_goal_contributions_goal_id", table_name="goal_contributions")
    op.drop_table("goal_contributions")

    op.drop_index("uq_goals_user_active_emergency_fund", table_name="goals")
    op.drop_index("ix_goals_user_id", table_name="goals")
    op.drop_table("goals")

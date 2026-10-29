"""Create money module tables and seed system categories

Revision ID: 002_create_money_tables
Revises: 001_create_users
Create Date: 2026-08-08
"""

from typing import Sequence, Union
from uuid import uuid4

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002_create_money_tables"
down_revision: Union[str, None] = "001_create_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ALLOCATION_CATEGORIES = [
    ("Emergency Fund", "emergency-fund", False),
    ("Mutual Funds", "mutual-funds", False),
    ("Stocks", "stocks", False),
    ("Goals", "goals", False),
    ("Personal Expenses", "personal-expenses", False),
    ("Others", "others", True),
]

SPENDING_CATEGORIES = [
    ("Food", "food", False),
    ("Transport", "transport", False),
    ("Rent", "rent", False),
    ("Utilities", "utilities", False),
    ("Shopping", "shopping", False),
    ("Entertainment", "entertainment", False),
    ("Healthcare", "healthcare", False),
    ("Education", "education", False),
    ("Travel", "travel", False),
    ("Others", "others", True),
]


def upgrade() -> None:
    op.create_table(
        "monthly_finances",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("income", sa.Numeric(14, 2), nullable=True),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="INR"),
        sa.Column("is_locked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
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
        sa.UniqueConstraint("user_id", "year", "month", name="uq_monthly_finances_user_year_month"),
    )
    op.create_index("ix_monthly_finances_user_id", "monthly_finances", ["user_id"])

    op.create_table(
        "allocation_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_others", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
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
    op.create_index("ix_allocation_categories_slug", "allocation_categories", ["slug"])
    op.create_index("ix_allocation_categories_user_id", "allocation_categories", ["user_id"])
    op.create_index(
        "uq_allocation_categories_system_name",
        "allocation_categories",
        ["name"],
        unique=True,
        postgresql_where=sa.text("user_id IS NULL"),
    )
    op.create_index(
        "uq_allocation_categories_user_name",
        "allocation_categories",
        ["user_id", "name"],
        unique=True,
        postgresql_where=sa.text("user_id IS NOT NULL"),
    )

    op.create_table(
        "spending_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_others", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
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
    op.create_index("ix_spending_categories_slug", "spending_categories", ["slug"])
    op.create_index("ix_spending_categories_user_id", "spending_categories", ["user_id"])
    op.create_index(
        "uq_spending_categories_system_name",
        "spending_categories",
        ["name"],
        unique=True,
        postgresql_where=sa.text("user_id IS NULL"),
    )
    op.create_index(
        "uq_spending_categories_user_name",
        "spending_categories",
        ["user_id", "name"],
        unique=True,
        postgresql_where=sa.text("user_id IS NOT NULL"),
    )

    op.create_table(
        "monthly_allocations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("monthly_finance_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
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
        sa.ForeignKeyConstraint(["category_id"], ["allocation_categories.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["monthly_finance_id"], ["monthly_finances.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "monthly_finance_id",
            "category_id",
            name="uq_monthly_allocations_finance_category",
        ),
    )
    op.create_index(
        "ix_monthly_allocations_monthly_finance_id",
        "monthly_allocations",
        ["monthly_finance_id"],
    )
    op.create_index("ix_monthly_allocations_category_id", "monthly_allocations", ["category_id"])

    op.create_table(
        "monthly_spendings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("monthly_finance_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
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
        sa.ForeignKeyConstraint(["category_id"], ["spending_categories.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["monthly_finance_id"], ["monthly_finances.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "monthly_finance_id",
            "category_id",
            name="uq_monthly_spendings_finance_category",
        ),
    )
    op.create_index(
        "ix_monthly_spendings_monthly_finance_id",
        "monthly_spendings",
        ["monthly_finance_id"],
    )
    op.create_index("ix_monthly_spendings_category_id", "monthly_spendings", ["category_id"])

    allocation_table = sa.table(
        "allocation_categories",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String()),
        sa.column("slug", sa.String()),
        sa.column("is_system", sa.Boolean()),
        sa.column("is_others", sa.Boolean()),
        sa.column("user_id", postgresql.UUID(as_uuid=True)),
    )
    op.bulk_insert(
        allocation_table,
        [
            {
                "id": uuid4(),
                "name": name,
                "slug": slug,
                "is_system": True,
                "is_others": is_others,
                "user_id": None,
            }
            for name, slug, is_others in ALLOCATION_CATEGORIES
        ],
    )

    spending_table = sa.table(
        "spending_categories",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String()),
        sa.column("slug", sa.String()),
        sa.column("is_system", sa.Boolean()),
        sa.column("is_others", sa.Boolean()),
        sa.column("user_id", postgresql.UUID(as_uuid=True)),
    )
    op.bulk_insert(
        spending_table,
        [
            {
                "id": uuid4(),
                "name": name,
                "slug": slug,
                "is_system": True,
                "is_others": is_others,
                "user_id": None,
            }
            for name, slug, is_others in SPENDING_CATEGORIES
        ],
    )


def downgrade() -> None:
    op.drop_table("monthly_spendings")
    op.drop_table("monthly_allocations")
    op.drop_index("uq_spending_categories_user_name", table_name="spending_categories")
    op.drop_index("uq_spending_categories_system_name", table_name="spending_categories")
    op.drop_index("ix_spending_categories_user_id", table_name="spending_categories")
    op.drop_index("ix_spending_categories_slug", table_name="spending_categories")
    op.drop_table("spending_categories")
    op.drop_index("uq_allocation_categories_user_name", table_name="allocation_categories")
    op.drop_index("uq_allocation_categories_system_name", table_name="allocation_categories")
    op.drop_index("ix_allocation_categories_user_id", table_name="allocation_categories")
    op.drop_index("ix_allocation_categories_slug", table_name="allocation_categories")
    op.drop_table("allocation_categories")
    op.drop_index("ix_monthly_finances_user_id", table_name="monthly_finances")
    op.drop_table("monthly_finances")

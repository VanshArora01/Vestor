from __future__ import annotations

from decimal import Decimal
from uuid import UUID
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, UniqueConstraint, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.goal import Goal


class MonthlyFinance(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "monthly_finances"
    __table_args__ = (
        UniqueConstraint("user_id", "year", "month", name="uq_monthly_finances_user_year_month"),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    income: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    manual_income_adjustment: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    carryover: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    is_locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    allocations: Mapped[list[MonthlyAllocation]] = relationship(
        back_populates="monthly_finance",
        cascade="all, delete-orphan",
    )
    spendings: Mapped[list[MonthlySpending]] = relationship(
        back_populates="monthly_finance",
        cascade="all, delete-orphan",
    )


class AllocationCategory(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "allocation_categories"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_others: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    semantic_type: Mapped[str] = mapped_column(String(32), nullable=False, default="other")
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    allocations: Mapped[list[MonthlyAllocation]] = relationship(back_populates="category")


class SpendingCategory(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "spending_categories"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_others: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    spendings: Mapped[list[MonthlySpending]] = relationship(back_populates="category")


class MonthlyAllocation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "monthly_allocations"

    monthly_finance_id: Mapped[UUID] = mapped_column(
        ForeignKey("monthly_finances.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("allocation_categories.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    goal_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("goals.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)

    monthly_finance: Mapped[MonthlyFinance] = relationship(back_populates="allocations")
    category: Mapped[AllocationCategory | None] = relationship(back_populates="allocations")
    goal: Mapped["Goal | None"] = relationship(back_populates="allocations")


class MonthlySpending(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "monthly_spendings"
    __table_args__ = (
        UniqueConstraint(
            "monthly_finance_id",
            "category_id",
            name="uq_monthly_spendings_finance_category",
        ),
    )

    monthly_finance_id: Mapped[UUID] = mapped_column(
        ForeignKey("monthly_finances.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id: Mapped[UUID] = mapped_column(
        ForeignKey("spending_categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)

    monthly_finance: Mapped[MonthlyFinance] = relationship(back_populates="spendings")
    category: Mapped[SpendingCategory] = relationship(back_populates="spendings")





class IncomePattern(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "income_patterns"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    narration_pattern: Mapped[str] = mapped_column(String(255), nullable=False)
    merchant_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    connected_account_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("connected_accounts.id", ondelete="SET NULL"),
        nullable=True,
    )
    typical_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    amount_tolerance: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    frequency: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

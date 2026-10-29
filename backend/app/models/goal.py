from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Goal(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "goals"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    goal_type: Mapped[str] = mapped_column(String(32), nullable=False, default="general")
    target_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    current_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal("0"))
    planned_monthly_contribution: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), nullable=False, default=Decimal("0")
    )
    deadline: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    linked_account_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("connected_accounts.id", ondelete="SET NULL"),
        nullable=True,
    )
    linked_account: Mapped[Optional["ConnectedAccount"]] = relationship("ConnectedAccount")

    contributions: Mapped[list[GoalContribution]] = relationship(
        back_populates="goal",
        cascade="all, delete-orphan",
        order_by="GoalContribution.contributed_on.desc()",
    )
    allocations: Mapped[list["MonthlyAllocation"]] = relationship(back_populates="goal")


class GoalContribution(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "goal_contributions"

    goal_id: Mapped[UUID] = mapped_column(
        ForeignKey("goals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    contributed_on: Mapped[date] = mapped_column(Date, nullable=False)
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="manual")
    linked_account_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("connected_accounts.id", ondelete="SET NULL"),
        nullable=True,
    )
    bank_transaction_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("bank_transactions.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    goal: Mapped[Goal] = relationship(back_populates="contributions")

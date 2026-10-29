from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AdvisorConversation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "advisor_conversations"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)

    messages: Mapped[list["AdvisorMessage"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="AdvisorMessage.created_at.asc()",
    )


class AdvisorMessage(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "advisor_messages"

    conversation_id: Mapped[UUID] = mapped_column(
        ForeignKey("advisor_conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tools_used: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    provider: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    conversation: Mapped[AdvisorConversation] = relationship(back_populates="messages")

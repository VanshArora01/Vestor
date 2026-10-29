from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.advisor import AdvisorConversation, AdvisorMessage


class AdvisorRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_conversation(self, user_id: UUID, title: str | None = None) -> AdvisorConversation:
        conversation = AdvisorConversation(user_id=user_id, title=title)
        self.db.add(conversation)
        self.db.flush()
        return conversation

    def get_conversation(self, user_id: UUID, conversation_id: UUID) -> AdvisorConversation | None:
        return self.db.scalars(
            select(AdvisorConversation)
            .options(selectinload(AdvisorConversation.messages))
            .where(
                AdvisorConversation.id == conversation_id,
                AdvisorConversation.user_id == user_id,
            )
        ).first()

    def list_conversations(self, user_id: UUID, *, limit: int = 50) -> list[AdvisorConversation]:
        return list(
            self.db.scalars(
                select(AdvisorConversation)
                .where(AdvisorConversation.user_id == user_id)
                .order_by(AdvisorConversation.updated_at.desc())
                .limit(limit)
            ).all()
        )

    def delete_conversation(self, conversation: AdvisorConversation) -> None:
        self.db.delete(conversation)
        self.db.flush()

    def add_message(
        self,
        conversation: AdvisorConversation,
        *,
        role: str,
        content: str,
        tools_used: list[str] | None = None,
        provider: str | None = None,
    ) -> AdvisorMessage:
        message = AdvisorMessage(
            conversation_id=conversation.id,
            role=role,
            content=content,
            tools_used=tools_used,
            provider=provider,
        )
        self.db.add(message)
        conversation.title = conversation.title or self._title_from(content)
        self.db.flush()
        return message

    def list_messages(
        self,
        conversation_id: UUID,
        *,
        limit: int = 50,
        before_id: UUID | None = None,
    ) -> list[AdvisorMessage]:
        stmt = (
            select(AdvisorMessage)
            .where(AdvisorMessage.conversation_id == conversation_id)
            .order_by(AdvisorMessage.created_at.desc())
            .limit(limit)
        )
        if before_id is not None:
            pivot = self.db.get(AdvisorMessage, before_id)
            if pivot is not None:
                stmt = stmt.where(AdvisorMessage.created_at < pivot.created_at)
        rows = list(self.db.scalars(stmt).all())
        rows.reverse()
        return rows

    @staticmethod
    def _title_from(content: str) -> str:
        compact = " ".join(content.strip().split())
        return compact[:80] or "Conversation"

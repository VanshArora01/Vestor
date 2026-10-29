from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.ai.orchestration import AssistantOrchestrator
from app.ai.providers.base import ProviderError
from app.ai.providers.factory import build_fallback_provider, build_primary_provider
from app.ai.tools.financial_tools import FinancialTools
from app.core.config import Settings, get_settings
from app.core.exceptions import AppError, NotFoundError
from app.models.advisor import AdvisorConversation, AdvisorMessage
from app.models.user import User
from app.repositories.advisor_repository import AdvisorRepository
from app.schemas.advisor import MAX_MESSAGE_LENGTH


class AdvisorService:
    def __init__(
        self,
        db: Session,
        settings: Settings | None = None,
        orchestrator: AssistantOrchestrator | None = None,
    ) -> None:
        self.db = db
        self.repo = AdvisorRepository(db)
        self.settings = settings or get_settings()
        self._orchestrator = orchestrator

    def list_conversations(self, user: User) -> dict[str, Any]:
        items = self.repo.list_conversations(user.id)
        return {"items": [self._conversation_summary(c) for c in items]}

    def create_conversation(self, user: User) -> dict[str, Any]:
        conversation = self.repo.create_conversation(user.id)
        self.db.commit()
        return {
            "id": conversation.id,
            "title": conversation.title,
            "created_at": conversation.created_at,
        }

    def get_conversation(self, user: User, conversation_id: UUID) -> dict[str, Any]:
        conversation = self._require_conversation(user.id, conversation_id)
        messages = self.repo.list_messages(
            conversation.id, limit=self.settings.ai_max_history_messages
        )
        return {
            **self._conversation_summary(conversation),
            "messages": [self._message_dict(m) for m in messages],
        }

    def delete_conversation(self, user: User, conversation_id: UUID) -> None:
        conversation = self._require_conversation(user.id, conversation_id)
        self.repo.delete_conversation(conversation)
        self.db.commit()

    def list_messages(
        self, user: User, conversation_id: UUID, *, limit: int = 50, before_id: UUID | None = None
    ) -> dict[str, Any]:
        conversation = self._require_conversation(user.id, conversation_id)
        messages = self.repo.list_messages(conversation.id, limit=min(limit, 100), before_id=before_id)
        return {"items": [self._message_dict(m) for m in messages]}

    def send_message(
        self,
        user: User,
        content: str,
        conversation_id: UUID | None = None,
        page_context: Any | None = None,
    ) -> dict[str, Any]:
        text = content.strip()
        if not text:
            raise AppError(code="EMPTY_MESSAGE", message="Message cannot be empty", status_code=422)
        if len(text) > MAX_MESSAGE_LENGTH:
            raise AppError(code="MESSAGE_TOO_LONG", message="Message is too long", status_code=422)

        page_ctx_dict = None
        if page_context is not None:
            if hasattr(page_context, "model_dump"):
                page_ctx_dict = page_context.model_dump()
            elif isinstance(page_context, dict):
                page_ctx_dict = page_context

        if conversation_id is None:
            title = text[:50] + ("…" if len(text) > 50 else "")
            conversation = self.repo.create_conversation(user.id, title=title)
        else:
            conversation = self._require_conversation(user.id, conversation_id)
            if not conversation.title:
                conversation.title = text[:50] + ("…" if len(text) > 50 else "")

        history_rows = self.repo.list_messages(
            conversation.id, limit=self.settings.ai_max_history_messages
        )
        history = [(m.role, m.content) for m in history_rows if m.role in {"user", "assistant"}]
        user_message = self.repo.add_message(conversation, role="user", content=text)

        registry = FinancialTools(self.db, user).registry()
        try:
            result = self._get_orchestrator().reply(
                history=history,
                user_message=text,
                registry=registry,
                user_id=user.id,
                page_context=page_ctx_dict,
            )
        except ProviderError as exc:
            self.db.rollback()
            raise self._map_provider_error(exc) from exc

        assistant_message = self.repo.add_message(
            conversation,
            role="assistant",
            content=result["content"],
            tools_used=result.get("tools_used") or None,
            provider=result.get("provider"),
        )
        self.db.commit()
        self.db.refresh(user_message)
        self.db.refresh(assistant_message)
        self.db.refresh(conversation)
        return {
            "conversation_id": conversation.id,
            "user_message": self._message_dict(user_message),
            "assistant_message": self._message_dict(assistant_message),
        }

    def _get_orchestrator(self) -> AssistantOrchestrator:
        if self._orchestrator is not None:
            return self._orchestrator
        try:
            primary = build_primary_provider(self.settings)
        except ProviderError as exc:
            raise AppError(
                code="AI_UNAVAILABLE",
                message="Vestor AI is not configured on the server",
                status_code=503,
            ) from exc
        fallback = build_fallback_provider(self.settings)
        return AssistantOrchestrator(
            primary=primary,
            fallback=fallback,
            timeout_seconds=self.settings.ai_request_timeout_seconds,
            enable_fallback=self.settings.ai_enable_groq_fallback,
        )

    def _require_conversation(self, user_id: UUID, conversation_id: UUID) -> AdvisorConversation:
        conversation = self.repo.get_conversation(user_id, conversation_id)
        if conversation is None:
            raise NotFoundError(code="CONVERSATION_NOT_FOUND", message="Conversation not found")
        return conversation

    @staticmethod
    def _map_provider_error(exc: ProviderError) -> AppError:
        if exc.status_code == 504 or "timed out" in str(exc).lower():
            return AppError(code="AI_TIMEOUT", message="The AI provider timed out", status_code=504)
        if exc.transient:
            return AppError(
                code="AI_PROVIDER_ERROR",
                message="The AI provider is temporarily unavailable",
                status_code=502,
            )
        return AppError(
            code="AI_PROVIDER_ERROR",
            message="The AI provider could not complete this request",
            status_code=502,
        )

    @staticmethod
    def _conversation_summary(conversation: AdvisorConversation) -> dict[str, Any]:
        return {
            "id": conversation.id,
            "title": conversation.title,
            "created_at": conversation.created_at,
            "updated_at": conversation.updated_at,
        }

    @staticmethod
    def _message_dict(message: AdvisorMessage) -> dict[str, Any]:
        return {
            "id": message.id,
            "role": message.role,
            "content": message.content,
            "tools_used": message.tools_used,
            "provider": message.provider,
            "created_at": message.created_at,
        }

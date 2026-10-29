from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


MAX_MESSAGE_LENGTH = 4000


class ConversationCreateResponse(BaseModel):
    id: UUID
    title: str | None
    created_at: datetime


class ConversationSummary(BaseModel):
    id: UUID
    title: str | None
    created_at: datetime
    updated_at: datetime


class ConversationListResponse(BaseModel):
    items: list[ConversationSummary]


class AdvisorMessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    tools_used: list[str] | None = None
    provider: str | None = None
    created_at: datetime


class ConversationDetailResponse(BaseModel):
    id: UUID
    title: str | None
    created_at: datetime
    updated_at: datetime
    messages: list[AdvisorMessageResponse]


class PageContext(BaseModel):
    page: str = Field(..., max_length=64)
    path: str | None = Field(default=None, max_length=256)
    route_title: str | None = Field(default=None, max_length=128)
    selected_item_id: str | None = Field(default=None, max_length=128)
    selected_item_name: str | None = Field(default=None, max_length=128)
    active_month: str | None = Field(default=None, max_length=32)
    active_filter: str | None = Field(default=None, max_length=64)
    metadata: dict[str, Any] | None = None


class SendMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    conversation_id: UUID | None = None
    page_context: PageContext | None = None


class SendMessageResponse(BaseModel):
    conversation_id: UUID
    user_message: AdvisorMessageResponse
    assistant_message: AdvisorMessageResponse


class MessageListResponse(BaseModel):
    items: list[AdvisorMessageResponse]

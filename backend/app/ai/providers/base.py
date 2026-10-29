from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


class ProviderError(Exception):
    def __init__(self, message: str, *, transient: bool = False, status_code: int | None = None) -> None:
        super().__init__(message)
        self.transient = transient
        self.status_code = status_code


@dataclass
class ToolCallRequest:
    id: str
    name: str
    arguments: dict[str, Any]


@dataclass
class ProviderTurn:
    text: str | None
    tool_calls: list[ToolCallRequest] = field(default_factory=list)
    provider_name: str = ""


@dataclass
class ChatTurn:
    role: str
    text: str | None = None
    tool_calls: list[ToolCallRequest] | None = None
    tool_call_id: str | None = None
    tool_name: str | None = None
    tool_result: dict[str, Any] | None = None


class LLMProvider(Protocol):
    name: str

    def complete(
        self,
        *,
        system_instruction: str,
        turns: list[ChatTurn],
        tools: list[dict[str, Any]],
        timeout_seconds: float,
    ) -> ProviderTurn: ...

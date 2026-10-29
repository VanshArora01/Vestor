from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from app.ai.prompts import system_prompt_with_today
from app.ai.providers.base import ChatTurn, LLMProvider, ProviderError, ToolCallRequest
from app.ai.tools.registry import ToolArgumentError, ToolRegistry, UnknownToolError

logger = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 4


class AssistantOrchestrator:
    def __init__(
        self,
        *,
        primary: LLMProvider,
        fallback: LLMProvider | None,
        timeout_seconds: float,
        enable_fallback: bool,
    ) -> None:
        self.primary = primary
        self.fallback = fallback
        self.timeout_seconds = timeout_seconds
        self.enable_fallback = enable_fallback

    def reply(
        self,
        *,
        history: list[tuple[str, str]],
        user_message: str,
        registry: ToolRegistry,
        user_id: UUID,
        page_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        turns: list[ChatTurn] = [
            ChatTurn(role=role, text=text) for role, text in history if role in {"user", "assistant"}
        ]
        turns.append(ChatTurn(role="user", text=user_message))
        tools_used: list[str] = []
        last_error: ProviderError | None = None

        for round_index in range(MAX_TOOL_ROUNDS + 1):
            turn = self._complete(turns, registry.schemas(), page_context=page_context)
            if not turn.tool_calls:
                return {
                    "content": turn.text
                    or "I could not produce an answer from the available data.",
                    "provider": turn.provider_name,
                    "tools_used": tools_used,
                }
            if round_index == MAX_TOOL_ROUNDS:
                break
            assistant_turn = ChatTurn(role="assistant", text=turn.text, tool_calls=turn.tool_calls)
            turns.append(assistant_turn)
            for call in turn.tool_calls:
                tools_used.append(call.name)
                result = self._run_tool(registry, call, user_id)
                turns.append(
                    ChatTurn(
                        role="tool",
                        tool_call_id=call.id,
                        tool_name=call.name,
                        tool_result=result,
                    )
                )
            last_error = None
        _ = last_error
        return {
            "content": "I reached the tool-call limit before finishing. Please ask a more specific question.",
            "provider": self.primary.name,
            "tools_used": tools_used,
        }

    def _complete(
        self,
        turns: list[ChatTurn],
        tools: list[dict[str, Any]],
        page_context: dict[str, Any] | None = None,
    ):
        system = system_prompt_with_today(page_context=page_context)
        try:
            return self.primary.complete(
                system_instruction=system,
                turns=turns,
                tools=tools,
                timeout_seconds=self.timeout_seconds,
            )
        except ProviderError as exc:
            if not (self.enable_fallback and exc.transient and self.fallback is not None):
                raise
            logger.warning("Primary AI provider transient failure; using configured fallback")
            return self.fallback.complete(
                system_instruction=system,
                turns=turns,
                tools=tools,
                timeout_seconds=self.timeout_seconds,
            )

    def _run_tool(
        self, registry: ToolRegistry, call: ToolCallRequest, user_id: UUID
    ) -> dict[str, Any]:
        try:
            return {
                "ok": True,
                "tool": call.name,
                "data": registry.execute(call.name, call.arguments, user_id=user_id),
            }
        except (UnknownToolError, ToolArgumentError) as exc:
            return {"ok": False, "tool": call.name, "error": exc.message}
        except Exception:
            logger.exception("Tool execution failed: %s", call.name)
            return {
                "ok": False,
                "tool": call.name,
                "error": "The financial data tool failed. Do not invent replacements.",
            }

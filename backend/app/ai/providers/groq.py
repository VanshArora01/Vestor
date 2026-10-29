from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from app.ai.providers.base import ChatTurn, ProviderError, ProviderTurn, ToolCallRequest


class GroqProvider:
    name = "groq"

    def __init__(self, api_key: str, model: str) -> None:
        self._api_key = api_key
        self._model = model

    def complete(
        self,
        *,
        system_instruction: str,
        turns: list[ChatTurn],
        tools: list[dict[str, Any]],
        timeout_seconds: float,
    ) -> ProviderTurn:
        try:
            from groq import Groq
        except ImportError as exc:
            raise ProviderError("Groq SDK is not installed", transient=False) from exc

        client = Groq(api_key=self._api_key, timeout=timeout_seconds)
        groq_tools = [
            {
                "type": "function",
                "function": {
                    "name": spec["name"],
                    "description": spec.get("description", ""),
                    "parameters": spec.get("parameters") or {"type": "object", "properties": {}},
                },
            }
            for spec in tools
        ]
        messages = [{"role": "system", "content": system_instruction}]
        messages.extend(self._to_messages(turns))
        try:
            response = client.chat.completions.create(
                model=self._model,
                messages=messages,
                tools=groq_tools or None,
                temperature=0.2,
            )
        except Exception as exc:
            raise self._wrap(exc) from exc

        choice = response.choices[0].message
        tool_calls: list[ToolCallRequest] = []
        for call in getattr(choice, "tool_calls", None) or []:
            raw_args = call.function.arguments if call.function else "{}"
            try:
                args = json.loads(raw_args or "{}")
            except json.JSONDecodeError:
                args = {}
            if not isinstance(args, dict):
                args = {}
            tool_calls.append(
                ToolCallRequest(
                    id=call.id or f"call_{uuid4().hex[:12]}",
                    name=call.function.name,
                    arguments=args,
                )
            )
        return ProviderTurn(
            text=(choice.content or "").strip() or None,
            tool_calls=tool_calls,
            provider_name=self.name,
        )

    @staticmethod
    def _to_messages(turns: list[ChatTurn]) -> list[dict[str, Any]]:
        messages: list[dict[str, Any]] = []
        pending_assistant: dict[str, Any] | None = None
        for turn in turns:
            if turn.role == "user":
                messages.append({"role": "user", "content": turn.text or ""})
            elif turn.role == "assistant":
                payload: dict[str, Any] = {"role": "assistant", "content": turn.text or ""}
                if turn.tool_calls:
                    payload["tool_calls"] = [
                        {
                            "id": call.id,
                            "type": "function",
                            "function": {
                                "name": call.name,
                                "arguments": json.dumps(call.arguments),
                            },
                        }
                        for call in turn.tool_calls
                    ]
                messages.append(payload)
                pending_assistant = payload
            elif turn.role == "tool":
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": turn.tool_call_id or "",
                        "name": turn.tool_name,
                        "content": json.dumps(turn.tool_result or {}),
                    }
                )
        _ = pending_assistant
        return messages

    @staticmethod
    def _wrap(exc: Exception) -> ProviderError:
        status = getattr(exc, "status_code", None)
        message = str(exc).lower()
        if "timeout" in message or "timed out" in message:
            return ProviderError("Groq request timed out", transient=True, status_code=504)
        transient = status in {408, 429, 500, 502, 503, 504} or "rate" in message
        return ProviderError("Groq provider error", transient=transient, status_code=status)

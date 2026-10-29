from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from app.ai.providers.base import ChatTurn, ProviderError, ProviderTurn, ToolCallRequest


def _is_transient(status: int | None) -> bool:
    return status in {408, 429, 500, 502, 503, 504}


class GeminiProvider:
    name = "gemini"

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
            from google import genai
            from google.genai import types
        except ImportError as exc:
            raise ProviderError("Gemini SDK is not installed", transient=False) from exc

        client = genai.Client(api_key=self._api_key)
        declarations = []
        for spec in tools:
            params = self._clean_schema(spec.get("parameters") or {"type": "object", "properties": {}})
            declarations.append(
                types.FunctionDeclaration(
                    name=spec["name"],
                    description=spec.get("description", ""),
                    parameters=params,
                )
            )
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.2,
            tools=[types.Tool(function_declarations=declarations)] if declarations else None,
        )
        contents = self._to_contents(turns, types)
        try:
            response = client.models.generate_content(
                model=self._model,
                contents=contents,
                config=config,
            )
        except Exception as exc:
            raise self._wrap(exc) from exc

        tool_calls: list[ToolCallRequest] = []
        text_parts: list[str] = []
        candidates = getattr(response, "candidates", None) or []
        if not candidates:
            blocked = getattr(response, "prompt_feedback", None)
            raise ProviderError(
                "Gemini returned no candidates",
                transient=False,
            ) if not blocked else ProviderError("Gemini blocked the prompt", transient=False)

        parts = getattr(candidates[0].content, "parts", None) or []
        for part in parts:
            fn = getattr(part, "function_call", None)
            if fn and getattr(fn, "name", None):
                args = dict(getattr(fn, "args", {}) or {})
                tool_calls.append(
                    ToolCallRequest(id=f"call_{uuid4().hex[:12]}", name=fn.name, arguments=args)
                )
            elif getattr(part, "text", None):
                text_parts.append(part.text)

        return ProviderTurn(
            text="\n".join(text_parts).strip() or None,
            tool_calls=tool_calls,
            provider_name=self.name,
        )

    @staticmethod
    def _clean_schema(obj: Any) -> Any:
        if isinstance(obj, dict):
            return {
                k: GeminiProvider._clean_schema(v)
                for k, v in obj.items()
                if k not in {"additionalProperties", "additional_properties"}
            }
        if isinstance(obj, list):
            return [GeminiProvider._clean_schema(x) for x in obj]
        return obj

    @staticmethod
    def _to_contents(turns: list[ChatTurn], types: Any) -> list[Any]:
        contents: list[Any] = []
        for turn in turns:
            if turn.role == "user":
                contents.append(
                    types.Content(role="user", parts=[types.Part(text=turn.text or "")])
                )
            elif turn.role == "assistant":
                parts = []
                if turn.text:
                    parts.append(types.Part(text=turn.text))
                for call in turn.tool_calls or []:
                    parts.append(
                        types.Part.from_function_call(name=call.name, args=call.arguments)
                    )
                if parts:
                    contents.append(types.Content(role="model", parts=parts))
            elif turn.role == "tool":
                contents.append(
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_function_response(
                                name=turn.tool_name or "tool",
                                response=turn.tool_result or {},
                            )
                        ],
                    )
                )
        return contents

    @staticmethod
    def _wrap(exc: Exception) -> ProviderError:
        status = getattr(exc, "code", None) or getattr(exc, "status_code", None)
        message = str(exc)
        lowered = message.lower()
        if "timeout" in lowered or "timed out" in lowered:
            return ProviderError("Gemini request timed out", transient=True, status_code=504)
        if status is None and any(token in lowered for token in ("429", "rate", "unavailable", "503")):
            return ProviderError("Gemini provider error", transient=True)
        return ProviderError(
            "Gemini provider error",
            transient=_is_transient(status if isinstance(status, int) else None),
            status_code=status if isinstance(status, int) else None,
        )


def parse_json_object(raw: str) -> dict[str, Any]:
    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return value if isinstance(value, dict) else {}

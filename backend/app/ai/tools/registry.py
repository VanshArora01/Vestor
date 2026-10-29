from __future__ import annotations

from typing import Any, Callable
from uuid import UUID

from pydantic import BaseModel, ValidationError

from app.ai.jsonutil import json_safe
from app.ai.tools.specs import TOOL_SPECS
from app.core.exceptions import AppError


class UnknownToolError(AppError):
    def __init__(self, name: str) -> None:
        super().__init__(code="UNKNOWN_TOOL", message=f"Unknown tool: {name}", status_code=400)


class ToolArgumentError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(code="INVALID_TOOL_ARGUMENTS", message=message, status_code=400)


class EmptyArgs(BaseModel):
    model_config = {"extra": "forbid"}


class MonthArgs(BaseModel):
    model_config = {"extra": "forbid"}
    year: int | None = None
    month: int | None = None


class TransactionArgs(BaseModel):
    model_config = {"extra": "forbid"}
    year: int | None = None
    month: int | None = None
    classification: str | None = None
    limit: int = 25


class GoalsArgs(BaseModel):
    model_config = {"extra": "forbid"}
    include_archived: bool = False


class ToolRegistry:
    def __init__(self, handlers: dict[str, Callable[..., dict[str, Any]]]) -> None:
        self._handlers = handlers
        known = {spec["name"] for spec in TOOL_SPECS}
        missing = known - set(handlers)
        if missing:
            raise RuntimeError(f"Tool handlers missing for: {sorted(missing)}")

    def schemas(self) -> list[dict[str, Any]]:
        return TOOL_SPECS

    def execute(self, name: str, arguments: dict[str, Any] | None, *, user_id: UUID) -> dict[str, Any]:
        if name not in self._handlers:
            raise UnknownToolError(name)
        raw = arguments or {}
        if not isinstance(raw, dict):
            raise ToolArgumentError("Tool arguments must be an object")
        try:
            parsed = self._parse(name, raw)
        except ValidationError as exc:
            raise ToolArgumentError("Tool arguments failed validation") from exc
        result = self._handlers[name](user_id=user_id, **parsed)
        return json_safe(result)

    @staticmethod
    def _parse(name: str, raw: dict[str, Any]) -> dict[str, Any]:
        if name == "get_financial_overview":
            EmptyArgs.model_validate(raw)
            return {}
        if name in {"get_monthly_summary", "get_spending_breakdown"}:
            return MonthArgs.model_validate(raw).model_dump()
        if name == "get_transactions":
            return TransactionArgs.model_validate(raw).model_dump()
        if name == "get_savings_goals":
            return GoalsArgs.model_validate(raw).model_dump()
        raise UnknownToolError(name)

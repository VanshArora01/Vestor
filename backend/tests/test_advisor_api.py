from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

import pytest

from app.ai.providers.base import ProviderTurn, ToolCallRequest
from app.ai.tools.financial_tools import FinancialTools
from app.models.user import User
from app.services.advisor_service import AdvisorService
from tests.conftest import auth_headers


class MockProvider:
    name = "mock"

    def __init__(self, reply_text: str = "Here is your financial answer.") -> None:
        self.reply_text = reply_text

    def complete(self, *, system_instruction: str, turns: list, tools: list, timeout_seconds: float):
        return ProviderTurn(text=self.reply_text, tool_calls=[], provider_name=self.name)


def test_advisor_conversation_lifecycle(client, user_headers):
    # 1. Create conversation
    create_res = client.post("/api/v1/advisor/conversations", headers=user_headers)
    assert create_res.status_code == 201
    conv_id = create_res.json()["id"]

    # 2. List conversations
    list_res = client.get("/api/v1/advisor/conversations", headers=user_headers)
    assert list_res.status_code == 200
    ids = [c["id"] for c in list_res.json()["items"]]
    assert conv_id in ids

    # 3. Get conversation detail
    detail_res = client.get(f"/api/v1/advisor/conversations/{conv_id}", headers=user_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == conv_id
    assert detail_res.json()["messages"] == []

    # 4. Delete conversation
    del_res = client.delete(f"/api/v1/advisor/conversations/{conv_id}", headers=user_headers)
    assert del_res.status_code == 204

    # 5. Verify deleted
    get_after = client.get(f"/api/v1/advisor/conversations/{conv_id}", headers=user_headers)
    assert get_after.status_code == 404


def test_advisor_user_isolation(client, db, user_headers):
    # User A creates a conversation
    create_res = client.post("/api/v1/advisor/conversations", headers=user_headers)
    conv_id = create_res.json()["id"]

    # User B tries to view or delete User A's conversation
    other_headers = auth_headers(db, f"other-ai-{uuid4().hex[:8]}@example.com")
    get_res = client.get(f"/api/v1/advisor/conversations/{conv_id}", headers=other_headers)
    assert get_res.status_code == 404

    del_res = client.delete(f"/api/v1/advisor/conversations/{conv_id}", headers=other_headers)
    assert del_res.status_code == 404


def test_advisor_send_message_with_page_context(client, db, user_headers, monkeypatch):
    from app.ai.orchestration import AssistantOrchestrator

    mock_provider = MockProvider("Grounded response based on Money context.")
    mock_orchestrator = AssistantOrchestrator(
        primary=mock_provider,
        fallback=None,
        timeout_seconds=5.0,
        enable_fallback=False,
    )

    # Patch _get_orchestrator to return our mock
    monkeypatch.setattr(
        AdvisorService,
        "_get_orchestrator",
        lambda self: mock_orchestrator,
    )

    payload = {
        "content": "Why is my Available to Plan different from my bank balance?",
        "page_context": {
            "page": "money",
            "path": "/money",
            "route_title": "Money Plan",
            "active_month": "2026-10",
            "metadata": {
                "income": 120000,
                "atp": 125000,
            },
        },
    }

    res = client.post("/api/v1/advisor/messages", json=payload, headers=user_headers)
    assert res.status_code == 200
    data = res.json()
    assert "conversation_id" in data
    assert data["user_message"]["content"] == payload["content"]
    assert "Grounded response" in data["assistant_message"]["content"]


def test_financial_tools_education(db):
    user = User(email=f"tools-{uuid4().hex[:8]}@example.com", name="Tools User", password_hash="test")
    db.add(user)
    db.flush()

    tools = FinancialTools(db, user)

    # Test budgeting
    b_res = tools.get_financial_education("50_30_20")
    assert b_res["concept"]["title"] == "The 50/30/20 Budgeting Rule"

    # Test emergency fund
    ef_res = tools.get_financial_education("emergency fund")
    assert ef_res["concept"]["title"] == "Emergency Fund Fundamentals"

    # Test ATP
    atp_res = tools.get_financial_education("available to plan")
    assert "Available to Plan" in atp_res["concept"]["title"]

    # Test inflation
    inf_res = tools.get_financial_education("inflation")
    assert "Inflation" in inf_res["concept"]["title"]


def test_financial_tools_portfolio_summary(db):
    user = User(email=f"invest-{uuid4().hex[:8]}@example.com", name="Invest User", password_hash="test")
    db.add(user)
    db.flush()

    tools = FinancialTools(db, user)
    summary = tools.get_portfolio_summary()
    assert summary["currency"] == "INR"
    assert "total_invested" in summary
    assert "asset_allocation" in summary


def test_financial_tools_account_details_isolation(db):
    user_a = User(email=f"acc-a-{uuid4().hex[:8]}@example.com", name="User A", password_hash="test")
    db.add(user_a)
    db.flush()

    tools_a = FinancialTools(db, user_a)
    # Nonexistent or invalid UUID
    res = tools_a.get_account_details(account_id=str(uuid4()))
    assert res["found"] is False

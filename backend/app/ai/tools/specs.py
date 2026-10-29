from __future__ import annotations

from typing import Any

TOOL_SPECS: list[dict[str, Any]] = [
    {
        "name": "get_financial_overview",
        "description": (
            "Connected-account balances and cash totals for the authenticated user. "
            "Reports missing or unsynced balances instead of inventing them. "
            "Does not include investment portfolio value."
        ),
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "get_monthly_summary",
        "description": (
            "Money Plan summary for a calendar month: confirmed income, planned allocations, "
            "actual spending, available-to-plan, and unconfirmed income candidate counts. "
            "Defaults to the current calendar month."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "year": {"type": "integer", "minimum": 2000, "maximum": 2100},
                "month": {"type": "integer", "minimum": 1, "maximum": 12},
            },
        },
    },
    {
        "name": "get_spending_breakdown",
        "description": (
            "Actual spending by category versus the corresponding monthly plan, including "
            "reconciliation against connected transactions when available."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "year": {"type": "integer", "minimum": 2000, "maximum": 2100},
                "month": {"type": "integer", "minimum": 1, "maximum": 12},
            },
        },
    },
    {
        "name": "get_transactions",
        "description": (
            "Recent bank transactions for the authenticated user. Transfers are labelled "
            "TRANSFER and must not be treated as income or spending. Results are capped."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "year": {"type": "integer", "minimum": 2000, "maximum": 2100},
                "month": {"type": "integer", "minimum": 1, "maximum": 12},
                "classification": {
                    "type": "string",
                    "enum": [
                        "INCOME",
                        "EXPENSE",
                        "TRANSFER",
                        "INVESTMENT",
                        "UNCLASSIFIED",
                    ],
                },
                "limit": {"type": "integer", "minimum": 1, "maximum": 50},
            },
        },
    },
    {
        "name": "get_savings_goals",
        "description": (
            "Savings and other goals with targets and recorded progress. Distinguishes "
            "goal ledger progress from connected-account balances used as emergency/savings fallbacks."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "include_archived": {"type": "boolean"},
            },
        },
    },
    {
        "name": "get_account_details",
        "description": (
            "Details for a specific connected bank account owned by the user, including balance, "
            "sync status, earmarked balances for goals, and recent transactions. "
            "Accepts account_id or purpose."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "account_id": {"type": "string", "description": "The UUID of the connected account."},
                "purpose": {"type": "string", "description": "Account purpose like 'Main / Spending', 'Savings', 'Emergency Fund'."},
            },
        },
    },
    {
        "name": "get_portfolio_summary",
        "description": (
            "Investment portfolio summary including total invested amount, current mark-to-market value, "
            "overall gain/loss, return percentage, and asset allocation breakdown."
        ),
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "get_financial_education",
        "description": (
            "Educational financial concepts and explanations (e.g. budgeting, emergency funds, "
            "50-30-20 rule, compound interest, inflation, index funds, mutual funds vs stocks, "
            "asset allocation). Provides trusted principles without personalized investment advice."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "topic": {"type": "string", "description": "Financial topic or concept to explain."},
            },
            "required": ["topic"],
        },
    },
]

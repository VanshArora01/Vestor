from __future__ import annotations

import calendar
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.jsonutil import json_safe
from app.ai.tools.registry import ToolRegistry
from app.models.banking import BankTransaction, ConnectedAccount, ConnectionStatus, FinancialConnection
from app.models.user import User
from app.repositories.goals_repository import GoalsRepository
from app.repositories.money_repository import MoneyRepository
from app.services.banking_service import BankingService
from app.services.financial_context_service import FinancialContextService
from app.services.goals_service import GoalsService
from app.services.invest_service import InvestService
from app.services.money_calculations import money_to_str
from app.services.money_reconciliation_service import MoneyReconciliationService
from app.services.money_service import MoneyService


MAX_TRANSACTIONS = 50
DEFAULT_TRANSACTIONS = 25
NARRATION_MAX = 80


class FinancialTools:
    def __init__(self, db: Session, user: User) -> None:
        self.db = db
        self.user = user
        self.money = MoneyService(db)
        self.money_repo = MoneyRepository(db)
        self.goals = GoalsService(db)
        self.context = FinancialContextService(db)
        self.reconciliation = MoneyReconciliationService(db)
        self.banking = BankingService(db)
        self.invest = InvestService(db)

    def registry(self) -> ToolRegistry:
        return ToolRegistry(
            {
                "get_financial_overview": lambda user_id, **_: self.get_financial_overview(),
                "get_monthly_summary": lambda user_id, **kwargs: self.get_monthly_summary(**kwargs),
                "get_spending_breakdown": lambda user_id, **kwargs: self.get_spending_breakdown(**kwargs),
                "get_transactions": lambda user_id, **kwargs: self.get_transactions(**kwargs),
                "get_savings_goals": lambda user_id, **kwargs: self.get_savings_goals(**kwargs),
                "get_account_details": lambda user_id, **kwargs: self.get_account_details(**kwargs),
                "get_portfolio_summary": lambda user_id, **_: self.get_portfolio_summary(),
                "get_financial_education": lambda user_id, **kwargs: self.get_financial_education(**kwargs),
            }
        )

    def get_financial_overview(self) -> dict[str, Any]:
        agg = self.context.get_balances_aggregation(self.user.id)
        stmt = (
            select(ConnectedAccount, FinancialConnection)
            .join(FinancialConnection, ConnectedAccount.connection_id == FinancialConnection.id)
            .where(ConnectedAccount.user_id == self.user.id)
        )
        rows = self.db.execute(stmt).all()
        accounts = []
        missing_balance_count = 0
        stale_or_failed = 0
        for account, connection in rows:
            if account.balance is None:
                missing_balance_count += 1
            if account.balance_status in {"NOT_SYNCED", "FAILED"}:
                stale_or_failed += 1
            last_synced = account.last_synced_at or connection.last_synced_at
            accounts.append(
                {
                    "institution_name": account.institution_name,
                    "account_type": account.account_type,
                    "masked_account_number": account.masked_account_number,
                    "purpose": account.purpose,
                    "account_status": account.status,
                    "connection_status": connection.status,
                    "consent_is_not_account_status": True,
                    "balance": money_to_str(account.balance) if account.balance is not None else None,
                    "balance_status": account.balance_status,
                    "last_synced_at": last_synced.isoformat() if last_synced else None,
                    "source": "connected_account",
                }
            )

        incomplete = (
            not accounts
            or agg["actual_connected_cash"] is None
            or missing_balance_count > 0
        )
        notes = []
        if not accounts:
            notes.append("No connected bank accounts. Cash totals from banks are unavailable.")
        if missing_balance_count:
            notes.append(
                f"{missing_balance_count} connected account(s) have no synced balance; "
                "do not invent a complete cash total."
            )
        if stale_or_failed:
            notes.append(
                f"{stale_or_failed} account(s) are not synced or last sync failed; figures may be stale."
            )
        notes.append(
            "Investment holdings are not included. Goal earmarks are not bank transfers."
        )

        return {
            "currency": "INR",
            "accounts": accounts,
            "totals": {
                "actual_connected_cash": money_to_str(agg["actual_connected_cash"])
                if agg["actual_connected_cash"] is not None
                else None,
                "main_spending_balance": money_to_str(agg["main_spending_balance"])
                if agg["main_spending_balance"] is not None
                else None,
                "savings_balance": money_to_str(agg["savings_balance"])
                if agg["savings_balance"] is not None
                else None,
                "emergency_fund_balance": money_to_str(agg["emergency_fund_balance"])
                if agg["emergency_fund_balance"] is not None
                else None,
            },
            "fallbacks": {
                "resolved_savings_balance": money_to_str(agg["resolved_savings_balance"])
                if agg["resolved_savings_balance"] is not None
                else None,
                "resolved_emergency_fund_balance": money_to_str(agg["resolved_emergency_fund_balance"])
                if agg["resolved_emergency_fund_balance"] is not None
                else None,
                "savings_uses_goal_ledger": not agg["savings_has_accounts"],
                "emergency_fund_uses_goal_ledger": not agg["emergency_fund_has_accounts"],
            },
            "coverage": {
                "connected_account_count": len(accounts),
                "missing_balance_count": missing_balance_count,
                "incomplete": incomplete,
                "notes": notes,
            },
        }

    def get_monthly_summary(self, year: int | None = None, month: int | None = None) -> dict[str, Any]:
        year, month = self._resolve_month(year, month)
        record = self.money_repo.get_month(self.user.id, year, month)
        if record is None:
            return {
                "year": year,
                "month": month,
                "available": False,
                "notes": ["No Money Plan record exists for this month. Do not invent totals."],
            }
        payload = self.money._build_month_response(record, self.user.id)
        candidates = payload.get("income_candidates") or []
        return {
            "year": year,
            "month": month,
            "available": True,
            "currency": payload.get("currency", "INR"),
            "is_connected": payload.get("is_connected"),
            "is_locked": payload.get("is_locked"),
            "is_history_incomplete": payload.get("is_history_incomplete"),
            "income": {
                "resolved_income": payload.get("income"),
                "confirmed_income": payload.get("metrics", {}).get("confirmed_income"),
                "manual_income_adjustment": payload.get("metrics", {}).get("manual_income_adjustment"),
                "unconfirmed_income_candidate_count": len(candidates),
                "unconfirmed_income_is_not_confirmed": True,
            },
            "plan": {
                "available_to_plan": payload.get("metrics", {}).get("available_to_plan"),
                "allocated_total": payload.get("metrics", {}).get("allocated_total"),
                "unallocated": payload.get("metrics", {}).get("unallocated"),
                "allocations": [
                    {
                        "name": line.get("goal_name") or line.get("category_name"),
                        "line_type": line.get("line_type"),
                        "amount": line.get("amount"),
                        "semantic_type": line.get("semantic_type"),
                    }
                    for line in payload.get("allocations") or []
                ],
            },
            "actual": {
                "spending_total": payload.get("metrics", {}).get("spending_total"),
                "spending": [
                    {"category": row.get("category_name"), "amount": row.get("amount")}
                    for row in payload.get("spending") or []
                ],
            },
            "definitions": {
                "available_to_plan": "carryover + income; spending does not reduce this",
                "allocations_are_plan_not_actual": True,
                "transfers_are_neither_income_nor_spending": True,
            },
            "notes": self._month_notes(payload, candidates),
        }

    def get_spending_breakdown(self, year: int | None = None, month: int | None = None) -> dict[str, Any]:
        year, month = self._resolve_month(year, month)
        record = self.money_repo.get_month(self.user.id, year, month)
        if record is None:
            return {
                "year": year,
                "month": month,
                "available": False,
                "notes": ["No Money Plan spending data for this month."],
            }
        payload = self.money._build_month_response(record, self.user.id)
        recon = json_safe(self.reconciliation.reconcile_month(self.user.id, year, month))
        spending_items = [
            item for item in recon.get("items") or [] if item.get("line_type") == "spending"
        ]
        over_plan = [
            item
            for item in spending_items
            if item.get("status") == "OVER_PLAN"
            or (
                item.get("actual") is not None
                and item.get("planned") is not None
                and Decimal(str(item["actual"])) > Decimal(str(item["planned"]))
            )
        ]
        return {
            "year": year,
            "month": month,
            "available": True,
            "planned_spending_total": recon.get("planned_spending_total"),
            "actual_spending_total": recon.get("actual_spending_total"),
            "money_plan_spending": payload.get("spending") or [],
            "reconciliation_items": spending_items,
            "over_plan": over_plan,
            "notes": [
                "Internal transfers are excluded from spending in classification.",
                "Unclassified expenses are listed separately and are not treated as a planned category.",
            ],
        }

    def get_transactions(
        self,
        year: int | None = None,
        month: int | None = None,
        classification: str | None = None,
        limit: int = DEFAULT_TRANSACTIONS,
    ) -> dict[str, Any]:
        year, month = self._resolve_month(year, month)
        cap = min(max(limit, 1), MAX_TRANSACTIONS)
        _, num_days = calendar.monthrange(year, month)
        start_dt = datetime(year, month, 1, tzinfo=timezone.utc)
        end_dt = datetime(year, month, num_days, 23, 59, 59, tzinfo=timezone.utc)

        stmt = (
            select(BankTransaction)
            .where(
                BankTransaction.user_id == self.user.id,
                BankTransaction.transaction_timestamp >= start_dt,
                BankTransaction.transaction_timestamp <= end_dt,
            )
            .order_by(BankTransaction.transaction_timestamp.desc())
            .limit(cap)
        )
        if classification == "UNCLASSIFIED":
            stmt = stmt.where(BankTransaction.classification_status == "UNCLASSIFIED")
        elif classification:
            stmt = stmt.where(BankTransaction.classification == classification)

        rows = list(self.db.scalars(stmt).all())
        items = []
        for tx in rows:
            narration = (tx.narration or "")[:NARRATION_MAX]
            items.append(
                {
                    "posted_on": tx.transaction_timestamp.date().isoformat(),
                    "amount": money_to_str(tx.amount),
                    "direction": tx.transaction_type,
                    "classification": tx.classification or "UNCLASSIFIED",
                    "classification_status": tx.classification_status,
                    "is_internal_transfer": tx.classification == "TRANSFER",
                    "is_confirmed_income": (
                        tx.classification == "INCOME"
                        and tx.classification_status in {"USER_CONFIRMED", "USER_CORRECTED"}
                    ),
                    "narration_preview": narration or None,
                    "masked_account": tx.connected_account.masked_account_number
                    if tx.connected_account
                    else None,
                }
            )
        return {
            "year": year,
            "month": month,
            "limit": cap,
            "count": len(items),
            "transactions": items,
            "notes": [
                "Do not treat TRANSFER as income or spending.",
                "SYSTEM_CLASSIFIED INCOME is unconfirmed until USER_CONFIRMED or USER_CORRECTED.",
                "Full account numbers and reference IDs are omitted.",
            ],
        }

    def get_savings_goals(self, include_archived: bool = False) -> dict[str, Any]:
        listing = self.goals.list_goals(self.user, include_archived=include_archived)
        agg = self.context.get_balances_aggregation(self.user.id)
        goals = []
        for goal in listing.get("goals") or []:
            goal_type = goal.get("goal_type")
            progress_source = "goal_ledger"
            if goal_type == "emergency_fund" and agg["emergency_fund_has_accounts"]:
                progress_source = "connected_emergency_accounts"
            elif goal_type == "savings" and agg["savings_has_accounts"]:
                progress_source = "connected_savings_accounts"
            goals.append(
                {
                    "name": goal.get("name"),
                    "goal_type": goal_type,
                    "status": goal.get("status"),
                    "target_amount": goal.get("target_amount"),
                    "recorded_progress": goal.get("current_amount"),
                    "planned_monthly_contribution": goal.get("planned_monthly_contribution"),
                    "deadline": goal.get("deadline"),
                    "progress_source": progress_source,
                    "money_plan_allocation_is_virtual": True,
                    "linked_account": bool(goal.get("linked_account_id")),
                }
            )
        return {
            "summary": listing.get("summary"),
            "goals": goals,
            "notes": [
                "recorded_progress is the Goals ledger (plus plan allocations where GoalsService applies that rule).",
                "A Money Plan allocation toward a goal is planning intent, not a bank transfer.",
                "If emergency/savings connected accounts exist, dashboard cash for those buckets uses account balances, not the goal ledger.",
            ],
        }

    @staticmethod
    def _resolve_month(year: int | None, month: int | None) -> tuple[int, int]:
        today = date.today()
        return year or today.year, month or today.month

    @staticmethod
    def _month_notes(payload: dict[str, Any], candidates: list[Any]) -> list[str]:
        notes = [
            "Confirmed income excludes unconfirmed salary candidates.",
            "Available-to-plan is carryover plus income; spending does not reduce it.",
        ]
        if payload.get("is_history_incomplete"):
            notes.append("History may be incomplete because the account was connected mid-month.")
        if candidates:
            notes.append(
                f"{len(candidates)} unconfirmed income candidate(s) exist and must not be reported as confirmed income."
            )
        if not payload.get("is_connected") and not payload.get("income"):
            notes.append("No monthly income has been set.")
        return notes

    def get_account_details(
        self, account_id: str | None = None, purpose: str | None = None
    ) -> dict[str, Any]:
        target_id: UUID | None = None
        if account_id:
            try:
                target_id = UUID(str(account_id).strip())
            except (ValueError, TypeError):
                return {"found": False, "error": f"Invalid account_id format: '{account_id}'"}
        elif purpose:
            stmt = select(ConnectedAccount).where(
                ConnectedAccount.user_id == self.user.id,
                ConnectedAccount.purpose.ilike(f"%{purpose.strip()}%"),
            ).limit(1)
            account_row = self.db.scalar(stmt)
            if account_row:
                target_id = account_row.id

        if not target_id:
            return {
                "found": False,
                "error": "Account not found or not owned by user. Provide a valid account_id or purpose.",
            }

        detail = self.banking.get_account_detail(self.user.id, target_id)
        if not detail:
            return {"found": False, "error": "Account not found or not owned by the user."}

        # Sanitize transactions (never expose internal system IDs or full payloads)
        recent_txs = []
        for tx in (detail.get("transactions") or [])[:10]:
            recent_txs.append(
                {
                    "date": tx.get("transaction_timestamp").isoformat()
                    if hasattr(tx.get("transaction_timestamp"), "isoformat")
                    else str(tx.get("transaction_timestamp")),
                    "amount": money_to_str(tx.get("amount")),
                    "type": tx.get("transaction_type"),
                    "classification": tx.get("classification"),
                    "classification_status": tx.get("classification_status"),
                    "category": tx.get("category"),
                    "merchant": tx.get("merchant_name") or (tx.get("narration") or "")[:50],
                }
            )

        return {
            "found": True,
            "institution_name": detail.get("institution_name"),
            "account_type": detail.get("account_type"),
            "masked_account_number": detail.get("masked_account_number"),
            "purpose": detail.get("purpose"),
            "status": detail.get("status"),
            "balance": money_to_str(detail.get("balance")),
            "balance_status": detail.get("balance_status"),
            "last_synced_at": detail.get("last_synced_at").isoformat()
            if detail.get("last_synced_at")
            else None,
            "earmarked_for_goals": money_to_str(detail.get("earmarked_for_goals")),
            "unallocated_balance": money_to_str(detail.get("unallocated_balance")),
            "over_allocated_amount": money_to_str(detail.get("over_allocated_amount")),
            "recent_transactions": recent_txs,
            "notes": [
                "Earmarks are planning reservations, not separate bank accounts.",
                "Balance is the latest synced balance from the bank.",
            ],
        }

    def get_portfolio_summary(self) -> dict[str, Any]:
        summary = self.invest.get_summary(self.user)
        holdings = self.invest.list_holdings(self.user)
        holdings_items = holdings.get("items") or []

        # Asset class breakdown
        breakdown: dict[str, dict[str, Any]] = {}
        for h in holdings_items:
            atype = h.get("asset_type") or "other"
            if atype not in breakdown:
                breakdown[atype] = {"invested": Decimal("0"), "count": 0}
            breakdown[atype]["invested"] += Decimal(str(h.get("total_invested") or "0"))
            breakdown[atype]["count"] += 1

        asset_allocation = [
            {
                "asset_type": k,
                "count": v["count"],
                "total_invested": money_to_str(v["invested"]),
            }
            for k, v in breakdown.items()
        ]

        return {
            "currency": "INR",
            "total_invested": summary.get("total_invested"),
            "current_value": summary.get("current_value"),
            "absolute_gain_loss": summary.get("absolute_gain_loss"),
            "return_pct": summary.get("return_pct"),
            "total_holdings": summary.get("total_holdings"),
            "valuation_complete": summary.get("valuation_complete"),
            "fresh_holdings": summary.get("fresh_holdings"),
            "stale_holdings": summary.get("stale_holdings"),
            "unvalued_holdings": summary.get("unvalued_holdings"),
            "asset_allocation": asset_allocation,
            "notes": [
                "Valuation mark-to-market is only complete when all holdings have valid valuations.",
                "Prices are cached from market providers, not real-time tick feeds.",
                "Vestor AI is informational only and does not execute investment transactions.",
            ],
        }

    def get_financial_education(self, topic: str) -> dict[str, Any]:
        t = (topic or "").lower().strip()
        concepts: dict[str, dict[str, Any]] = {
            "50_30_20": {
                "title": "The 50/30/20 Budgeting Rule",
                "summary": "A foundational framework allocating net monthly income into three purposeful buckets.",
                "breakdown": {
                    "50% Needs": "Essential living costs: housing (rent/EMI), groceries, utilities, baseline transportation, minimum loan payments.",
                    "30% Wants": "Discretionary lifestyle spending: dining out, entertainment, subscriptions, hobbies, non-essential shopping.",
                    "20% Financial Goals": "Wealth generation and resilience: building emergency reserve, investing for long-term targets, additional debt payoff.",
                },
                "vestor_context": "In Vestor, your Money Plan helps categorize your income into allocations and track actual spending against these categories.",
            },
            "emergency_fund": {
                "title": "Emergency Fund Fundamentals",
                "summary": "A dedicated liquid reserve protecting you from life disruptions without compromising long-term investments.",
                "guidelines": [
                    "Target 3 to 6 months of essential living expenses (or 6 to 12 months for freelancers/single-income households).",
                    "Keep in highly liquid and safe instruments: high-yield savings accounts or overnight/liquid debt mutual funds.",
                    "Never invest an emergency fund in equities, volatile crypto, or lock it into long-tenure fixed deposits with harsh break fees.",
                ],
                "vestor_context": "Vestor tracks your Emergency Fund goal and directly reconciles it with connected bank accounts designated with the Emergency Fund purpose.",
            },
            "available_to_plan": {
                "title": "Available to Plan (ATP) in Vestor",
                "summary": "The exact cash capacity you have budgeted to distribute across goals and spending categories for the month.",
                "canonical_formula": "Available to Plan = Carryover from Previous Month + Confirmed Monthly Income.",
                "key_distinction": "Spending does NOT reduce Available to Plan. Allocations plan your income, and actual spending records cash outflow against those plans.",
            },
            "inflation": {
                "title": "Inflation & Real Purchasing Power in India",
                "summary": "The persistent rise in prices over time, steadily decreasing what a unit of currency can purchase.",
                "key_points": [
                    "Historical Indian CPI retail inflation typically hovers between 5% and 7% annually.",
                    "If savings grow at 3.0% in a regular bank account while inflation is 6%, real purchasing power diminishes by ~3% per year.",
                    "Beating inflation over 5+ year horizons usually requires allocating a portion of long-term assets to productive equities/index funds.",
                ],
            },
            "compound_interest": {
                "title": "Compound Growth & Time in the Market",
                "summary": "The mathematical effect where earnings themselves generate subsequent earnings over time.",
                "formula": "A = P * (1 + r/n)^(n*t)",
                "principles": [
                    "Early consistency is far more powerful than timing: starting 5 years earlier often delivers multiples more capital at retirement.",
                    "Rule of 72: divide 72 by your expected annual return rate to approximate how many years it takes to double your capital.",
                ],
            },
            "index_funds": {
                "title": "Index Funds & Passive Investing",
                "summary": "Mutual funds or ETFs that mirror the composition of a market index (such as the Nifty 50 or Sensex 30).",
                "advantages": [
                    "Ultra-low expense ratio (often 0.05% - 0.20% compared to 1.5% - 2.0% for active funds).",
                    "Eliminates fund manager bias and style drift.",
                    "Consistently outpaces the vast majority of active mutual funds over 10-15 year horizons.",
                ],
            },
            "asset_allocation": {
                "title": "Asset Allocation & Risk Diversification",
                "summary": "The strategic division of wealth across distinct asset classes (Equity, Debt, Gold, Cash).",
                "strategy": [
                    "Equities provide inflation-beating long-term growth with volatility.",
                    "Debt / Fixed Income provides stability, capital preservation, and predictable cash flow.",
                    "Gold acts as a currency hedge and safe haven during geopolitical stress.",
                    "Rebalancing annually locks in gains and maintains your chosen risk tolerance.",
                ],
            },
        }

        # Match best concept
        selected = None
        for key, concept in concepts.items():
            if key in t or any(word in t for word in key.split("_")):
                selected = concept
                break
        if not selected:
            # Check keywords
            if "budget" in t or "50" in t:
                selected = concepts["50_30_20"]
            elif "emergency" in t:
                selected = concepts["emergency_fund"]
            elif "plan" in t or "atp" in t or "available" in t:
                selected = concepts["available_to_plan"]
            elif "inflation" in t or "purchasing" in t:
                selected = concepts["inflation"]
            elif "compound" in t or "interest" in t:
                selected = concepts["compound_interest"]
            elif "index" in t or "mutual" in t or "stock" in t or "etf" in t:
                selected = concepts["index_funds"]
            elif "allocation" in t or "diversif" in t:
                selected = concepts["asset_allocation"]
            else:
                selected = {
                    "title": "Financial Principles",
                    "overview": f"Guidance regarding {topic.strip()}",
                    "principles": [
                        "Prioritize high-interest debt elimination.",
                        "Maintain an emergency reserve before aggressive equity investing.",
                        "Align investment horizons: short-term (<3 yrs) in capital-safe debt/cash, long-term (>5 yrs) in diversified equities.",
                    ],
                }

        return {
            "topic": topic,
            "concept": selected,
            "disclaimer": "Educational financial literacy content only. Not individual SEBI registered investment advice.",
        }

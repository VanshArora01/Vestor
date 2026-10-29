from decimal import Decimal
from typing import Dict, Any, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.banking import ConnectedAccount, FinancialConnection, ConnectionStatus
from app.models.goal import Goal


def normalize_purpose(p: Optional[str]) -> str:
    if not p:
        return "other"
    p_clean = p.strip().lower()
    if p_clean in ("main / spending", "main_spending", "main/spending", "spending"):
        return "main_spending"
    elif p_clean in ("savings", "saving"):
        return "savings"
    elif p_clean in ("emergency fund", "emergency_fund", "emergency"):
        return "emergency_fund"
    else:
        return "other"


class FinancialContextService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_balances_aggregation(self, user_id: UUID) -> Dict[str, Any]:
        """
        Calculates read-only financial aggregates for the user across connected bank accounts.
        Implements fallback logic for emergency fund and savings goals.
        """
        # Fetch active accounts under active connections
        stmt = (
            select(ConnectedAccount)
            .join(FinancialConnection, ConnectedAccount.connection_id == FinancialConnection.id)
            .where(
                ConnectedAccount.user_id == user_id,
                ConnectedAccount.status == "ACTIVE",
                ConnectedAccount.institution_name != "Vestor Simulated Bank",
                FinancialConnection.provider != "VESTOR_DEMO",
                FinancialConnection.status == ConnectionStatus.ACTIVE.value
            )
        )
        accounts = self.db.scalars(stmt).all()

        # Count active accounts per purpose and gather their non-null balances
        counts = {
            "main_spending": 0,
            "savings": 0,
            "emergency_fund": 0,
            "other": 0
        }
        balances = {
            "main_spending": [],
            "savings": [],
            "emergency_fund": [],
            "other": []
        }

        for acc in accounts:
            norm = normalize_purpose(acc.purpose)
            counts[norm] += 1
            if acc.balance is not None:
                balances[norm].append(acc.balance)

        # Helper to compute aggregated sum for a bucket
        def get_bucket_sum(bucket_name: str) -> Optional[Decimal]:
            if counts[bucket_name] == 0:
                return None
            bucket_vals = balances[bucket_name]
            if not bucket_vals:
                # All active accounts in this bucket have balance = NULL
                return None
            return sum(bucket_vals)

        # Compute raw bucket balances
        main_spending_balance = get_bucket_sum("main_spending")
        savings_balance = get_bucket_sum("savings")
        emergency_fund_balance = get_bucket_sum("emergency_fund")
        other_balance = get_bucket_sum("other")

        # Compute actual_connected_cash
        if not accounts:
            actual_connected_cash = None
        else:
            non_null_all = [acc.balance for acc in accounts if acc.balance is not None]
            if not non_null_all:
                actual_connected_cash = None
            else:
                actual_connected_cash = sum(non_null_all)

        # Fetch active goals for fallback calculations
        goals_stmt = (
            select(Goal)
            .where(
                Goal.user_id == user_id,
                Goal.status == "active"
            )
        )
        goals = self.db.scalars(goals_stmt).all()

        emergency_goals = [g for g in goals if g.goal_type == "emergency_fund"]
        savings_goals = [g for g in goals if g.goal_type == "savings"]

        emergency_goal_amount = sum(g.current_amount for g in emergency_goals) if emergency_goals else Decimal("0")
        savings_goal_amount = sum(g.current_amount for g in savings_goals) if savings_goals else Decimal("0")

        # Resolve balances using fallback logic
        # 1. Main / Spending
        resolved_main_spending_balance = main_spending_balance

        # 2. Savings
        if counts["savings"] > 0:
            resolved_savings_balance = savings_balance
        else:
            resolved_savings_balance = savings_goal_amount

        # 3. Emergency Fund
        if counts["emergency_fund"] > 0:
            resolved_emergency_fund_balance = emergency_fund_balance
        else:
            resolved_emergency_fund_balance = emergency_goal_amount

        return {
            "actual_connected_cash": actual_connected_cash,
            "main_spending_balance": main_spending_balance,
            "savings_balance": savings_balance,
            "emergency_fund_balance": emergency_fund_balance,
            "main_spending_has_accounts": counts["main_spending"] > 0,
            "savings_has_accounts": counts["savings"] > 0,
            "emergency_fund_has_accounts": counts["emergency_fund"] > 0,
            "resolved_main_spending_balance": resolved_main_spending_balance,
            "resolved_savings_balance": resolved_savings_balance,
            "resolved_emergency_fund_balance": resolved_emergency_fund_balance,
        }

from decimal import Decimal
from typing import Dict, Any, List, Optional, Tuple
from uuid import UUID
from datetime import datetime, timezone, date
import calendar
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.banking import ConnectedAccount, BankTransaction
from app.models.money import MonthlyFinance, MonthlyAllocation, MonthlySpending, AllocationCategory, SpendingCategory
from app.models.goal import Goal, GoalContribution
from app.services.financial_context_service import normalize_purpose


class MoneyReconciliationService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def reconcile_month(self, user_id: UUID, year: int, month: int) -> Dict[str, Any]:
        """
        Reconciles planned allocations and spendings against verified bank transaction evidence.
        Returns separate aggregates for each dimension and items with provenance markers.
        """
        # 1. Fetch active connected accounts to determine data availability
        accounts = self.db.query(ConnectedAccount).filter(
            ConnectedAccount.user_id == user_id,
            ConnectedAccount.status == "ACTIVE"
        ).all()
        has_connections = len(accounts) > 0

        # Determine start and end date for transactions
        _, num_days = calendar.monthrange(year, month)
        start_dt = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)
        end_dt = datetime(year, month, num_days, 23, 59, 59, 999999, tzinfo=timezone.utc)

        # 2. Fetch monthly transactions
        transactions = []
        if has_connections:
            transactions = self.db.query(BankTransaction).filter(
                BankTransaction.user_id == user_id,
                BankTransaction.transaction_timestamp >= start_dt,
                BankTransaction.transaction_timestamp <= end_dt
            ).all()

        # 3. Fetch goals and their contributions for this month
        goals = self.db.query(Goal).filter(
            Goal.user_id == user_id,
            Goal.status == "active"
        ).all()
        goal_map = {goal.id: goal for goal in goals}

        contributions = []
        if goals:
            contributions = self.db.query(GoalContribution).filter(
                GoalContribution.goal_id.in_([g.id for g in goals]),
                func.extract('year', GoalContribution.contributed_on) == year,
                func.extract('month', GoalContribution.contributed_on) == month
            ).all()

        goal_contributions_by_goal: Dict[UUID, List[GoalContribution]] = {}
        for c in contributions:
            goal_contributions_by_goal.setdefault(c.goal_id, []).append(c)

        # 4. Fetch the plan for the user, year, month
        finance = self.db.query(MonthlyFinance).filter(
            MonthlyFinance.user_id == user_id,
            MonthlyFinance.year == year,
            MonthlyFinance.month == month
        ).first()

        planned_allocations = finance.allocations if finance else []
        planned_spendings = finance.spendings if finance else []

        reconciled_items = []

        # Totals tracked separately
        planned_allocation_total = Decimal("0.00")
        actual_allocation_total = Decimal("0.00")
        planned_spending_total = Decimal("0.00")
        actual_spending_total = Decimal("0.00")

        # Provenance helpers
        prov_connected = "CONNECTED_ACCOUNT"
        prov_manual = "MANUAL"
        prov_derived = "DERIVED"
        prov_unavailable = "UNAVAILABLE"

        # Helpers for classification/categorization matching
        def calculate_status(actual: Optional[Decimal], planned: Decimal, is_spending: bool = False) -> str:
            if actual is None:
                return "UNAVAILABLE"
            if actual == 0:
                return "NOT_STARTED"
            if actual < planned:
                return "IN_PROGRESS"
            if actual > planned:
                return "OVER_PLAN" if is_spending else "COMPLETE"
            return "COMPLETE"

        # --- Reconcile Allocations ---
        for alloc in planned_allocations:
            planned_amt = alloc.amount
            actual_amt: Optional[Decimal] = Decimal("0.00")
            provenance = prov_connected
            slug = ""
            line_type = "category"
            name = ""

            if alloc.goal_id is not None:
                line_type = "goal"
                goal = goal_map.get(alloc.goal_id) or alloc.goal
                name = goal.name if goal else "Goal"
                slug = f"goal-{alloc.goal_id}"

                goal_conts = goal_contributions_by_goal.get(alloc.goal_id, [])
                is_goal_connected = goal is not None and goal.linked_account_id is not None

                if is_goal_connected:
                    if has_connections:
                        # Verified actuals only (where bank_transaction_id is present)
                        verified = [c.amount for c in goal_conts if c.bank_transaction_id is not None]
                        actual_amt = sum(verified) if verified else Decimal("0.00")
                        provenance = prov_connected
                    else:
                        actual_amt = None
                        provenance = prov_unavailable
                else:
                    # Manual contribution counts as actual
                    manuals = [c.amount for c in goal_conts if c.bank_transaction_id is None]
                    actual_amt = sum(manuals) if manuals else Decimal("0.00")
                    provenance = prov_manual

                planned_allocation_total += planned_amt
                if actual_amt is not None:
                    actual_allocation_total += actual_amt

            elif alloc.category_id is not None and alloc.category is not None:
                category = alloc.category
                name = category.name
                slug = category.slug
                sem_type = category.semantic_type

                if sem_type == "savings":
                    if has_connections:
                        txs = [
                            t.amount for t in transactions
                            if t.transaction_type == "CREDIT"
                            and t.classification == "TRANSFER"
                            and normalize_purpose(t.account_purpose or t.connected_account.purpose) == "savings"
                        ]
                        actual_amt = sum(txs) if txs else Decimal("0.00")
                        provenance = prov_connected
                    else:
                        actual_amt = None
                        provenance = prov_unavailable

                    planned_allocation_total += planned_amt
                    if actual_amt is not None:
                        actual_allocation_total += actual_amt

                elif sem_type == "emergency_fund":
                    if has_connections:
                        txs = [
                            t.amount for t in transactions
                            if t.transaction_type == "CREDIT"
                            and t.classification == "TRANSFER"
                            and normalize_purpose(t.account_purpose or t.connected_account.purpose) == "emergency_fund"
                        ]
                        actual_amt = sum(txs) if txs else Decimal("0.00")
                        provenance = prov_connected
                    else:
                        actual_amt = None
                        provenance = prov_unavailable

                    planned_allocation_total += planned_amt
                    if actual_amt is not None:
                        actual_allocation_total += actual_amt

                elif sem_type == "investment":
                    # Invested transactions matching this category slug or name
                    if has_connections:
                        matched_txs = []
                        for t in transactions:
                            if t.transaction_type == "DEBIT" and t.classification == "INVESTMENT":
                                t_cat = (t.category or "").strip().lower()
                                t_narr = (t.narration or "").strip().lower()
                                t_merch = (t.merchant_name or "").strip().lower()

                                category_match = (
                                    t_cat == slug.lower()
                                    or t_cat == name.lower()
                                    or slug.lower() in t_narr
                                    or name.lower() in t_narr
                                    or slug.lower() in t_merch
                                    or name.lower() in t_merch
                                )
                                if category_match:
                                    matched_txs.append(t)
                        
                        actual_amt = sum([t.amount for t in matched_txs]) if matched_txs else Decimal("0.00")
                        provenance = prov_connected
                    else:
                        actual_amt = None
                        provenance = prov_unavailable

                    planned_allocation_total += planned_amt
                    if actual_amt is not None:
                        actual_allocation_total += actual_amt

                else:
                    # Others / custom money plan items
                    actual_amt = Decimal("0.00")
                    provenance = prov_manual
                    planned_allocation_total += planned_amt
                    actual_allocation_total += actual_amt

            status = calculate_status(actual_amt, planned_amt)
            reconciled_items.append({
                "name": name,
                "planned": planned_amt,
                "actual": actual_amt,
                "remaining": (planned_amt - actual_amt) if actual_amt is not None else None,
                "status": status,
                "provenance": provenance,
                "category_slug": slug,
                "line_type": line_type
            })

        # --- Reconcile Spending ---
        for spend in planned_spendings:
            category = spend.category
            name = category.name
            slug = category.slug
            planned_amt = spend.amount
            actual_amt: Optional[Decimal] = Decimal("0.00")
            provenance = prov_connected

            if has_connections:
                # Sum expenses that map to this category slug/name
                matched_txs = [
                    t.amount for t in transactions
                    if t.transaction_type == "DEBIT"
                    and t.classification == "EXPENSE"
                    and t.category
                    and (t.category.lower() == name.lower() or t.category.lower() == slug.lower())
                ]
                actual_amt = sum(matched_txs) if matched_txs else Decimal("0.00")
                provenance = prov_connected
            else:
                actual_amt = None
                provenance = prov_unavailable

            status = calculate_status(actual_amt, planned_amt, is_spending=True)
            reconciled_items.append({
                "name": name,
                "planned": planned_amt,
                "actual": actual_amt,
                "remaining": (planned_amt - actual_amt) if actual_amt is not None else None,
                "status": status,
                "provenance": provenance,
                "category_slug": slug,
                "line_type": "spending"
            })

            planned_spending_total += planned_amt
            if actual_amt is not None:
                actual_spending_total += actual_amt

        # --- Unclassified / Unresolved Items ---
        actual_income = Decimal("0.00")
        actual_investment = Decimal("0.00")
        unresolved_investment = Decimal("0.00")
        unclassified_expense = Decimal("0.00")

        if has_connections:
            # 1. Total Income
            actual_income = sum([
                t.amount for t in transactions
                if t.transaction_type == "CREDIT"
                and t.classification == "INCOME"
                and t.classification_status in ("USER_CONFIRMED", "USER_CORRECTED")
            ])

            # 2. Total Investment
            total_investments_list = [
                t for t in transactions
                if t.transaction_type == "DEBIT"
                and t.classification == "INVESTMENT"
            ]
            actual_investment = sum([t.amount for t in total_investments_list])

            # Deduct mapped investments to find unresolved ones
            mapped_investment_amt = Decimal("0.00")
            for item in reconciled_items:
                if item["line_type"] == "category" and item["category_slug"] in [a.category.slug for a in planned_allocations if a.category and a.category.semantic_type == "investment"]:
                    mapped_investment_amt += item["actual"] or Decimal("0.00")
            
            unresolved_investment = max(Decimal("0.00"), actual_investment - mapped_investment_amt)

            # 3. Unclassified Expenses (Rule 3)
            # Find expenses that do not match any planned spending categories
            planned_spending_names = {s.category.name.lower() for s in planned_spendings}
            planned_spending_slugs = {s.category.slug.lower() for s in planned_spendings}

            unclassified_txs = [
                t.amount for t in transactions
                if t.transaction_type == "DEBIT"
                and t.classification == "EXPENSE"
                and (
                    not t.category 
                    or (t.category.lower() not in planned_spending_names and t.category.lower() not in planned_spending_slugs)
                )
            ]
            unclassified_expense = sum(unclassified_txs) if unclassified_txs else Decimal("0.00")

        # If unresolved investments exist, add an unresolved item
        if unresolved_investment > 0:
            reconciled_items.append({
                "name": "Unresolved Investments",
                "planned": Decimal("0.00"),
                "actual": unresolved_investment,
                "remaining": -unresolved_investment,
                "status": "IN_PROGRESS",
                "provenance": prov_connected,
                "category_slug": "unresolved-investment",
                "line_type": "category"
            })

        # If unclassified spending exists, add an unclassified item
        if unclassified_expense > 0:
            reconciled_items.append({
                "name": "Unclassified Spending",
                "planned": Decimal("0.00"),
                "actual": unclassified_expense,
                "remaining": -unclassified_expense,
                "status": "OVER_PLAN",
                "provenance": prov_connected,
                "category_slug": "unclassified-spending",
                "line_type": "spending"
            })

        return {
            "month": f"{year:04d}-{month:02d}",
            "planned_allocation_total": planned_allocation_total,
            "actual_allocation_total": actual_allocation_total,
            "planned_spending_total": planned_spending_total,
            "actual_spending_total": actual_spending_total,
            "actual_income_total": actual_income,
            "actual_investment_total": actual_investment,
            "items": reconciled_items
        }

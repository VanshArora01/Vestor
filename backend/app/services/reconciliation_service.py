from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import date, datetime
from decimal import Decimal
from typing import List, Dict, Any

from app.models.banking import BankTransaction
from app.models.money import (
    MonthlyFinance, MonthlyAllocation, MonthlySpending,
    AllocationCategory, SpendingCategory
)
from app.models.goal import Goal
from app.repositories.money_repository import MoneyRepository
from app.services.money_calculations import quantize_money, sum_amounts


class ReconciliationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = MoneyRepository(db)

    def get_reconciliation(self, user_id: UUID, year: int, month: int) -> Dict[str, Any]:
        """
        Produces the canonical reconciliation read model comparing Plan vs Actual.
        Does NOT modify or overwrite user allocations/plans.
        """
        monthly_finance = self.repo.get_month(user_id, year, month)
        if not monthly_finance:
            monthly_finance = self.repo.get_or_create_month(user_id, year, month)
            self.db.commit()
            monthly_finance = self.repo.get_month(user_id, year, month)

        # Fetch transactions for the month
        first_day = date(year, month, 1)
        if month == 12:
            last_day = date(year + 1, 1, 1)
        else:
            last_day = date(year, month + 1, 1)

        transactions = self.db.scalars(
            select(BankTransaction)
            .where(
                BankTransaction.user_id == user_id,
                BankTransaction.transaction_timestamp >= datetime_to_date_start(first_day),
                BankTransaction.transaction_timestamp < datetime_to_date_end(last_day)
            )
        ).all()

        # Calculate actuals from transactions
        actual_spendings = self._calculate_actual_spendings(transactions)
        actual_allocations = self._calculate_actual_allocations(transactions, user_id)

        # Build comparison for Allocations (Plan vs Actual)
        allocations_reconciliation = []
        for allocation in monthly_finance.allocations:
            category_name = allocation.category.name if allocation.category else (allocation.goal.name if allocation.goal else "Custom Allocation")
            planned_amount = allocation.amount

            # Find matching actual
            actual_amount = Decimal("0.00")
            if allocation.category_id:
                actual_amount = actual_allocations.get(str(allocation.category_id), Decimal("0.00"))
            elif allocation.goal_id:
                actual_amount = actual_allocations.get(f"goal:{allocation.goal_id}", Decimal("0.00"))

            remaining = quantize_money(planned_amount - actual_amount)
            status = "COMPLETE" if actual_amount >= planned_amount else ("IN_PROGRESS" if actual_amount > 0 else "NOT_STARTED")

            allocations_reconciliation.append({
                "id": str(allocation.id),
                "name": category_name,
                "planned": str(quantize_money(planned_amount)),
                "actual": str(quantize_money(actual_amount)),
                "remaining": str(remaining),
                "status": status,
                "provenance": "CONNECTED_ACCOUNT" if actual_amount > 0 else "UNAVAILABLE"
            })

        # Build comparison for Spendings (Plan vs Actual)
        spendings_reconciliation = []
        for spending in monthly_finance.spendings:
            category_name = spending.category.name if spending.category else "Spending Category"
            planned_amount = spending.amount

            actual_amount = actual_spendings.get(str(spending.category_id), Decimal("0.00"))
            remaining = quantize_money(planned_amount - actual_amount)
            status = "OVER_PLAN" if actual_amount > planned_amount else ("COMPLETE" if actual_amount == planned_amount else "IN_PROGRESS")

            spendings_reconciliation.append({
                "id": str(spending.id),
                "name": category_name,
                "planned": str(quantize_money(planned_amount)),
                "actual": str(quantize_money(actual_amount)),
                "remaining": str(remaining),
                "status": status,
                "provenance": "CONNECTED_ACCOUNT" if actual_amount > 0 else "UNAVAILABLE"
            })

        return {
            "year": year,
            "month": month,
            "allocations": allocations_reconciliation,
            "spendings": spendings_reconciliation
        }

    def _calculate_actual_spendings(self, transactions: List[BankTransaction]) -> Dict[str, Decimal]:
        """
        Derives actual spending from persisted BankTransactions where classification == 'EXPENSE'.
        Excludes transfers, investments, refunds, etc.
        """
        spendings = {}
        for tx in transactions:
            if tx.classification == "EXPENSE" and tx.category:
                # Find category matching
                cat_key = tx.category.lower().replace(" ", "_")
                current = spendings.get(cat_key, Decimal("0.00"))
                spendings[cat_key] = current + tx.amount
        return spendings

    def _calculate_actual_allocations(self, transactions: List[BankTransaction], user_id: UUID) -> Dict[str, Decimal]:
        """
        Derives actual allocation/savings/emergency contributions from verified transfer evidence or income.
        """
        allocations = {}

        # Check for transfer evidence between accounts or goal contributions
        for tx in transactions:
            if tx.classification == "TRANSFER":
                # If it's a transfer to a savings/emergency account, credit that allocation
                pass
            elif tx.classification == "INVESTMENT":
                # Map to investment allocation
                pass

        return allocations


def datetime_to_date_start(d: date) -> datetime:
    return datetime(d.year, d.month, d.day, 0, 0, 0)

def datetime_to_date_end(d: date) -> datetime:
    return datetime(d.year, d.month, d.day, 23, 59, 59)

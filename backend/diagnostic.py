import sys
import os
from uuid import UUID
from datetime import date
from decimal import Decimal

# Add the backend root to sys.path
sys.path.append("/c/Users/vansh/OneDrive/Desktop/Vestor/backend")

from app.db.session import SessionLocal
from app.models.user import User
from app.models.banking import FinancialConnection, ConnectedAccount, BankTransaction
from app.models.money import MonthlyFinance, MonthlyAllocation, MonthlySpending
from app.models.goal import Goal, GoalContribution

def audit():
    db = SessionLocal()
    try:
        # Find the primary user
        user = db.query(User).first()
        if not user:
            print("No user found.")
            return

        print(f"--- Auditing User: {user.email} (ID: {user.id}) ---")

        # B. FinancialConnection
        connections = db.query(FinancialConnection).filter(FinancialConnection.user_id == user.id).all()
        print(f"\n[FinancialConnection] Found {len(connections)} connections:")
        for conn in connections:
            print(f"- ID: {conn.id}, Status: {conn.status}, Provider: {conn.provider}, Last Synced: {conn.last_synced_at}")

        # C. ConnectedAccount
        accounts = db.query(ConnectedAccount).filter(ConnectedAccount.user_id == user.id).all()
        print(f"\n[ConnectedAccount] Found {len(accounts)} accounts:")
        for acc in accounts:
            print(f"- ID: {acc.id}, ConnID: {acc.connection_id}, Inst: {acc.institution_name}, Bal: {acc.balance}, Status: {acc.balance_status}, Purpose: {acc.purpose}")

        # D. BankTransaction
        transactions = db.query(BankTransaction).filter(BankTransaction.user_id == user.id).all()
        print(f"\n[BankTransaction] Found {len(transactions)} transactions:")
        for tx in transactions:
            print(f"- ID: {tx.id}, AccID: {tx.connected_account_id}, Amount: {tx.amount}, Type: {tx.transaction_type}, Class: {tx.classification}, Status: {tx.classification_status}, Category: {tx.category}")

        # G. MonthlyFinance
        finances = db.query(MonthlyFinance).filter(MonthlyFinance.user_id == user.id).all()
        print(f"\n[MonthlyFinance] Found {len(finances)} monthly records:")
        for fin in finances:
            print(f"- {fin.year}-{fin.month:02d}: Income: {fin.income}, Locked: {fin.is_locked}")
            
            # Spendings
            spendings = db.query(MonthlySpending).filter(MonthlySpending.monthly_finance_id == fin.id).all()
            print(f"  Spendings ({len(spendings)}):")
            for s in spendings:
                print(f"  - Category: {s.category.slug}, Amount: {s.amount}")
                
            # Allocations
            allocations = db.query(MonthlyAllocation).filter(MonthlyAllocation.monthly_finance_id == fin.id).all()
            print(f"  Allocations ({len(allocations)}):")
            for a in allocations:
                if a.category_id:
                    print(f"  - Category: {a.category.slug}, Amount: {a.amount}")
                if a.goal_id:
                    print(f"  - Goal: {a.goal.name}, Amount: {a.amount}")

    finally:
        db.close()

if __name__ == "__main__":
    audit()

"""Idempotently seed October 2026 simulated activity for an existing user."""
from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4
import hashlib

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.banking import BankTransaction, ConnectedAccount, FinancialConnection
from app.models.user import User


TARGET_EMAIL = "vansharora2310@gmail.com"
TX = [
    (1, "CREDIT", 100000, "SALARY CREDIT ACME TECHNOLOGIES", "Income", "INCOME"),
    (2, "DEBIT", 18000, "HOUSE RENT OCTOBER", "Rent", "EXPENSE"),
    (3, "DEBIT", 4000, "BIGBASKET GROCERY", "Groceries", "EXPENSE"),
    (5, "DEBIT", 3000, "DMART GROCERY", "Groceries", "EXPENSE"),
    (6, "DEBIT", 2000, "BESCOM ELECTRICITY BILL", "Utilities", "EXPENSE"),
    (8, "DEBIT", 1500, "AIRTEL FIBER BILL", "Utilities", "EXPENSE"),
    (10, "DEBIT", 2500, "UBER INDIA TRIP", "Transport", "EXPENSE"),
    (12, "DEBIT", 1500, "INDIAN OIL PETROL", "Transport", "EXPENSE"),
    (14, "DEBIT", 3500, "SWIGGY FOOD ORDER", "Food", "EXPENSE"),
    (16, "DEBIT", 2000, "ZOMATO ONLINE ORDER", "Food", "EXPENSE"),
    (18, "DEBIT", 4000, "AMAZON RETAIL ORDER", "Shopping", "EXPENSE"),
    (20, "DEBIT", 2000, "MYNTRA SHOPPING", "Shopping", "EXPENSE"),
    (21, "DEBIT", 2000, "PVR CINEMAS", "Entertainment", "EXPENSE"),
    (22, "DEBIT", 1000, "NETFLIX SUBSCRIPTION", "Subscriptions", "EXPENSE"),
    (24, "DEBIT", 3000, "APOLLO PHARMACY", "Healthcare", "EXPENSE"),
    (25, "DEBIT", 5000, "HOME CENTRE HOUSEHOLD", "Household", "EXPENSE"),
    (27, "DEBIT", 2000, "UPI/884120/LOCAL-MERCHANT", "Unclassified", "UNCLASSIFIED"),
    (29, "DEBIT", 3000, "UPI/771903/QR-4451", "Unclassified", "UNCLASSIFIED"),
]


def main():
    with SessionLocal() as db:
        user = db.scalars(select(User).where(User.email == TARGET_EMAIL)).first()
        if not user:
            raise SystemExit(f"Existing user {TARGET_EMAIL} was not found; no data was changed.")
        conn = db.scalars(select(FinancialConnection).where(FinancialConnection.user_id == user.id, FinancialConnection.provider == "VESTOR_DEMO")).first()
        if not conn:
            conn = FinancialConnection(id=uuid4(), user_id=user.id, provider="VESTOR_DEMO", status="ACTIVE")
            db.add(conn); db.flush()
        account = db.scalars(select(ConnectedAccount).where(ConnectedAccount.user_id == user.id, ConnectedAccount.connection_id == conn.id)).first()
        if not account:
            account = ConnectedAccount(id=uuid4(), user_id=user.id, connection_id=conn.id, institution_name="Vestor Simulated Bank", account_type="SAVINGS", masked_account_number="**2026", purpose="main_spending", status="ACTIVE", opening_balance=Decimal("0"), balance_status="NOT_SYNCED")
            db.add(account); db.flush()
        inserted = 0
        for day, direction, amount, narration, category, classification in TX:
            provider_id = f"VESTOR-DEMO-OCT26-{day:02d}"
            exists = db.scalars(select(BankTransaction.id).where(BankTransaction.connected_account_id == account.id, BankTransaction.provider_transaction_id == provider_id)).first()
            if exists:
                existing = db.scalars(select(BankTransaction).where(BankTransaction.connected_account_id == account.id, BankTransaction.provider_transaction_id == provider_id)).first()
                if existing and existing.source == "DEMO":
                    existing.amount = Decimal(amount)
                continue
            dedupe = hashlib.sha256(f"{account.id}:{provider_id}".encode()).hexdigest()
            db.add(BankTransaction(id=uuid4(), user_id=user.id, connected_account_id=account.id, provider_transaction_id=provider_id, transaction_timestamp=datetime(2026, 10, day, 12, tzinfo=timezone.utc), amount=Decimal(amount), transaction_type=direction, narration=narration, transaction_mode="SIMULATED", category=category, classification=classification, classification_status="SYSTEM_CLASSIFIED" if classification != "UNCLASSIFIED" else "UNCLASSIFIED", confidence=Decimal("0.95") if classification != "UNCLASSIFIED" else Decimal("0.00"), classification_source="DEMO", source="DEMO", dedupe_hash=dedupe))
            inserted += 1
        db.commit()
        print(f"Existing user {user.email}: inserted {inserted}, already present {len(TX)-inserted}; simulated account {account.id}")


if __name__ == "__main__":
    main()

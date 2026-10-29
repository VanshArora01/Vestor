import sys
sys.path.append("/c/Users/vansh/OneDrive/Desktop/Vestor/backend")

from app.db.session import SessionLocal
from app.models.user import User
from app.models.banking import FinancialConnection, ConnectedAccount, BankTransaction
from app.models.money import MonthlyFinance, MonthlyAllocation, MonthlySpending
from app.models.goal import Goal

def audit_all():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Total Users: {len(users)}")
        for u in users:
            print(f"\n--- User: {u.email} (ID: {u.id}) ---")
            conns = db.query(FinancialConnection).filter(FinancialConnection.user_id == u.id).all()
            print(f"  Connections: {len(conns)}")
            for c in conns:
                print(f"    - Conn ID: {c.id}, Status: {c.status}, Provider: {c.provider}")
            
            accs = db.query(ConnectedAccount).filter(ConnectedAccount.user_id == u.id).all()
            print(f"  Accounts: {len(accs)}")
            for a in accs:
                print(f"    - Acc ID: {a.id}, Name: {a.institution_name}, Bal: {a.balance}, Purpose: {a.purpose}")

            txs = db.query(BankTransaction).filter(BankTransaction.user_id == u.id).all()
            print(f"  Transactions: {len(txs)}")
            for t in txs[:5]:
                print(f"    - Tx: {t.transaction_timestamp}, Amt: {t.amount}, Type: {t.transaction_type}, Class: {t.classification}, Narr: {t.narration}")

    finally:
        db.close()

if __name__ == "__main__":
    audit_all()

import sys
sys.path.append("/c/Users/vansh/OneDrive/Desktop/Vestor/backend")

from app.db.base import Base
from app.db.session import SessionLocal
from app.models.banking import FinancialConnection, ConnectedAccount

db = SessionLocal()
try:
    # Find all connections where status is PENDING or orphaned
    conns = db.query(FinancialConnection).all()
    print(f"Total connections: {len(conns)}")
    for c in conns:
        print(f"Connection ID: {c.id}, Status: {c.status}, User: {c.user_id}, Accounts count: {len(c.accounts)}")
        if c.status == "PENDING" and len(c.accounts) == 0:
            print(f"  -> Stale pending connection with no accounts. Deleting...")
            db.delete(c)
        elif c.status == "PENDING" and len(c.accounts) > 0:
            print(f"  -> WARNING: PENDING connection has active accounts! Fixing...")
            for acc in c.accounts:
                if acc.status == "ACTIVE":
                    acc.status = "DISCONNECTED"
    
    db.commit()
    print("Cleanup completed successfully.")
finally:
    db.close()

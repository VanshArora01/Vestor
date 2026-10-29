import sys
sys.path.append("/c/Users/vansh/OneDrive/Desktop/Vestor/backend")

from app.db.base import Base
from app.db.session import SessionLocal
from app.models.user import User
from app.services.reconciliation_service import ReconciliationService


def test_reconciliation():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == 'vansharora2306@gmail.com').first()
        if not user:
            print("Test user not found")
            return
        
        service = ReconciliationService(db)
        result = service.get_reconciliation(user.id, 2026, 8)
        
        print(f"Reconciliation for {user.email} (2026-08):")
        print(f"Allocations: {len(result['allocations'])}")
        for alloc in result['allocations']:
            print(f"  {alloc['name']}: Planned={alloc['planned']}, Actual={alloc['actual']}, Status={alloc['status']}")
        
        print(f"Spendings: {len(result['spendings'])}")
        for spending in result['spendings']:
            print(f"  {spending['name']}: Planned={spending['planned']}, Actual={spending['actual']}, Status={spending['status']}")
    finally:
        db.close()

if __name__ == "__main__":
    test_reconciliation()

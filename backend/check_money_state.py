import sys
sys.path.append("/c/Users/vansh/OneDrive/Desktop/Vestor/backend")

from app.db.base import Base
from app.db.session import SessionLocal
from app.models.user import User
from app.services.money_service import MoneyService


def check_money_state():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == 'vansharora2306@gmail.com').first()
        if not user:
            print("Test user not found")
            return
        
        service = MoneyService(db)
        result = service.get_current_month_state(user)
        
        print(f"Money State for {user.email}:")
        print(f"Year: {result['year']}, Month: {result['month']}")
        print(f"Income: {result['income']}")
        print(f"Confirmed Income: {result['metrics'].get('confirmed_income')}")
        print(f"Available to Plan: {result['metrics'].get('available_to_plan')}")
        print(f"Allocated Total: {result['metrics'].get('allocated_total')}")
        print(f"Spending Total: {result['metrics'].get('spending_total')}")
        print(f"Allocations: {len(result['allocations'])}")
        for alloc in result['allocations'][:3]:
            print(f"  {alloc['category_name']}: {alloc['amount']}")
    finally:
        db.close()

if __name__ == "__main__":
    check_money_state()

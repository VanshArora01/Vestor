import sys
sys.path.append("/c/Users/vansh/OneDrive/Desktop/Vestor/backend")

from app.db.base import Base
from app.db.session import SessionLocal
from app.models.user import User
from app.models.money import MonthlyFinance

db = SessionLocal()
try:
    user = db.query(User).filter(User.email == 'vansharora2306@gmail.com').first()
    print('User:', user.email, user.id)
    
    mf = db.query(MonthlyFinance).filter(MonthlyFinance.user_id == user.id, MonthlyFinance.year == 2026, MonthlyFinance.month == 8).first()
    if not mf:
        print('Creating MonthlyFinance for 2026-08...')
        mf = MonthlyFinance(user_id=user.id, year=2026, month=8, income=None, manual_income_adjustment=None, carryover=0)
        db.add(mf)
        db.commit()
        print('Created successfully!')
    else:
        print('MonthlyFinance already exists:', mf.id)
finally:
    db.close()

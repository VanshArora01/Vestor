import sys
sys.path.append("/c/Users/vansh/OneDrive/Desktop/Vestor/backend")

from app.db.base import Base
from app.db.session import SessionLocal
from app.models.banking import BankTransaction
from decimal import Decimal

def classify_existing():
    db = SessionLocal()
    try:
        user_id = "9891f84a-5ed7-4339-9e5f-90e8d0942156"
        
        # Get unclassified transactions
        txs = db.query(BankTransaction).filter(
            BankTransaction.user_id == user_id,
            BankTransaction.classification == None
        ).all()
        
        print(f"Found {len(txs)} unclassified transactions")
        
        for tx in txs:
            narr = tx.narration or ""
            narr_upper = narr.upper()
            
            classification = "UNCLASSIFIED"
            category = "Unclassified"
            
            if tx.transaction_type == "CREDIT":
                if any(kw in narr_upper for kw in ("SALARY", "PAYSLIP", "PAYROLL", "REIMBURSEMENT", "STIPEND", "WAGES")):
                    classification = "INCOME"
                    category = "Salary"
                elif any(kw in narr_upper for kw in ("REFUND", "CASHBACK", "CASH BACK", "MONEY BACK")):
                    classification = "REFUND"
                    category = "Refund"
                elif any(kw in narr_upper for kw in ("INTEREST", "DIVIDEND", "COUPON")):
                    classification = "INTEREST"
                    category = "Interest"
            else:  # DEBIT
                if any(kw in narr_upper for kw in ("SWIGGY", "ZOMATO")):
                    classification = "EXPENSE"
                    category = "Food"
                elif any(kw in narr_upper for kw in ("AMAZON", "FLIPKART")):
                    classification = "EXPENSE"
                    category = "Shopping"
                elif any(kw in narr_upper for kw in ("ZERODHA", "GROWW", "UPSTOX", "MUTUAL FUND", "BROKER", "INDMONEY")):
                    classification = "INVESTMENT"
                    category = "Investment"
                elif any(kw in narr_upper for kw in ("FEE", "CHARGE", "GST", "PENALTY", "BOUNCE", "COMMISSION")):
                    classification = "FEE"
                    category = "Fee"
            
            tx.classification = classification
            tx.classification_status = "SYSTEM_CLASSIFIED" if classification != "UNCLASSIFIED" else "UNCLASSIFIED"
            tx.category = category
            tx.confidence = Decimal("0.95") if classification != "UNCLASSIFIED" else Decimal("0.00")
            tx.classification_source = "AUTO"
            
            print(f"  {tx.narration} -> {classification}")
        
        db.commit()
        print(f"Successfully classified {len(txs)} transactions")
        
    finally:
        db.close()

if __name__ == "__main__":
    classify_existing()

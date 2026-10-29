from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select
from decimal import Decimal
from datetime import datetime, timezone
import hashlib

from app.models.banking import BankTransaction, ConnectedAccount

class ClassificationService:
    def __init__(self, db: Session):
        self.db = db

    def classify_transaction_dict(self, user_id: UUID, account_id: UUID, tx: dict) -> dict:
        """
        Pure function / mapping logic to determine classification for a transaction dict.
        """
        # Get user's confirmed patterns
        patterns = []
        try:
            from app.models.money import IncomePattern
            patterns = self.db.query(IncomePattern).filter(
                IncomePattern.user_id == user_id,
                IncomePattern.is_confirmed == True
            ).all()
        except Exception:
            # If IncomePattern model not available, continue without patterns
            pass

        account_purpose = None
        account = self.db.query(ConnectedAccount).filter(ConnectedAccount.id == account_id).first()
        if account:
            account_purpose = account.purpose

        provider_tx_id = tx.get("txnId") or tx.get("referenceNumber") or tx.get("id")

        ts_raw = tx.get("transactionTimestamp") or tx.get("valueDate") or tx.get("date") or datetime.now(timezone.utc).isoformat()
        if isinstance(ts_raw, datetime):
            tx_ts = ts_raw
        else:
            try:
                tx_ts = datetime.fromisoformat(str(ts_raw).replace("Z", "+00:00"))
            except Exception:
                tx_ts = datetime.now(timezone.utc)

        amt_raw = tx.get("amount", 0)
        try:
            amount = Decimal(str(amt_raw))
        except Exception:
            amount = Decimal("0.00")

        tx_type_raw = str(tx.get("type", "DEBIT")).upper()
        tx_type = "CREDIT" if tx_type_raw == "CREDIT" else "DEBIT"

        narration = tx.get("narration") or tx.get("description") or "Bank Transaction"
        mode = tx.get("mode") or tx.get("type") or "ELECTRONIC"

        bal_after = None
        if tx.get("currentBalance") is not None:
            try:
                bal_after = Decimal(str(tx.get("currentBalance")))
            except Exception:
                pass

        ref_num = tx.get("referenceNumber") or tx.get("txnId")

        # Compute deterministic dedupe_hash
        if provider_tx_id:
            raw_hash_key = f"{account_id}:{provider_tx_id}"
        else:
            ts_str = tx_ts.isoformat()
            raw_hash_key = f"{account_id}:{ts_str}:{amount}:{tx_type}:{narration}"

        dedupe_hash = hashlib.sha256(raw_hash_key.encode("utf-8")).hexdigest()

        # Determine classification
        classification = "UNCLASSIFIED"
        classification_status = "UNCLASSIFIED"
        confidence = Decimal("0.00")
        classification_source = "AUTO"
        merchant_name = None
        category = "Unclassified"

        # Check pattern memory first
        matched_pattern = None
        if tx_type == "CREDIT":
            for pat in patterns:
                if pat.narration_pattern.lower() not in narration.lower():
                    continue
                if pat.connected_account_id and pat.connected_account_id != account_id:
                    continue
                if pat.typical_amount is not None:
                    if abs(amount - pat.typical_amount) > pat.amount_tolerance:
                        continue
                matched_pattern = pat
                break

        narr_upper = narration.upper()
        if tx_type == "CREDIT" and matched_pattern:
            classification = "INCOME"
            classification_status = "USER_CONFIRMED"
            confidence = Decimal("1.00")
            classification_source = "PATTERN"
            category = matched_pattern.merchant_name or "Salary"
            merchant_name = matched_pattern.merchant_name
        elif tx_type == "CREDIT":
            salary_kws = ("SALARY", "PAYSLIP", "PAYROLL", "REIMBURSEMENT", "STIPEND", "WAGES")
            if any(kw in narr_upper for kw in salary_kws):
                classification = "INCOME"
                classification_status = "SYSTEM_CLASSIFIED"
                confidence = Decimal("0.95")
                category = "Salary"
            elif any(kw in narr_upper for kw in ("FREELANCE", "UPWORK", "FIVERR", "CONSULTING", "CLIENT PAYMENT")):
                classification = "INCOME"
                classification_status = "SYSTEM_CLASSIFIED"
                confidence = Decimal("0.90")
                category = "Freelance"
            elif any(kw in narr_upper for kw in ("TRANSFER TO SELF", "TRANSFER FROM SELF", "IMPS-TRANSFER", "OWN A/C")):
                classification = "TRANSFER"
                classification_status = "SYSTEM_CLASSIFIED"
                confidence = Decimal("0.95")
                category = "Transfer"
            elif any(kw in narr_upper for kw in ("REFUND", "CASHBACK", "CASH BACK", "MONEY BACK")):
                classification = "REFUND"
                classification_status = "SYSTEM_CLASSIFIED"
                confidence = Decimal("0.95")
                category = "Refund"
            elif any(kw in narr_upper for kw in ("INTEREST", "DIVIDEND", "COUPON")):
                classification = "INTEREST"
                classification_status = "SYSTEM_CLASSIFIED"
                confidence = Decimal("0.95")
                category = "Interest"
        else:
            # Check internal transfers
            if any(kw in narr_upper for kw in ("TRANSFER TO SELF", "TRANSFER FROM SELF", "OWN A/C", "SELF ICICI", "SELF HDFC")):
                classification = "TRANSFER"
                classification_status = "SYSTEM_CLASSIFIED"
                confidence = Decimal("0.95")
                category = "Transfer"
            elif any(kw in narr_upper for kw in ("ZERODHA", "GROWW", "UPSTOX", "MUTUAL FUND", "BROKER", "INDMONEY", "PARAG PARIKH")):
                classification = "INVESTMENT"
                classification_status = "SYSTEM_CLASSIFIED"
                confidence = Decimal("0.95")
                category = "Investment"
            elif any(kw in narr_upper for kw in ("FEE", "CHARGE", "GST", "PENALTY", "BOUNCE", "COMMISSION")):
                classification = "FEE"
                classification_status = "SYSTEM_CLASSIFIED"
                confidence = Decimal("0.95")
                category = "Fee"
            elif any(kw in narr_upper for kw in ("RENT", "HOUSE RENT", "SOCIETY MAINTENANCE", "MAINTENANCE CHARGE")):
                classification = "EXPENSE"
                classification_status = "SYSTEM_CLASSIFIED"
                confidence = Decimal("0.95")
                merchant_name = "Landlord"
                category = "Rent"
            else:
                merchants = [
                    ("SWIGGY", "Swiggy", "Food"),
                    ("ZOMATO", "Zomato", "Food"),
                    ("BLINKIT", "Blinkit", "Food"),
                    ("ZEPTO", "Zepto", "Food"),
                    ("BIGBASKET", "BigBasket", "Food"),
                    ("DMART", "DMart", "Groceries"),
                    ("AMAZON", "Amazon", "Shopping"),
                    ("FLIPKART", "Flipkart", "Shopping"),
                    ("MYNTRA", "Myntra", "Shopping"),
                    ("UBER", "Uber", "Transport"),
                    ("OLA", "Ola", "Transport"),
                    ("METRO", "Metro Rail", "Transport"),
                    ("PETROL", "Fuel", "Transport"),
                    ("INDIAN OIL", "IOCL", "Transport"),
                    ("HPCL", "HP Petrol", "Transport"),
                    ("BPCL", "BPCL", "Transport"),
                    ("BESCOM", "BESCOM Electricity", "Utilities"),
                    ("ELECTRICITY", "Electricity Board", "Utilities"),
                    ("AIRTEL", "Airtel Broadband", "Utilities"),
                    ("JIO", "Jio Fiber", "Utilities"),
                    ("BWSSB", "Water Supply Board", "Utilities"),
                    ("WATER", "Water Supply", "Utilities"),
                    ("NETFLIX", "Netflix", "Entertainment"),
                    ("SUBSCRIPTION", "Subscription", "Subscriptions"),
                    ("SUBSCRIPTION", "Subscription", "Subscriptions"),
                    ("SPOTIFY", "Spotify", "Entertainment"),
                    ("HOTSTAR", "Disney+ Hotstar", "Entertainment"),
                    ("PVR", "PVR Cinemas", "Entertainment"),
                    ("BOOKMYSHOW", "BookMyShow", "Entertainment"),
                    ("APOLLO", "Apollo Pharmacy", "Healthcare"),
                    ("MEDPLUS", "MedPlus Pharmacy", "Healthcare"),
                    ("PRACTO", "Practo Health", "Healthcare"),
                    ("CULT", "Cult.fit", "Healthcare"),
                    ("GYM", "Fitness Center", "Healthcare"),
                    ("HOSPITAL", "City Clinic", "Healthcare"),
                    ("HOME CENTRE", "Home Centre", "Household"),
                    ("HOUSEHOLD", "Household", "Household"),
                    ("IRCTC", "IRCTC", "Travel"),
                    ("MAKEMYTRIP", "MakeMyTrip", "Travel"),
                    ("GOIBIBO", "Goibibo", "Travel"),
                    ("INDIGO", "IndiGo", "Travel"),
                    ("AIR INDIA", "Air India", "Travel"),
                ]
                for kw, merch, cat in merchants:
                    if kw in narr_upper:
                        classification = "EXPENSE"
                        classification_status = "SYSTEM_CLASSIFIED"
                        confidence = Decimal("0.95")
                        merchant_name = merch
                        category = cat
                        break

        return {
            "user_id": user_id,
            "connected_account_id": account_id,
            "provider_transaction_id": provider_tx_id,
            "transaction_timestamp": tx_ts,
            "amount": amount,
            "transaction_type": tx_type,
            "narration": narration,
            "transaction_mode": mode,
            "category": category,
            "classification": classification,
            "classification_status": classification_status,
            "confidence": confidence,
            "classification_source": classification_source,
            "merchant_name": merchant_name,
            "source": "SETU",
            "balance_after_transaction": bal_after,
            "reference_number": ref_num,
            "dedupe_hash": dedupe_hash,
            "account_purpose": account_purpose
        }

    def classify_unclassified_transactions(self, user_id: UUID) -> int:
        """
        Idempotent service method to retroactively classify existing UNCLASSIFIED transactions.
        Never overwrites USER_CORRECTED or USER_CONFIRMED rows.
        """
        unclassified_txs = self.db.scalars(
            select(BankTransaction).where(
                BankTransaction.user_id == user_id,
                BankTransaction.classification_status.in_(["UNCLASSIFIED", ""]) | (BankTransaction.classification == None)
            )
        ).all()

        count = 0
        for tx in unclassified_txs:
            # Skip if user explicitly corrected or confirmed
            if tx.classification_status in ("USER_CORRECTED", "USER_CONFIRMED") or tx.classification_source == "USER":
                continue

            raw_tx = {
                "txnId": tx.provider_transaction_id,
                "transactionTimestamp": tx.transaction_timestamp,
                "amount": tx.amount,
                "type": tx.transaction_type,
                "narration": tx.narration,
                "mode": tx.transaction_mode,
                "currentBalance": tx.balance_after_transaction,
                "referenceNumber": tx.reference_number
            }

            classified = self.classify_transaction_dict(user_id, tx.connected_account_id, raw_tx)

            # Update fields
            tx.classification = classified["classification"]
            tx.classification_status = classified["classification_status"]
            tx.category = classified["category"]
            tx.confidence = classified["confidence"]
            tx.classification_source = classified["classification_source"]
            tx.merchant_name = classified["merchant_name"]
            tx.account_purpose = classified["account_purpose"]
            count += 1

        self.db.commit()
        return count

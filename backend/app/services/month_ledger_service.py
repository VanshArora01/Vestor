"""Month ledger: seed a representative history, then apply classified activity to Money."""

from __future__ import annotations

import calendar
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.models.banking import BankTransaction, ConnectedAccount
from app.models.user import User
from app.services.classification_service import ClassificationService
from app.services.money_calculations import money_to_str, parse_money, quantize_money
from app.services.money_service import MoneyService

CATEGORY_TO_SLUG = {
    "food": "food",
    "rent": "rent",
    "transport": "transport",
    "utilities": "utilities",
    "shopping": "shopping",
    "entertainment": "entertainment",
    "healthcare": "healthcare",
    "education": "education",
    "travel": "travel",
    "fee": "others",
}

LEDGER_SALARY = Decimal("100000.00")
LEDGER_SPEND_CLASSIFIED = Decimal("58500.00")
LEDGER_SPEND_UNKNOWN = Decimal("1500.00")


def _month_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    _, last = calendar.monthrange(year, month)
    start = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(year, month, last, 23, 59, 59, 999999, tzinfo=timezone.utc)
    return start, end


def _safe_day(year: int, month: int, day: int) -> int:
    _, last = calendar.monthrange(year, month)
    return min(day, last)


class MonthLedgerService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.classifier = ClassificationService(db)
        self.money = MoneyService(db)

    def seed_month_ledger(self, user: User, account_id: UUID, year: int, month: int) -> dict:
        account = self._require_account(user.id, account_id)
        start, end = _month_bounds(year, month)
        existing = self._month_transactions(user.id, account_id, start, end)
        if existing:
            return {
                "seeded": False,
                "transaction_count": len(existing),
                "year": year,
                "month": month,
            }

        specs = self._ledger_specs(year, month)
        created = 0
        running = Decimal("0.00")
        for spec in specs:
            running = running + spec["amount"] if spec["type"] == "CREDIT" else running - spec["amount"]
            raw = {
                "txnId": spec["txnId"],
                "transactionTimestamp": spec["transactionTimestamp"],
                "amount": spec["amount"],
                "type": spec["type"],
                "narration": spec["narration"],
                "mode": spec["mode"],
                "currentBalance": running,
            }
            classified = self.classifier.classify_transaction_dict(user.id, account.id, raw)
            if spec.get("force_unclassified"):
                classified["classification"] = "UNCLASSIFIED"
                classified["classification_status"] = "UNCLASSIFIED"
                classified["category"] = "Unclassified"
                classified["confidence"] = Decimal("0.20")
                classified["classification_source"] = "AUTO"
                classified["merchant_name"] = None
            tx = BankTransaction(
                user_id=user.id,
                connected_account_id=account.id,
                provider_transaction_id=classified["provider_transaction_id"],
                transaction_timestamp=classified["transaction_timestamp"],
                amount=classified["amount"],
                transaction_type=classified["transaction_type"],
                narration=classified["narration"],
                transaction_mode=classified["transaction_mode"],
                category=classified["category"],
                classification=classified["classification"],
                classification_status=classified["classification_status"],
                confidence=classified["confidence"],
                classification_source=classified["classification_source"],
                merchant_name=classified["merchant_name"],
                source="LEDGER",
                balance_after_transaction=classified["balance_after_transaction"],
                reference_number=classified["reference_number"],
                account_purpose=account.purpose,
                dedupe_hash=classified["dedupe_hash"],
            )
            self.db.add(tx)
            created += 1

        account.opening_balance = Decimal("0.00")
        account.balance = running
        account.balance_status = "SYNCED"
        account.balance_timestamp = datetime.now(timezone.utc)
        account.last_synced_at = datetime.now(timezone.utc)
        self.db.add(account)
        self.db.commit()
        return {
            "seeded": True,
            "transaction_count": created,
            "year": year,
            "month": month,
            "income": money_to_str(LEDGER_SALARY),
            "classified_spending": money_to_str(LEDGER_SPEND_CLASSIFIED),
            "unrecognized_spending": money_to_str(LEDGER_SPEND_UNKNOWN),
            "remaining": money_to_str(LEDGER_SALARY - LEDGER_SPEND_CLASSIFIED - LEDGER_SPEND_UNKNOWN),
        }

    def analyze_month(self, user: User, account_id: UUID, year: int, month: int) -> dict:
        self.money._validate_year_month(year, month)
        account = self._require_account(user.id, account_id)
        record = self.money.repo.get_or_create_month(user.id, year, month)
        if record.is_locked:
            raise ConflictError(code="MONTH_LOCKED", message="This month is locked and cannot be edited")

        seed_result = self.seed_month_ledger(user, account.id, year, month)
        self.classifier.classify_unclassified_transactions(user.id)

        start, end = _month_bounds(year, month)
        txs = self._month_transactions(user.id, account.id, start, end)
        if not txs:
            raise AppError(
                code="NO_TRANSACTIONS",
                message="No transactions in this month to analyze",
                status_code=422,
            )

        income_total = Decimal("0.00")
        spending_by_slug: dict[str, Decimal] = {}
        unrecognized: list[BankTransaction] = []

        for tx in txs:
            if tx.classification_status in ("USER_CORRECTED", "USER_CONFIRMED") and tx.classification_source == "USER":
                pass
            if self._is_unrecognized(tx):
                unrecognized.append(tx)
                continue
            if tx.transaction_type == "CREDIT" and tx.classification == "INCOME":
                tx.classification_status = "USER_CONFIRMED"
                tx.classification_source = "USER"
                tx.confidence = Decimal("1.00")
                income_total += tx.amount
                self._remember_income_pattern(user.id, tx)
                continue
            if tx.transaction_type == "DEBIT" and tx.classification in ("EXPENSE", "FEE"):
                slug = self._slug_for_tx(tx)
                spending_by_slug[slug] = spending_by_slug.get(slug, Decimal("0.00")) + tx.amount

        if income_total <= 0:
            raise AppError(
                code="INCOME_NOT_DETECTED",
                message="Could not detect a salary credit for this month",
                status_code=422,
            )

        record.income = quantize_money(income_total)
        self.money.repo.save_month(record)

        spending_items = self._spending_items(user.id, spending_by_slug)
        month_state = self.money.set_spending(user, year, month, spending_items)

        unrecognized_payload = [
            {
                "id": str(tx.id),
                "narration": tx.narration,
                "amount": money_to_str(tx.amount),
                "transaction_type": tx.transaction_type,
                "transaction_timestamp": tx.transaction_timestamp.isoformat(),
                "merchant_name": tx.merchant_name,
            }
            for tx in unrecognized
        ]
        remaining = parse_money(month_state["metrics"]["surplus"] or "0")
        return {
            "year": year,
            "month": month,
            "seeded": seed_result.get("seeded", False),
            "income": money_to_str(income_total),
            "spending_total": month_state["metrics"]["spending_total"],
            "remaining": money_to_str(remaining),
            "classified_count": len(txs) - len(unrecognized),
            "unrecognized": unrecognized_payload,
            "month_state": month_state,
        }

    def _require_account(self, user_id: UUID, account_id: UUID) -> ConnectedAccount:
        account = self.db.scalars(
            select(ConnectedAccount).where(
                ConnectedAccount.id == account_id,
                ConnectedAccount.user_id == user_id,
            )
        ).first()
        if account is None:
            raise NotFoundError(code="ACCOUNT_NOT_FOUND", message="Account not found")
        return account

    def _month_transactions(
        self, user_id: UUID, account_id: UUID, start: datetime, end: datetime
    ) -> list[BankTransaction]:
        return list(
            self.db.scalars(
                select(BankTransaction)
                .where(
                    BankTransaction.user_id == user_id,
                    BankTransaction.connected_account_id == account_id,
                    BankTransaction.transaction_timestamp >= start,
                    BankTransaction.transaction_timestamp <= end,
                )
                .order_by(BankTransaction.transaction_timestamp.asc())
            ).all()
        )

    def _is_unrecognized(self, tx: BankTransaction) -> bool:
        if tx.classification_status in ("USER_CORRECTED", "USER_CONFIRMED"):
            return False
        if tx.classification in (None, "", "UNCLASSIFIED"):
            return True
        if (tx.category or "").lower() in ("unclassified", ""):
            return tx.classification not in ("INCOME", "TRANSFER", "INVESTMENT", "REFUND", "INTEREST")
        return False

    def _slug_for_tx(self, tx: BankTransaction) -> str:
        key = (tx.category or "").strip().lower()
        return CATEGORY_TO_SLUG.get(key, "others")

    def _spending_items(self, user_id: UUID, spending_by_slug: dict[str, Decimal]) -> list[dict[str, str]]:
        categories = self.money.repo.list_spending_categories(user_id, active_only=True)
        by_slug = {c.slug: c for c in categories}
        others = next((c for c in categories if c.is_others), None)
        items: list[dict[str, str]] = []
        for slug, amount in spending_by_slug.items():
            category = by_slug.get(slug) or others
            if category is None:
                continue
            items.append({"category_id": str(category.id), "amount": money_to_str(amount) or "0.00"})
        # Merge duplicate others
        merged: dict[str, Decimal] = {}
        for item in items:
            merged[item["category_id"]] = merged.get(item["category_id"], Decimal("0")) + parse_money(item["amount"])
        return [{"category_id": cid, "amount": money_to_str(amt) or "0.00"} for cid, amt in merged.items() if amt > 0]

    def _remember_income_pattern(self, user_id: UUID, tx: BankTransaction) -> None:
        from app.models.money import IncomePattern

        narration = tx.narration or "Salary"
        existing = self.db.scalars(
            select(IncomePattern).where(
                IncomePattern.user_id == user_id,
                IncomePattern.narration_pattern == narration,
            )
        ).first()
        if existing:
            existing.typical_amount = tx.amount
            existing.is_confirmed = True
            self.db.add(existing)
            return
        self.db.add(
            IncomePattern(
                user_id=user_id,
                narration_pattern=narration,
                merchant_name=tx.merchant_name or "Salary",
                connected_account_id=tx.connected_account_id,
                typical_amount=tx.amount,
                amount_tolerance=tx.amount * Decimal("0.20"),
                frequency="MONTHLY",
                is_confirmed=True,
            )
        )

    def _ledger_specs(self, year: int, month: int) -> list[dict]:
        def ts(day: int, hour: int, minute: int = 0) -> datetime:
            return datetime(year, month, _safe_day(year, month, day), hour, minute, tzinfo=timezone.utc)

        prefix = f"LEDGER-{year}-{month:02d}"
        return [
            {
                "txnId": f"{prefix}-SALARY",
                "transactionTimestamp": ts(1, 10, 15),
                "amount": Decimal("100000.00"),
                "type": "CREDIT",
                "narration": "ACH CR-INFOSYS TECHNOLOGIES-SALARY",
                "mode": "NEFT",
            },
            {
                "txnId": f"{prefix}-RENT",
                "transactionTimestamp": ts(3, 9, 0),
                "amount": Decimal("28000.00"),
                "type": "DEBIT",
                "narration": "UPI-RAHUL SHARMA-HOUSE RENT",
                "mode": "UPI",
            },
            {
                "txnId": f"{prefix}-SWIGGY-1",
                "transactionTimestamp": ts(5, 20, 10),
                "amount": Decimal("2400.00"),
                "type": "DEBIT",
                "narration": "SWIGGY BANGALORE ORDER 44102",
                "mode": "UPI",
            },
            {
                "txnId": f"{prefix}-ZOMATO",
                "transactionTimestamp": ts(8, 21, 5),
                "amount": Decimal("2100.00"),
                "type": "DEBIT",
                "narration": "ZOMATO ONLINE ORDER 8821",
                "mode": "UPI",
            },
            {
                "txnId": f"{prefix}-BLINKIT",
                "transactionTimestamp": ts(12, 11, 40),
                "amount": Decimal("1800.00"),
                "type": "DEBIT",
                "narration": "BLINKIT GROCERY ORDER 2291",
                "mode": "UPI",
            },
            {
                "txnId": f"{prefix}-SWIGGY-2",
                "transactionTimestamp": ts(19, 19, 20),
                "amount": Decimal("1900.00"),
                "type": "DEBIT",
                "narration": "SWIGGY BANGALORE ORDER 91044",
                "mode": "UPI",
            },
            {
                "txnId": f"{prefix}-UBER",
                "transactionTimestamp": ts(6, 8, 45),
                "amount": Decimal("1800.00"),
                "type": "DEBIT",
                "narration": "UBER TRIP BLR 4401",
                "mode": "UPI",
            },
            {
                "txnId": f"{prefix}-FUEL",
                "transactionTimestamp": ts(16, 18, 0),
                "amount": Decimal("2200.00"),
                "type": "DEBIT",
                "narration": "HPCL PETROL PUMP INDIRANAGAR",
                "mode": "CARD",
            },
            {
                "txnId": f"{prefix}-AIRTEL",
                "transactionTimestamp": ts(7, 7, 10),
                "amount": Decimal("1299.00"),
                "type": "DEBIT",
                "narration": "AIRTEL BROADBAND MONTHLY",
                "mode": "NACH",
            },
            {
                "txnId": f"{prefix}-POWER",
                "transactionTimestamp": ts(10, 12, 0),
                "amount": Decimal("2301.00"),
                "type": "DEBIT",
                "narration": "BESCOM ELECTRICITY BILL",
                "mode": "UPI",
            },
            {
                "txnId": f"{prefix}-AMAZON",
                "transactionTimestamp": ts(14, 16, 20),
                "amount": Decimal("4200.00"),
                "type": "DEBIT",
                "narration": "AMAZON RETAIL INDIA PURCHASE",
                "mode": "CARD",
            },
            {
                "txnId": f"{prefix}-FLIPKART",
                "transactionTimestamp": ts(22, 13, 15),
                "amount": Decimal("2800.00"),
                "type": "DEBIT",
                "narration": "FLIPKART INTERNET PURCHASE",
                "mode": "UPI",
            },
            {
                "txnId": f"{prefix}-NETFLIX",
                "transactionTimestamp": ts(9, 6, 0),
                "amount": Decimal("649.00"),
                "type": "DEBIT",
                "narration": "NETFLIX ENTERTAINMENT SERVICES MONTHLY PLAN",
                "mode": "CARD",
            },
            {
                "txnId": f"{prefix}-SPOTIFY",
                "transactionTimestamp": ts(9, 6, 5),
                "amount": Decimal("119.00"),
                "type": "DEBIT",
                "narration": "SPOTIFY INDIA MONTHLY RECURRING",
                "mode": "CARD",
            },
            {
                "txnId": f"{prefix}-PVR",
                "transactionTimestamp": ts(21, 20, 30),
                "amount": Decimal("1332.00"),
                "type": "DEBIT",
                "narration": "PVR CINEMAS BANGALORE",
                "mode": "UPI",
            },
            {
                "txnId": f"{prefix}-APOLLO",
                "transactionTimestamp": ts(11, 17, 40),
                "amount": Decimal("1850.00"),
                "type": "DEBIT",
                "narration": "APOLLO PHARMACY INDIRANAGAR",
                "mode": "UPI",
            },
            {
                "txnId": f"{prefix}-CULT",
                "transactionTimestamp": ts(4, 7, 30),
                "amount": Decimal("1350.00"),
                "type": "DEBIT",
                "narration": "CULT.FIT HEALTHCARE MEMBERSHIP",
                "mode": "NACH",
            },
            {
                "txnId": f"{prefix}-IRCTC",
                "transactionTimestamp": ts(18, 11, 0),
                "amount": Decimal("2400.00"),
                "type": "DEBIT",
                "narration": "IRCTC TRAVEL BOOKING",
                "mode": "UPI",
            },
            {
                "txnId": f"{prefix}-UNKNOWN-1",
                "transactionTimestamp": ts(17, 15, 12),
                "amount": Decimal("900.00"),
                "type": "DEBIT",
                "narration": "UPI-RAJESH KUMAR-SETTLEMENT REF 4410",
                "mode": "UPI",
                "force_unclassified": True,
            },
            {
                "txnId": f"{prefix}-UNKNOWN-2",
                "transactionTimestamp": ts(24, 14, 8),
                "amount": Decimal("600.00"),
                "type": "DEBIT",
                "narration": "POS-CORNER STORE 8841 BANGALORE",
                "mode": "CARD",
                "force_unclassified": True,
            },
        ]

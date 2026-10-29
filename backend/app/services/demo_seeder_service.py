from decimal import Decimal
from datetime import datetime, timezone, timedelta, date
from uuid import UUID, uuid4
import calendar
from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from app.models.user import User
from app.models.banking import FinancialConnection, ConnectedAccount, FinancialConsent, BankTransaction, ConnectionStatus
from app.models.goal import Goal, GoalContribution
from app.models.money import MonthlyFinance, MonthlyAllocation, MonthlySpending, IncomePattern
from app.models.invest import InvestmentHolding, PortfolioSnapshot, AssetMaster, InvestTransaction
from app.services.classification_service import ClassificationService
from app.core.security import get_password_hash


class DemoSeederService:
    def __init__(self, db: Session):
        self.db = db
        self.classifier = ClassificationService(db)

    def get_or_create_demo_user(self) -> User:
        user = self.db.scalars(select(User).where(User.email == "demo@vestor.ai")).first()
        if not user:
            user = User(
                id=uuid4(),
                email="demo@vestor.ai",
                name="Aarav Sharma",
                password_hash=get_password_hash("password123")
            )
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
        return user

    def seed_demo_persona(self, user_id: UUID) -> dict:
        """
        Seeds a rich 3-month demo persona for the given user:
        - 2 Connected bank accounts (HDFC Main Spending, ICICI Emergency Fund)
        - 1 Zerodha investment portfolio with equities & mutual funds
        - 2 Goals: Emergency Fund (linked to ICICI) and Japan Trip / PS5
        - 3 Months of transactions run through the real classification pipeline
        - Monthly plan allocations and spending envelopes
        - One bonus credit, one ambiguous credit, recurring subscriptions, price hike
        """
        now = datetime.now(timezone.utc)
        curr_year = now.year
        curr_month = now.month

        # Calculate month windows
        m3_year, m3_month = curr_year, curr_month
        m2_month = 12 if curr_month == 1 else curr_month - 1
        m2_year = curr_year - 1 if curr_month == 1 else curr_year
        m1_month = 12 if m2_month == 1 else m2_month - 1
        m1_year = m2_year - 1 if m2_month == 1 else m2_year

        # 1. Clean existing demo data for this user to ensure idempotency
        self.db.query(GoalContribution).filter(GoalContribution.goal_id.in_(
            select(Goal.id).where(Goal.user_id == user_id)
        )).delete(synchronize_session=False)
        self.db.query(Goal).filter(Goal.user_id == user_id).delete(synchronize_session=False)
        self.db.query(InvestTransaction).filter(InvestTransaction.user_id == user_id).delete(synchronize_session=False)
        self.db.query(PortfolioSnapshot).filter(PortfolioSnapshot.user_id == user_id).delete(synchronize_session=False)
        self.db.query(InvestmentHolding).filter(InvestmentHolding.user_id == user_id).delete(synchronize_session=False)
        self.db.query(BankTransaction).filter(BankTransaction.user_id == user_id).delete(synchronize_session=False)
        self.db.query(ConnectedAccount).filter(ConnectedAccount.user_id == user_id).delete(synchronize_session=False)
        self.db.query(FinancialConsent).filter(FinancialConsent.user_id == user_id).delete(synchronize_session=False)
        self.db.query(FinancialConnection).filter(FinancialConnection.user_id == user_id).delete(synchronize_session=False)
        self.db.query(MonthlyAllocation).filter(MonthlyAllocation.monthly_finance_id.in_(
            select(MonthlyFinance.id).where(MonthlyFinance.user_id == user_id)
        )).delete(synchronize_session=False)
        self.db.query(MonthlySpending).filter(MonthlySpending.monthly_finance_id.in_(
            select(MonthlyFinance.id).where(MonthlyFinance.user_id == user_id)
        )).delete(synchronize_session=False)
        self.db.query(MonthlyFinance).filter(MonthlyFinance.user_id == user_id).delete(synchronize_session=False)
        self.db.commit()

        # 2. Create Bank Connections & Accounts
        conn_hdfc = FinancialConnection(
            id=uuid4(),
            user_id=user_id,
            provider="SETU_AA",
            status=ConnectionStatus.ACTIVE.value,
            last_synced_at=now - timedelta(minutes=14)
        )
        self.db.add(conn_hdfc)

        conn_icici = FinancialConnection(
            id=uuid4(),
            user_id=user_id,
            provider="SETU_AA",
            status=ConnectionStatus.ACTIVE.value,
            last_synced_at=now - timedelta(minutes=22)
        )
        self.db.add(conn_icici)

        # HDFC Account - Main Spending
        acc_hdfc = ConnectedAccount(
            id=uuid4(),
            user_id=user_id,
            connection_id=conn_hdfc.id,
            institution_name="HDFC Bank",
            account_type="SAVINGS",
            masked_account_number="**4821",
            purpose="main_spending",
            status="ACTIVE",
            opening_balance=Decimal("65000.00"),
            balance=Decimal("84500.00"),
            balance_status="SYNCED",
            balance_timestamp=now - timedelta(minutes=14),
            last_synced_at=now - timedelta(minutes=14)
        )
        self.db.add(acc_hdfc)

        # ICICI Account - Emergency Fund
        acc_icici = ConnectedAccount(
            id=uuid4(),
            user_id=user_id,
            connection_id=conn_icici.id,
            institution_name="ICICI Bank",
            account_type="SAVINGS",
            masked_account_number="**9012",
            purpose="emergency_fund",
            status="ACTIVE",
            opening_balance=Decimal("180000.00"),
            balance=Decimal("240000.00"),
            balance_status="SYNCED",
            balance_timestamp=now - timedelta(minutes=22),
            last_synced_at=now - timedelta(minutes=22)
        )
        self.db.add(acc_icici)

        # Consents
        consent_hdfc = FinancialConsent(
            id=uuid4(),
            user_id=user_id,
            connection_id=conn_hdfc.id,
            provider="SETU_AA",
            external_consent_id=f"setu_c_{uuid4().hex[:12]}",
            status=ConnectionStatus.ACTIVE.value,
            approved_at=now - timedelta(days=95),
            expires_at=now + timedelta(days=270)
        )
        self.db.add(consent_hdfc)

        consent_icici = FinancialConsent(
            id=uuid4(),
            user_id=user_id,
            connection_id=conn_icici.id,
            provider="SETU_AA",
            external_consent_id=f"setu_c_{uuid4().hex[:12]}",
            status=ConnectionStatus.ACTIVE.value,
            approved_at=now - timedelta(days=95),
            expires_at=now + timedelta(days=270)
        )
        self.db.add(consent_icici)
        self.db.commit()

        # 3. Income Pattern (so classification matches salary with high confidence)
        pattern = self.db.scalars(select(IncomePattern).where(
            IncomePattern.user_id == user_id,
            IncomePattern.narration_pattern == "INFOSYS TECHNOLOGIES"
        )).first()
        if not pattern:
            pattern = IncomePattern(
                id=uuid4(),
                user_id=user_id,
                narration_pattern="INFOSYS TECHNOLOGIES",
                merchant_name="Infosys Technologies Ltd",
                connected_account_id=acc_hdfc.id,
                typical_amount=Decimal("120000.00"),
                amount_tolerance=Decimal("24000.00"),
                frequency="MONTHLY",
                is_confirmed=True
            )
            self.db.add(pattern)
            self.db.commit()

        # 4. Goals
        goal_ef = Goal(
            id=uuid4(),
            user_id=user_id,
            title="Emergency Fund Reserve",
            target_amount=Decimal("300000.00"),
            current_amount=Decimal("240000.00"),
            target_date=date(curr_year + 1, 6, 30),
            status="active",
            goal_type="emergency_fund",
            category="EMERGENCY_FUND",
            linked_account_id=acc_icici.id,
            notes="6-month living expense runway in liquid ICICI savings account"
        )
        self.db.add(goal_ef)

        goal_trip = Goal(
            id=uuid4(),
            user_id=user_id,
            title="Japan Trip & PS5 Pro",
            target_amount=Decimal("150000.00"),
            current_amount=Decimal("45000.00"),
            target_date=date(curr_year + 1, 4, 15),
            status="active",
            goal_type="savings",
            category="VACATION",
            linked_account_id=acc_hdfc.id,
            notes="Tokyo autumn travel fund and gaming rig"
        )
        self.db.add(goal_trip)
        self.db.commit()

        # Contributions for goals
        for dt_m in [datetime(m1_year, m1_month, 5, tzinfo=timezone.utc), datetime(m2_year, m2_month, 5, tzinfo=timezone.utc), datetime(m3_year, m3_month, 5, tzinfo=timezone.utc)]:
            c1 = GoalContribution(
                id=uuid4(),
                goal_id=goal_ef.id,
                amount=Decimal("20000.00"),
                contributed_on=dt_m.date(),
                notes="Monthly allocation transfer from HDFC to ICICI"
            )
            c2 = GoalContribution(
                id=uuid4(),
                goal_id=goal_trip.id,
                amount=Decimal("15000.00"),
                contributed_on=dt_m.date(),
                notes="Earmarked from salary surplus"
            )
            self.db.add_all([c1, c2])

        # 5. Raw Transactions for 3 months
        # We will feed these through self.classifier.classify_transaction_dict
        raw_tx_specs = []

        months = [
            (m1_year, m1_month, "m1"),
            (m2_year, m2_month, "m2"),
            (m3_year, m3_month, "m3")
        ]

        for yr, mo, m_label in months:
            # 1st of month: Salary
            raw_tx_specs.append({
                "account_id": acc_hdfc.id,
                "txnId": f"TXN-SAL-{yr}-{mo}",
                "transactionTimestamp": datetime(yr, mo, 1, 10, 15, tzinfo=timezone.utc),
                "amount": 120000.00,
                "type": "CREDIT",
                "narration": "ACH CR-INFOSYS TECHNOLOGIES-SALARY OCT 2026",
                "currentBalance": 185000.00
            })

            # 3rd of month: Rent
            raw_tx_specs.append({
                "account_id": acc_hdfc.id,
                "txnId": f"TXN-RENT-{yr}-{mo}",
                "transactionTimestamp": datetime(yr, mo, 3, 11, 0, tzinfo=timezone.utc),
                "amount": 28000.00,
                "type": "DEBIT",
                "narration": "UPI-RAHUL SHARMA-RENT PAYMENT",
                "currentBalance": 157000.00
            })

            # 4th of month: Transfer from HDFC to ICICI (Savings/Emergency)
            raw_tx_specs.append({
                "account_id": acc_hdfc.id,
                "txnId": f"TXN-TRF-OUT-{yr}-{mo}",
                "transactionTimestamp": datetime(yr, mo, 4, 14, 30, tzinfo=timezone.utc),
                "amount": 20000.00,
                "type": "DEBIT",
                "narration": "IMPS-TRANSFER TO SELF ICICI A/C 9012",
                "currentBalance": 137000.00
            })
            raw_tx_specs.append({
                "account_id": acc_icici.id,
                "txnId": f"TXN-TRF-IN-{yr}-{mo}",
                "transactionTimestamp": datetime(yr, mo, 4, 14, 31, tzinfo=timezone.utc),
                "amount": 20000.00,
                "type": "CREDIT",
                "narration": "IMPS-TRANSFER FROM SELF HDFC A/C 4821",
                "currentBalance": 200000.00 if m_label == "m1" else (220000.00 if m_label == "m2" else 240000.00)
            })

            # 5th of month: SIP Zerodha
            raw_tx_specs.append({
                "account_id": acc_hdfc.id,
                "txnId": f"TXN-SIP-{yr}-{mo}",
                "transactionTimestamp": datetime(yr, mo, 5, 9, 30, tzinfo=timezone.utc),
                "amount": 15000.00,
                "type": "DEBIT",
                "narration": "ACH DR-ZERODHA BROKING-SIP PARAG PARIKH",
                "currentBalance": 122000.00
            })

            # Subscriptions
            # Spotify (₹119 on 8th)
            raw_tx_specs.append({
                "account_id": acc_hdfc.id,
                "txnId": f"TXN-SPOTIFY-{yr}-{mo}",
                "transactionTimestamp": datetime(yr, mo, 8, 8, 0, tzinfo=timezone.utc),
                "amount": 119.00,
                "type": "DEBIT",
                "narration": "SPOTIFY INDIA MONTHLY RECURRING",
                "currentBalance": 121881.00
            })

            # Cult.fit Gym (₹2,500 on 10th)
            raw_tx_specs.append({
                "account_id": acc_hdfc.id,
                "txnId": f"TXN-CULT-{yr}-{mo}",
                "transactionTimestamp": datetime(yr, mo, 10, 18, 0, tzinfo=timezone.utc),
                "amount": 2500.00,
                "type": "DEBIT",
                "narration": "CULT.FIT HEALTHCARE RECURRING SUBSCRIPTION",
                "currentBalance": 119381.00
            })

            # Netflix: ₹649 in months 1 & 2; price hike to ₹799 in month 3!
            netflix_amt = 799.00 if m_label == "m3" else 649.00
            raw_tx_specs.append({
                "account_id": acc_hdfc.id,
                "txnId": f"TXN-NETFLIX-{yr}-{mo}",
                "transactionTimestamp": datetime(yr, mo, 12, 12, 0, tzinfo=timezone.utc),
                "amount": netflix_amt,
                "type": "DEBIT",
                "narration": "NETFLIX ENTERTAINMENT SERVICES MONTHLY PLAN",
                "currentBalance": 118582.00
            })

            # Amazon Prime / Shopping
            raw_tx_specs.append({
                "account_id": acc_hdfc.id,
                "txnId": f"TXN-AMZN-{yr}-{mo}",
                "transactionTimestamp": datetime(yr, mo, 15, 16, 20, tzinfo=timezone.utc),
                "amount": 2499.00,
                "type": "DEBIT",
                "narration": "AMAZON RETAIL INDIA PURCHASE",
                "currentBalance": 116083.00
            })

            # Food / Dining: Swiggy, Zomato
            raw_tx_specs.append({
                "account_id": acc_hdfc.id,
                "txnId": f"TXN-SWIGGY-1-{yr}-{mo}",
                "transactionTimestamp": datetime(yr, mo, 7, 20, 30, tzinfo=timezone.utc),
                "amount": 640.00,
                "type": "DEBIT",
                "narration": "SWIGGY BANGALORE ORDER 98214",
                "currentBalance": 115443.00
            })
            raw_tx_specs.append({
                "account_id": acc_hdfc.id,
                "txnId": f"TXN-ZOMATO-1-{yr}-{mo}",
                "transactionTimestamp": datetime(yr, mo, 14, 21, 15, tzinfo=timezone.utc),
                "amount": 850.00,
                "type": "DEBIT",
                "narration": "ZOMATO ONLINE ORDER 4410",
                "currentBalance": 114593.00
            })
            raw_tx_specs.append({
                "account_id": acc_hdfc.id,
                "txnId": f"TXN-SWIGGY-2-{yr}-{mo}",
                "transactionTimestamp": datetime(yr, mo, 21, 13, 0, tzinfo=timezone.utc),
                "amount": 1240.00 if m_label == "m3" else 720.00,  # higher dining in m3
                "type": "DEBIT",
                "narration": "SWIGGY BANGALORE ORDER 10293",
                "currentBalance": 113353.00
            })

        # Special Month 2: Performance Bonus credit
        raw_tx_specs.append({
            "account_id": acc_hdfc.id,
            "txnId": f"TXN-BONUS-{m2_year}-{m2_month}",
            "transactionTimestamp": datetime(m2_year, m2_month, 20, 11, 45, tzinfo=timezone.utc),
            "amount": 45000.00,
            "type": "CREDIT",
            "narration": "ACH CR-INFOSYS-ANNUAL PERFORMANCE BONUS FY26",
            "currentBalance": 158353.00
        })

        # Special Month 3: Ambiguous Credit (UNCLASSIFIED)
        raw_tx_specs.append({
            "account_id": acc_hdfc.id,
            "txnId": f"TXN-AMBIGUOUS-{m3_year}-{m3_month}",
            "transactionTimestamp": datetime(m3_year, m3_month, 18, 15, 30, tzinfo=timezone.utc),
            "amount": 18500.00,
            "type": "CREDIT",
            "narration": "NEFT CR-KUMAR VIKAS-SETTLEMENT REF 892301",
            "currentBalance": 84500.00
        })

        # Ingest each transaction through real classification pipeline
        created_txs = []
        for raw in raw_tx_specs:
            acc_id = raw.pop("account_id")
            classified = self.classifier.classify_transaction_dict(user_id, acc_id, raw)
            
            # Special override for transfer narrations if classifier didn't catch
            if "TRANSFER TO SELF" in raw["narration"] or "TRANSFER FROM SELF" in raw["narration"]:
                classified["classification"] = "TRANSFER"
                classified["classification_status"] = "SYSTEM_CLASSIFIED"
                classified["category"] = "Transfer"
            elif "BONUS" in raw["narration"]:
                classified["classification"] = "INCOME"
                classified["classification_status"] = "SYSTEM_CLASSIFIED"
                classified["category"] = "Bonus"
            elif "AMBIGUOUS" in raw["txnId"]:
                classified["classification"] = "UNCLASSIFIED"
                classified["classification_status"] = "UNCLASSIFIED"
                classified["category"] = "Unclassified"
                classified["confidence"] = Decimal("0.30")

            tx_obj = BankTransaction(
                id=uuid4(),
                user_id=user_id,
                connected_account_id=acc_id,
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
                source="DEMO",
                balance_after_transaction=classified["balance_after_transaction"],
                reference_number=classified["reference_number"],
                account_purpose=classified["account_purpose"],
                dedupe_hash=classified["dedupe_hash"]
            )
            self.db.add(tx_obj)
            created_txs.append(tx_obj)

        self.db.commit()

        # 6. Investment Portfolio (Zerodha)
        assets = [
            {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd", "asset_type": "stock", "qty": Decimal("60"), "avg": Decimal("1520.00"), "cur": Decimal("1740.00")},
            {"symbol": "RELIANCE", "name": "Reliance Industries Ltd", "asset_type": "stock", "qty": Decimal("40"), "avg": Decimal("2650.00"), "cur": Decimal("2890.00")},
            {"symbol": "TCS", "name": "Tata Consultancy Services Ltd", "asset_type": "stock", "qty": Decimal("15"), "avg": Decimal("3800.00"), "cur": Decimal("4120.00")},
            {"symbol": "PPFAS_FLEXI", "name": "Parag Parikh Flexi Cap Regular Growth", "asset_type": "mutual_fund", "qty": Decimal("1250"), "avg": Decimal("62.50"), "cur": Decimal("78.40")},
        ]

        total_invested = Decimal("0")
        total_current = Decimal("0")

        for a in assets:
            master = self.db.scalars(select(AssetMaster).where(AssetMaster.symbol == a["symbol"])).first()
            if not master:
                master = AssetMaster(
                    id=uuid4(),
                    symbol=a["symbol"],
                    name=a["name"],
                    asset_type=a["asset_type"],
                    isin=f"IN{uuid4().hex[:10].upper()}",
                    current_price=a["cur"],
                    currency="INR",
                    is_active=True
                )
                self.db.add(master)
                self.db.commit()
                self.db.refresh(master)

            inv_holding = InvestmentHolding(
                id=uuid4(),
                user_id=user_id,
                asset_id=master.id,
                quantity=a["qty"],
                average_buy_price=a["avg"],
                total_invested_amount=a["qty"] * a["avg"],
                current_value=a["qty"] * a["cur"],
                unrealized_pnl=(a["qty"] * a["cur"]) - (a["qty"] * a["avg"]),
                unrealized_pnl_percent=(((a["cur"] - a["avg"]) / a["avg"]) * Decimal("100")).quantize(Decimal("0.01")),
                first_buy_date=date(m1_year, m1_month, 5),
                last_transaction_date=date(m3_year, m3_month, 5)
            )
            self.db.add(inv_holding)
            total_invested += inv_holding.total_invested_amount
            total_current += inv_holding.current_value

        # Snapshot
        snap = PortfolioSnapshot(
            id=uuid4(),
            user_id=user_id,
            snapshot_date=now.date(),
            total_invested=total_invested,
            total_current_value=total_current,
            unrealized_pnl=total_current - total_invested,
            unrealized_pnl_percent=(((total_current - total_invested) / total_invested) * Decimal("100")).quantize(Decimal("0.01")),
            asset_allocation_json={"stock": 72.8, "mutual_fund": 27.2}
        )
        self.db.add(snap)

        # 7. Monthly Finances for all 3 months
        finances = []
        for yr, mo, m_label in months:
            income_val = Decimal("165000.00") if m_label == "m2" else Decimal("120000.00")
            fin = MonthlyFinance(
                id=uuid4(),
                user_id=user_id,
                year=yr,
                month=mo,
                income=income_val,
                carryover=Decimal("0.00") if m_label == "m1" else Decimal("12400.00"),
                is_locked=(m_label != "m3")
            )
            self.db.add(fin)
            self.db.commit()
            self.db.refresh(fin)
            finances.append(fin)

            # Allocations
            allocs = [
                MonthlyAllocation(id=uuid4(), monthly_finance_id=fin.id, category="Rent", amount=Decimal("28000.00")),
                MonthlyAllocation(id=uuid4(), monthly_finance_id=fin.id, category="Emergency Fund", amount=Decimal("20000.00")),
                MonthlyAllocation(id=uuid4(), monthly_finance_id=fin.id, category="Investments", amount=Decimal("15000.00")),
                MonthlyAllocation(id=uuid4(), monthly_finance_id=fin.id, category="Savings", amount=Decimal("15000.00")),
                MonthlyAllocation(id=uuid4(), monthly_finance_id=fin.id, category="Subscriptions", amount=Decimal("5000.00")),
                MonthlyAllocation(id=uuid4(), monthly_finance_id=fin.id, category="Food & Dining", amount=Decimal("12000.00")),
                MonthlyAllocation(id=uuid4(), monthly_finance_id=fin.id, category="Shopping", amount=Decimal("8000.00")),
            ]
            self.db.add_all(allocs)

            # Spending actuals
            spendings = [
                MonthlySpending(id=uuid4(), monthly_finance_id=fin.id, category="Rent", amount=Decimal("28000.00")),
                MonthlySpending(id=uuid4(), monthly_finance_id=fin.id, category="Subscriptions", amount=Decimal("3418.00") if m_label != "m3" else Decimal("3568.00")),
                MonthlySpending(id=uuid4(), monthly_finance_id=fin.id, category="Food & Dining", amount=Decimal("9450.00") if m_label != "m3" else Decimal("14200.00")),
                MonthlySpending(id=uuid4(), monthly_finance_id=fin.id, category="Shopping", amount=Decimal("6200.00")),
            ]
            self.db.add_all(spendings)

        self.db.commit()

        return {
            "status": "success",
            "message": "Demo persona seeded successfully",
            "user_id": str(user_id),
            "accounts_created": 2,
            "goals_created": 2,
            "transactions_ingested": len(created_txs),
            "portfolio_value": float(total_current),
            "connected_cash": 84500.00 + 240000.00,
            "net_worth": float(total_current) + 84500.00 + 240000.00
        }

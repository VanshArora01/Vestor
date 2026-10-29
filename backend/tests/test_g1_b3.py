import pytest
from decimal import Decimal
from datetime import date, datetime, timezone, timedelta
from app.models.banking import FinancialConnection, ConnectedAccount, BankTransaction
from app.models.goal import Goal, GoalContribution
from app.services.goals_service import GoalsService
from app.services.banking_service import BankingService
from tests.conftest import create_user
from app.schemas.goals import CreateGoalRequest


def test_g1_multiple_goals_on_one_account(db):
    user = create_user(db, email="g1_multi@example.com")
    
    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="HDFC Bank",
        account_type="Savings",
        masked_account_number="6015",
        purpose="Savings",
        status="ACTIVE",
        balance=Decimal("100000.00")
    )
    db.add(account)
    db.commit()

    goals_service = GoalsService(db)
    banking_service = BankingService(db)

    # Create Goal 1 (PS5) linked to the account with ₹30,000 progress
    g1 = goals_service.create_goal(user, {
        "name": "PS5",
        "target_amount": "50000.00",
        "current_amount": "30000.00",
        "planned_monthly_contribution": "5000.00",
        "months_until_deadline": 10,
        "linked_account_id": str(account.id)
    })

    # Create Goal 2 (Laptop) linked to the same account with ₹20,000 progress
    g2 = goals_service.create_goal(user, {
        "name": "Laptop",
        "target_amount": "80000.00",
        "current_amount": "20000.00",
        "planned_monthly_contribution": "10000.00",
        "months_until_deadline": 10,
        "linked_account_id": str(account.id)
    })

    # Verify earmarks on the account
    earmarked, unallocated, over_allocated = banking_service.get_account_earmark_info(account)
    assert earmarked == Decimal("50000.00")
    assert unallocated == Decimal("50000.00")
    assert over_allocated == Decimal("0.00")

    # Verify physical account balance remains unchanged
    assert account.balance == Decimal("100000.00")


def test_g1_goal_progress_does_not_equal_earmark(db):
    user = create_user(db, email="g1_prog@example.com")
    
    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="ICICI Bank",
        account_type="Savings",
        masked_account_number="7721",
        purpose="Emergency Fund",
        status="ACTIVE",
        balance=Decimal("100000.00")
    )
    db.add(account)
    db.commit()

    goals_service = GoalsService(db)
    banking_service = BankingService(db)

    # Create a goal with ₹10,000 manually tracked starting amount, and THEN link the goal
    # Goal progress = ₹10,000. Earmarked amount = ₹0.
    goal_row = Goal(
        user_id=user.id,
        name="Fund",
        target_amount=Decimal("50000.00"),
        current_amount=Decimal("10000.00"),
        planned_monthly_contribution=Decimal("5000.00"),
        deadline=date.today() + timedelta(days=100),
        status="active",
        linked_account_id=account.id
    )
    db.add(goal_row)
    db.commit()

    # Earmarked should be 0 because no contributions are explicitly linked to the account yet
    earmarked, unallocated, over_allocated = banking_service.get_account_earmark_info(account)
    assert earmarked == Decimal("0.00")
    assert goal_row.current_amount == Decimal("10000.00")


def test_g1_over_allocation_detected(db):
    user = create_user(db, email="g1_over@example.com")
    
    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="SBI Bank",
        account_type="Savings",
        masked_account_number="9999",
        purpose="Savings",
        status="ACTIVE",
        balance=Decimal("40000.00")
    )
    db.add(account)
    db.commit()

    goals_service = GoalsService(db)
    banking_service = BankingService(db)

    # Create Goal linked to account with ₹50,000 progress (which exceeds account balance of ₹40,000)
    goals_service.create_goal(user, {
        "name": "Overdraft",
        "target_amount": "100000.00",
        "current_amount": "50000.00",
        "planned_monthly_contribution": "10000.00",
        "months_until_deadline": 10,
        "linked_account_id": str(account.id)
    })

    earmarked, unallocated, over_allocated = banking_service.get_account_earmark_info(account)
    assert earmarked == Decimal("50000.00")
    assert unallocated == Decimal("-10000.00")
    assert over_allocated == Decimal("10000.00")


def test_b3_conservative_classification(db):
    user = create_user(db, email="b3_class@example.com")
    
    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="SBI Bank",
        account_type="Savings",
        masked_account_number="9999",
        purpose="Savings",
        status="ACTIVE",
        balance=Decimal("40000.00")
    )
    db.add(account)
    db.commit()

    service = BankingService(db)

    raw_txs = [
        # Salary Credit
        {"txnId": "tx1", "transactionTimestamp": "2026-08-22T10:00:00Z", "amount": 50000, "type": "CREDIT", "narration": "OFFICE SALARY AUG"},
        # Investment Debit
        {"txnId": "tx2", "transactionTimestamp": "2026-08-22T11:00:00Z", "amount": 10000, "type": "DEBIT", "narration": "ZERODHA MUTUAL FUND INVESTMENT"},
        # Fee Debit
        {"txnId": "tx3", "transactionTimestamp": "2026-08-22T12:00:00Z", "amount": 20, "type": "DEBIT", "narration": "SMS CHARGE FEE"},
        # Known merchant Swiggy
        {"txnId": "tx4", "transactionTimestamp": "2026-08-22T13:00:00Z", "amount": 650, "type": "DEBIT", "narration": "UPI SWIGGY FOOD"},
        # Unknown debit
        {"txnId": "tx5", "transactionTimestamp": "2026-08-22T14:00:00Z", "amount": 2500, "type": "DEBIT", "narration": "SOME RANDOM DEBIT"}
    ]

    normalized = service._normalize_transactions(user.id, account.id, raw_txs)
    
    # 1. Salary
    assert normalized[0]["classification"] == "INCOME"
    assert normalized[0]["confidence"] == Decimal("0.95")
    assert normalized[0]["category"] == "Salary"

    # 2. Investment
    assert normalized[1]["classification"] == "INVESTMENT"
    assert normalized[1]["confidence"] == Decimal("0.95")
    assert normalized[1]["category"] == "Investment"

    # 3. Fee
    assert normalized[2]["classification"] == "FEE"
    assert normalized[2]["confidence"] == Decimal("0.95")
    assert normalized[2]["category"] == "Fee"

    # 4. Swiggy Expense
    assert normalized[3]["classification"] == "EXPENSE"
    assert normalized[3]["confidence"] == Decimal("0.95")
    assert normalized[3]["category"] == "Food"
    assert normalized[3]["merchant_name"] == "Swiggy"

    # 5. Unknown Debit (must remain UNCLASSIFIED)
    assert normalized[4]["classification"] == "UNCLASSIFIED"
    assert normalized[4]["confidence"] == Decimal("0.00")
    assert normalized[4]["category"] == "Unclassified"


def test_b3_transfer_matching(db):
    user = create_user(db, email="b3_transfer@example.com")
    
    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    # Create account A
    account_a = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="HDFC",
        account_type="Savings",
        masked_account_number="6015",
        status="ACTIVE",
        balance=Decimal("100000.00")
    )
    # Create account B
    account_b = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="SBI",
        account_type="Savings",
        masked_account_number="9999",
        status="ACTIVE",
        balance=Decimal("50000.00")
    )
    db.add(account_a)
    db.add(account_b)
    db.commit()

    service = BankingService(db)

    # Insert transactions
    # 1. Matching pair (Transfer)
    tx1_data = {"txnId": "t1", "transactionTimestamp": "2026-08-22T10:00:00Z", "amount": 10000, "type": "DEBIT", "narration": "UPI TRANSFER TO SBI", "referenceNumber": "ref123"}
    tx2_data = {"txnId": "t2", "transactionTimestamp": "2026-08-22T10:30:00Z", "amount": 10000, "type": "CREDIT", "narration": "UPI TRANSFER FROM HDFC", "referenceNumber": "ref123"}

    # 2. Ambiguous pair (one debit, one credit, same amount, within 48h, but no reference number/transfer keywords, e.g. unknown debit and credit)
    tx3_data = {"txnId": "t3", "transactionTimestamp": "2026-08-22T12:00:00Z", "amount": 5000, "type": "DEBIT", "narration": "PAYMENT"}
    tx4_data = {"txnId": "t4", "transactionTimestamp": "2026-08-22T12:15:00Z", "amount": 5000, "type": "CREDIT", "narration": "DEPOSIT"}

    norm_a = service._normalize_transactions(user.id, account_a.id, [tx1_data, tx3_data])
    norm_b = service._normalize_transactions(user.id, account_b.id, [tx2_data, tx4_data])

    service.repo.upsert_bank_transactions(norm_a)
    service.repo.upsert_bank_transactions(norm_b)

    # Run intelligence matcher
    service.run_transaction_intelligence(user.id)

    # Re-fetch from db
    transactions = db.query(BankTransaction).filter(BankTransaction.user_id == user.id).all()

    tx1 = next(t for t in transactions if t.provider_transaction_id == "t1")
    tx2 = next(t for t in transactions if t.provider_transaction_id == "t2")
    tx3 = next(t for t in transactions if t.provider_transaction_id == "t3")
    tx4 = next(t for t in transactions if t.provider_transaction_id == "t4")

    # Match Transfer (tx1 <-> tx2)
    assert tx1.classification == "TRANSFER"
    assert tx1.category == "Transfer"
    assert tx2.classification == "TRANSFER"
    assert tx2.category == "Transfer"

    # Ambiguous Pair should remain UNCLASSIFIED
    assert tx3.classification == "UNCLASSIFIED"
    assert tx4.classification == "UNCLASSIFIED"


def test_b3_user_correction_and_repeated_sync(db):
    user = create_user(db, email="b3_correct@example.com")
    
    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="SBI",
        account_type="Savings",
        masked_account_number="9999",
        status="ACTIVE",
        balance=Decimal("50000.00")
    )
    db.add(account)
    db.commit()

    service = BankingService(db)

    tx_data = {"txnId": "t1", "transactionTimestamp": "2026-08-22T10:00:00Z", "amount": 1000, "type": "DEBIT", "narration": "RANDOM"}
    norm = service._normalize_transactions(user.id, account.id, [tx_data])
    inserted = service.repo.upsert_bank_transactions(norm)
    tx = inserted[0]

    # Initially UNCLASSIFIED
    assert tx.classification == "UNCLASSIFIED"
    
    # User corrects it to EXPENSE / Food
    tx.classification = "EXPENSE"
    tx.category = "Food"
    tx.classification_status = "USER_CORRECTED"
    tx.classification_source = "USER"
    tx.confidence = Decimal("1.00")
    db.commit()

    # Re-normalize and sync again to verify it is deterministic and doesn't overwrite user correction
    norm_again = service._normalize_transactions(user.id, account.id, [tx_data])
    inserted_again = service.repo.upsert_bank_transactions(norm_again)
    tx_again = inserted_again[0]

    assert tx_again.classification == "EXPENSE"
    assert tx_again.category == "Food"
    assert tx_again.classification_status == "USER_CORRECTED"
    assert tx_again.classification_source == "USER"


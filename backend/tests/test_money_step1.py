import pytest
from decimal import Decimal
from datetime import date, datetime, timezone, timedelta
from app.models.banking import FinancialConnection, ConnectedAccount, BankTransaction
from app.models.money import MonthlyFinance, MonthlyAllocation, MonthlySpending, IncomePattern, AllocationCategory
from app.services.money_service import MoneyService
from app.services.banking_service import BankingService
from tests.conftest import create_user


def test_manual_income_behavior(db):
    # 1. Manual User (no connected accounts)
    user = create_user(db, email="step1_manual@example.com")
    service = MoneyService(db)
    
    # Set manual income
    res = service.set_income(user, 2026, 8, "100000.00")
    
    # Available to Plan = carryover (0) + manual income (100,000) = 100,000
    assert res["income"] == "100000.00"
    assert res["metrics"]["available_to_plan"] == "100000.00"
    assert res["metrics"]["unallocated"] == "100000.00"
    assert res["is_connected"] is False


def test_connected_income_from_transactions(db):
    # 2. Connected User (has connected accounts)
    user = create_user(db, email="step1_connected@example.com")
    
    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="HDFC",
        account_type="Savings",
        masked_account_number="9999",
        status="ACTIVE",
        balance=Decimal("150000.00")
    )
    db.add(account)
    db.flush()

    # Existing account balance should NOT count as income
    service = MoneyService(db)
    res_initial = service.get_month(user, 2026, 8)
    assert res_initial["is_connected"] is True
    # Confirmed income should be 0, available to plan 0
    assert res_initial["income"] == "0.00"
    assert res_initial["metrics"]["available_to_plan"] == "0.00"
    
    # Add a user confirmed income transaction
    tx = BankTransaction(
        user_id=user.id,
        connected_account_id=account.id,
        provider_transaction_id="tx_sal_1",
        transaction_timestamp=datetime(2026, 8, 1, 10, 0, 0, tzinfo=timezone.utc),
        amount=Decimal("100000.00"),
        transaction_type="CREDIT",
        dedupe_hash="hash_sal_1",
        classification="INCOME",
        classification_status="USER_CONFIRMED", # Confirmed!
        source="SETU"
    )
    db.add(tx)
    db.commit()

    res_after = service.get_month(user, 2026, 8)
    assert res_after["income"] == "100000.00"
    assert res_after["metrics"]["available_to_plan"] == "100000.00"


def test_opening_balance_preserved(db):
    # 3. Existing account balance not counted as income, 4. opening balance preserved
    user = create_user(db, email="step1_opening@example.com")
    repo = BankingService(db).repo
    
    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    # Link account with initial balance available
    accounts = repo.create_connected_accounts(
        connection.id, user.id,
        [{"maskedAccNumber": "123456781234", "accType": "SAVINGS", "fipName": "HDFC", "balance": "150000.00"}]
    )
    
    # Check that opening balance was stored and frozen immediately
    account = accounts[0]
    assert account.opening_balance == Decimal("150000.00")
    assert account.balance == Decimal("150000.00")

    # Simulate subsequent sync with new balance
    repo.update_account_sync_state(account, balance=Decimal("160000.00"))
    db.refresh(account)
    
    # opening_balance must remain frozen at initial value
    assert account.opening_balance == Decimal("150000.00")
    assert account.balance == Decimal("160000.00")


def test_salary_detection_and_pattern_recognition(db):
    # 5. First-time salary confirmation, 6. Confirmed salary pattern reused
    user = create_user(db, email="step1_patterns@example.com")
    
    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="HDFC",
        account_type="Savings",
        masked_account_number="1234",
        status="ACTIVE"
    )
    db.add(account)
    db.flush()

    # Mock new sync return with a Salary narration credit
    from app.services.banking_service import BankingService
    bank_service = BankingService(db)
    
    raw_txs = [
        {
            "txnId": "tx_detect_1",
            "transactionTimestamp": "2026-08-01T10:00:00Z",
            "amount": "120000.00",
            "type": "CREDIT",
            "narration": "OFFICE SALARY AUG 2026",
            "mode": "NEFT"
        }
    ]
    
    # Normalize
    normalized = bank_service._normalize_transactions(user.id, account.id, raw_txs)
    assert len(normalized) == 1
    # First time: detected but SYSTEM_CLASSIFIED (pending user confirmation)
    assert normalized[0]["classification"] == "INCOME"
    assert normalized[0]["classification_status"] == "SYSTEM_CLASSIFIED"
    
    # Save the transaction in DB
    tx_db = BankTransaction(**normalized[0])
    db.add(tx_db)
    db.commit()

    # Verify that the unconfirmed candidate does not count toward monthly income yet
    money_service = MoneyService(db)
    res_unconfirmed = money_service.get_month(user, 2026, 8)
    assert res_unconfirmed["income"] == "0.00"
    assert len(res_unconfirmed["income_candidates"]) == 1
    assert res_unconfirmed["income_candidates"][0]["id"] == str(tx_db.id)

    # 5. Confirm the transaction (via API endpoint logic)
    # Call PATCH `/transactions/{id}/classification` logic
    from app.api.v1.endpoints.banking import update_transaction_classification
    from app.schemas.banking import ClassificationUpdateRequest
    
    class FakePayload:
        classification = "INCOME"
        category = "Salary"
        
    db_tx_refreshed = db.get(BankTransaction, tx_db.id)
    # Simulate update classification endpoint
    db_tx_refreshed.classification = "INCOME"
    db_tx_refreshed.classification_status = "USER_CORRECTED"
    db_tx_refreshed.classification_source = "USER"
    # Execute trigger logic directly:
    pattern = IncomePattern(
        user_id=user.id,
        narration_pattern=db_tx_refreshed.narration,
        typical_amount=db_tx_refreshed.amount,
        amount_tolerance=db_tx_refreshed.amount * Decimal("0.20"),
        is_confirmed=True
    )
    db.add(pattern)
    db.commit()

    # Now verify income is confirmed and candidates is empty
    res_confirmed = money_service.get_month(user, 2026, 8)
    assert res_confirmed["income"] == "120000.00"
    assert len(res_confirmed["income_candidates"]) == 0

    # 6. Subsequent sync with matching pattern must be auto-recognized as confirmed income
    subsequent_raw = [
        {
            "txnId": "tx_detect_2",
            "transactionTimestamp": "2026-09-01T10:00:00Z",
            "amount": "122000.00", # reasonable variation (+1.6% within 20% tolerance)
            "type": "CREDIT",
            "narration": "OFFICE SALARY AUG 2026", # matches exact narration substring pattern
            "mode": "NEFT"
        }
    ]
    normalized_subseq = bank_service._normalize_transactions(user.id, account.id, subsequent_raw)
    assert len(normalized_subseq) == 1
    # Auto recognized!
    assert normalized_subseq[0]["classification"] == "INCOME"
    assert normalized_subseq[0]["classification_status"] == "USER_CONFIRMED"
    assert normalized_subseq[0]["classification_source"] == "PATTERN"


def test_multiple_income_transactions(db):
    # 7. Multiple income transactions
    user = create_user(db, email="step1_multi_inc@example.com")
    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="HDFC",
        account_type="Savings",
        masked_account_number="1234",
        status="ACTIVE"
    )
    db.add(account)
    db.flush()

    tx1 = BankTransaction(
        user_id=user.id,
        connected_account_id=account.id,
        provider_transaction_id="tx_m1",
        transaction_timestamp=datetime(2026, 8, 1, 10, 0, 0, tzinfo=timezone.utc),
        amount=Decimal("40000.00"),
        transaction_type="CREDIT",
        dedupe_hash="hash_m1",
        classification="INCOME",
        classification_status="USER_CONFIRMED",
        source="SETU"
    )
    tx2 = BankTransaction(
        user_id=user.id,
        connected_account_id=account.id,
        provider_transaction_id="tx_m2",
        transaction_timestamp=datetime(2026, 8, 15, 10, 0, 0, tzinfo=timezone.utc),
        amount=Decimal("15000.00"),
        transaction_type="CREDIT",
        dedupe_hash="hash_m2",
        classification="INCOME",
        classification_status="USER_CORRECTED",
        source="SETU"
    )
    db.add_all([tx1, tx2])
    db.commit()

    service = MoneyService(db)
    res = service.get_month(user, 2026, 8)
    # Sum of confirmed income: 40,000 + 15,000 = 55,000
    assert res["income"] == "55000.00"


def test_mid_month_incomplete_history_notice(db):
    # 8. Mid-month connection with sufficient / 9. without history
    user = create_user(db, email="step1_incomplete@example.com")
    
    # Connect bank mid-month (August 22nd)
    connection = FinancialConnection(
        user_id=user.id, 
        provider="SETU_AA", 
        status="ACTIVE",
        created_at=datetime(2026, 8, 22, 12, 0, 0, tzinfo=timezone.utc)
    )
    db.add(connection)
    db.flush()

    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="HDFC",
        account_type="Savings",
        masked_account_number="1234",
        status="ACTIVE"
    )
    db.add(account)
    db.flush()

    service = MoneyService(db)
    res = service.get_month(user, 2026, 8)
    
    # Connection created_at is 2026-08-22 (after 2026-08-01), so history is incomplete!
    assert res["is_history_incomplete"] is True


def test_carryover_calculations(db):
    # 10. Positive carryover / 11. Negative carryover / 12. ATP / 13. Unallocated / 16. Lock month
    user = create_user(db, email="step1_carryover@example.com")
    service = MoneyService(db)

    # August (M-1): Set manual income ₹1,00,000
    service.set_income(user, 2026, 8, "100000.00")
    
    # Plan allocations ₹80,000 (Surplus/unallocated = ₹20,000)
    cat = db.query(AllocationCategory).filter(AllocationCategory.slug == "others").first()
    service.set_allocation(user, 2026, 8, [{"category_id": str(cat.id), "amount": "80000.00"}])
    
    # Lock August (locks and saves September carryover snapshot as ₹20,000)
    service.lock_month_service(user, 2026, 8)
    
    # September (M): Carryover ₹20,000 left over from August
    # September manual income ₹1,00,000
    service.set_income(user, 2026, 9, "100000.00")
    
    res = service.get_month(user, 2026, 9)
    assert res["metrics"]["carryover"] == "20000.00"
    assert res["metrics"]["income"] == "100000.00"
    # Available to Plan = carryover (20,000) + income (100,000) = 120,000
    assert res["metrics"]["available_to_plan"] == "120000.00"
    # Unallocated before September planning is ₹1,20,000
    assert res["metrics"]["unallocated"] == "120000.00"
    
    # Test 11. Negative Carryover
    # Plan September allocations to ₹1,20,000 (perfectly matches available_to_plan ₹120,000)
    service.set_allocation(user, 2026, 9, [{"category_id": str(cat.id), "amount": "120000.00"}])
    
    # Directly modify/decrease September manual income in the DB to ₹95,000
    sep_record = db.query(MonthlyFinance).filter(
        MonthlyFinance.user_id == user.id,
        MonthlyFinance.year == 2026,
        MonthlyFinance.month == 9
    ).first()
    sep_record.income = Decimal("95000.00")
    db.add(sep_record)
    db.commit()
    
    # Lock September (locks and saves October carryover snapshot as -₹5,000)
    service.lock_month_service(user, 2026, 9)
    
    # October (M+1): Carryover -₹5,000
    # October manual income ₹1,00,000
    service.set_income(user, 2026, 10, "100000.00")
    
    res_oct = service.get_month(user, 2026, 10)
    assert res_oct["metrics"]["carryover"] == "-5000.00"
    assert res_oct["metrics"]["available_to_plan"] == "95000.00"


def test_manual_adjustment(db):
    # 14. Manual adjustment
    user = create_user(db, email="step1_adjustment@example.com")
    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="HDFC",
        account_type="Savings",
        masked_account_number="1234",
        status="ACTIVE"
    )
    db.add(account)
    db.flush()

    # Simulate mid-month connection with missing transaction portion
    # Provide manual adjustment of ₹30,000
    service = MoneyService(db)
    res = service.set_income(user, 2026, 8, "30000.00")
    
    assert res["metrics"]["manual_income_adjustment"] == "30000.00"
    assert res["metrics"]["available_to_plan"] == "30000.00"


def test_manual_to_connected_transition(db):
    # 15. Manual -> connected transition
    user = create_user(db, email="step1_transition@example.com")
    service = MoneyService(db)
    
    # User starts manual: enters ₹50,000 income
    service.set_income(user, 2026, 8, "50000.00")
    res_manual = service.get_month(user, 2026, 8)
    assert res_manual["is_connected"] is False
    assert res_manual["income"] == "50000.00"
    
    # Later connects accounts
    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()
    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="HDFC",
        account_type="Savings",
        masked_account_number="1234",
        status="ACTIVE"
    )
    db.add(account)
    db.flush()
    
    # Add connected income transaction of ₹60,000
    tx = BankTransaction(
        user_id=user.id,
        connected_account_id=account.id,
        provider_transaction_id="tx_trans_1",
        transaction_timestamp=datetime(2026, 8, 10, 10, 0, 0, tzinfo=timezone.utc),
        amount=Decimal("6000.00"),
        transaction_type="CREDIT",
        dedupe_hash="hash_trans_1",
        classification="INCOME",
        classification_status="USER_CONFIRMED",
        source="SETU"
    )
    db.add(tx)
    db.commit()
    
    res_connected = service.get_month(user, 2026, 8)
    assert res_connected["is_connected"] is True
    # Displays connected income (6000.00) instead of manual income (50,000)
    # The manual income from the transition is preserved on the DB object but not displayed as connected income.
    assert res_connected["income"] == "6000.00"


def test_user_isolation(db):
    # 17. User isolation
    user1 = create_user(db, email="step1_isolation1@example.com")
    user2 = create_user(db, email="step1_isolation2@example.com")
    
    service = MoneyService(db)
    
    # Set user1 income
    service.set_income(user1, 2026, 8, "50000.00")
    
    # Retrieve user2 month state
    res2 = service.get_month(user2, 2026, 8)
    # Should not see user1's income
    assert res2["income"] == "0.00"

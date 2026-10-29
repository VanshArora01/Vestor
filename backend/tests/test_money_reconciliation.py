import pytest
from decimal import Decimal
from datetime import date, datetime, timezone, timedelta
from app.models.banking import FinancialConnection, ConnectedAccount, BankTransaction
from app.models.goal import Goal, GoalContribution
from app.models.money import MonthlyFinance, MonthlyAllocation, MonthlySpending, AllocationCategory, SpendingCategory
from app.services.money_reconciliation_service import MoneyReconciliationService
from tests.conftest import create_user


def test_reconciliation_manual_vs_verified_goal(db):
    user = create_user(db, email="recon_goal@example.com")
    
    # 1. Create a connected goal
    conn_goal = Goal(
        user_id=user.id,
        name="Connected Car",
        target_amount=Decimal("10000.00"),
        current_amount=Decimal("5000.00"),
        planned_monthly_contribution=Decimal("1000.00"),
        deadline=date.today() + timedelta(days=100),
        status="active",
        linked_account_id=None # will simulate connection
    )
    db.add(conn_goal)
    db.flush()

    # Link to account
    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="HDFC",
        account_type="Savings",
        masked_account_number="1111",
        purpose="Savings",
        status="ACTIVE",
        balance=Decimal("50000.00")
    )
    db.add(account)
    db.flush()
    conn_goal.linked_account_id = account.id

    # 2. Create a manual goal
    manual_goal = Goal(
        user_id=user.id,
        name="Manual Bike",
        target_amount=Decimal("5000.00"),
        current_amount=Decimal("2000.00"),
        planned_monthly_contribution=Decimal("500.00"),
        deadline=date.today() + timedelta(days=100),
        status="active"
    )
    db.add(manual_goal)
    db.flush()

    # 3. Add Goal Contributions in August 2026
    # Verified transaction contribution for connected goal
    tx = BankTransaction(
        user_id=user.id,
        connected_account_id=account.id,
        provider_transaction_id="tx123",
        transaction_timestamp=datetime(2026, 8, 15, 12, 0, 0, tzinfo=timezone.utc),
        amount=Decimal("1500.00"),
        transaction_type="DEBIT",
        dedupe_hash="hash1",
        classification="TRANSFER",
        source="SETU"
    )
    db.add(tx)
    db.flush()

    c1 = GoalContribution(
        goal_id=conn_goal.id,
        amount=Decimal("1500.00"),
        contributed_on=date(2026, 8, 15),
        source="verified",
        linked_account_id=account.id,
        bank_transaction_id=tx.id
    )
    # Manual unverified contribution (should be ignored for connected goal actuals)
    c2 = GoalContribution(
        goal_id=conn_goal.id,
        amount=Decimal("800.00"),
        contributed_on=date(2026, 8, 16),
        source="manual",
        linked_account_id=None
    )
    # Manual contribution for manual goal (should count)
    c3 = GoalContribution(
        goal_id=manual_goal.id,
        amount=Decimal("400.00"),
        contributed_on=date(2026, 8, 17),
        source="manual",
        linked_account_id=None
    )
    db.add_all([c1, c2, c3])
    db.flush()

    # 4. Create monthly plan
    finance = MonthlyFinance(user_id=user.id, year=2026, month=8, income=Decimal("10000.00"), currency="INR")
    db.add(finance)
    db.flush()

    alloc1 = MonthlyAllocation(monthly_finance_id=finance.id, goal_id=conn_goal.id, amount=Decimal("2000.00"))
    alloc2 = MonthlyAllocation(monthly_finance_id=finance.id, goal_id=manual_goal.id, amount=Decimal("1000.00"))
    db.add_all([alloc1, alloc2])
    db.commit()

    service = MoneyReconciliationService(db)
    res = service.reconcile_month(user.id, 2026, 8)

    # Reconciled item checks
    conn_item = next(item for item in res["items"] if item["category_slug"] == f"goal-{conn_goal.id}")
    manual_item = next(item for item in res["items"] if item["category_slug"] == f"goal-{manual_goal.id}")

    # Connected goal actual should only sum verified contribution (1500.00), not the manual one (800.00)
    assert conn_item["actual"] == Decimal("1500.00")
    assert conn_item["provenance"] == "CONNECTED_ACCOUNT"
    assert conn_item["status"] == "IN_PROGRESS"

    # Manual goal actual sums manual contribution (400.00) and has MANUAL provenance
    assert manual_item["actual"] == Decimal("400.00")
    assert manual_item["provenance"] == "MANUAL"
    assert manual_item["status"] == "IN_PROGRESS"


def test_reconciliation_account_purpose_history(db):
    user = create_user(db, email="recon_hist@example.com")

    # Set up accounts
    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="SBI",
        account_type="Savings",
        masked_account_number="2222",
        purpose="Savings",
        status="ACTIVE",
        balance=Decimal("25000.00")
    )
    db.add(account)
    db.commit()

    # 1. Add transfer transaction when SBI purpose was 'Savings'
    tx1 = BankTransaction(
        user_id=user.id,
        connected_account_id=account.id,
        provider_transaction_id="tx_hist_1",
        transaction_timestamp=datetime(2026, 8, 10, 10, 0, 0, tzinfo=timezone.utc),
        amount=Decimal("5000.00"),
        transaction_type="CREDIT",
        dedupe_hash="hash_h1",
        classification="TRANSFER",
        account_purpose="Savings", # Snapshotted historical purpose
        source="SETU"
    )
    db.add(tx1)
    db.commit()

    # Change SBI purpose to 'Main / Spending'
    account.purpose = "Main / Spending"
    db.commit()

    # 2. Add second transaction (its purpose gets snapshotted as Main / Spending)
    tx2 = BankTransaction(
        user_id=user.id,
        connected_account_id=account.id,
        provider_transaction_id="tx_hist_2",
        transaction_timestamp=datetime(2026, 8, 20, 10, 0, 0, tzinfo=timezone.utc),
        amount=Decimal("3000.00"),
        transaction_type="CREDIT",
        dedupe_hash="hash_h2",
        classification="TRANSFER",
        account_purpose="Main / Spending", # Snapshotted purpose
        source="SETU"
    )
    db.add(tx2)
    db.commit()

    # Reconcile savings category (which matches purpose == "Savings")
    finance = MonthlyFinance(user_id=user.id, year=2026, month=8, income=Decimal("10000.00"), currency="INR")
    db.add(finance)
    db.flush()

    cat = AllocationCategory(name="Savings", slug="savings", semantic_type="savings")
    db.add(cat)
    db.flush()

    alloc = MonthlyAllocation(monthly_finance_id=finance.id, category_id=cat.id, amount=Decimal("10000.00"))
    db.add(alloc)
    db.commit()

    service = MoneyReconciliationService(db)
    res = service.reconcile_month(user.id, 2026, 8)

    savings_item = next(item for item in res["items"] if item["category_slug"] == "savings")
    # Verified savings transfers must only count tx1 (5000.00), not tx2 (3000.00) because tx2 purpose changed.
    assert savings_item["actual"] == Decimal("5000.00")


def test_reconciliation_unknown_expense_unclassified(db):
    user = create_user(db, email="recon_unclass@example.com")

    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="SBI",
        account_type="Savings",
        masked_account_number="2222",
        purpose="Main / Spending",
        status="ACTIVE",
        balance=Decimal("25000.00")
    )
    db.add(account)
    db.flush()

    # Known expense
    tx1 = BankTransaction(
        user_id=user.id,
        connected_account_id=account.id,
        provider_transaction_id="tx_exp_1",
        transaction_timestamp=datetime(2026, 8, 10, 10, 0, 0, tzinfo=timezone.utc),
        amount=Decimal("450.00"),
        transaction_type="DEBIT",
        dedupe_hash="hash_e1",
        classification="EXPENSE",
        category="Food",
        merchant_name="Swiggy",
        source="SETU"
    )
    # Unknown expense
    tx2 = BankTransaction(
        user_id=user.id,
        connected_account_id=account.id,
        provider_transaction_id="tx_exp_2",
        transaction_timestamp=datetime(2026, 8, 12, 10, 0, 0, tzinfo=timezone.utc),
        amount=Decimal("2000.00"),
        transaction_type="DEBIT",
        dedupe_hash="hash_e2",
        classification="EXPENSE",
        category="Unclassified",
        source="SETU"
    )
    db.add_all([tx1, tx2])
    db.flush()

    # Create monthly plan
    finance = MonthlyFinance(user_id=user.id, year=2026, month=8, income=Decimal("10000.00"), currency="INR")
    db.add(finance)
    db.flush()

    cat = SpendingCategory(name="Food", slug="food")
    cat_others = SpendingCategory(name="Others", slug="others", is_others=True)
    db.add_all([cat, cat_others])
    db.flush()

    spend1 = MonthlySpending(monthly_finance_id=finance.id, category_id=cat.id, amount=Decimal("1000.00"))
    spend2 = MonthlySpending(monthly_finance_id=finance.id, category_id=cat_others.id, amount=Decimal("2000.00"))
    db.add_all([spend1, spend2])
    db.commit()

    service = MoneyReconciliationService(db)
    res = service.reconcile_month(user.id, 2026, 8)

    food_item = next(item for item in res["items"] if item["category_slug"] == "food")
    others_item = next(item for item in res["items"] if item["category_slug"] == "others")
    unclassified_item = next(item for item in res["items"] if item["category_slug"] == "unclassified-spending")

    # 1. Food maps to tx1 (450.00)
    assert food_item["actual"] == Decimal("450.00")

    # 2. Others category should NOT contain the unclassified transaction (so remains 0.00)
    assert others_item["actual"] == Decimal("0.00")

    # 3. Unclassified item contains the unknown expense tx2 (2000.00)
    assert unclassified_item["actual"] == Decimal("2000.00")
    assert unclassified_item["status"] == "OVER_PLAN"


def test_reconciliation_investment_unresolved(db):
    user = create_user(db, email="recon_invest@example.com")

    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="SBI",
        account_type="Savings",
        masked_account_number="2222",
        status="ACTIVE",
        balance=Decimal("25000.00")
    )
    db.add(account)
    db.flush()

    # Mapped investment
    tx1 = BankTransaction(
        user_id=user.id,
        connected_account_id=account.id,
        provider_transaction_id="tx_inv_1",
        transaction_timestamp=datetime(2026, 8, 10, 10, 0, 0, tzinfo=timezone.utc),
        amount=Decimal("3000.00"),
        transaction_type="DEBIT",
        dedupe_hash="hash_i1",
        classification="INVESTMENT",
        category="Stocks",
        narration="ZERODHA INVESTMENT",
        source="SETU"
    )
    # Unresolved investment (generic category/narration)
    tx2 = BankTransaction(
        user_id=user.id,
        connected_account_id=account.id,
        provider_transaction_id="tx_inv_2",
        transaction_timestamp=datetime(2026, 8, 12, 10, 0, 0, tzinfo=timezone.utc),
        amount=Decimal("1200.00"),
        transaction_type="DEBIT",
        dedupe_hash="hash_i2",
        classification="INVESTMENT",
        category="Investment",
        narration="SOME SECURITIES PURCHASE",
        source="SETU"
    )
    db.add_all([tx1, tx2])
    db.flush()

    finance = MonthlyFinance(user_id=user.id, year=2026, month=8, income=Decimal("10000.00"), currency="INR")
    db.add(finance)
    db.flush()

    cat = AllocationCategory(name="Stocks", slug="stocks", semantic_type="investment")
    db.add(cat)
    db.flush()

    alloc = MonthlyAllocation(monthly_finance_id=finance.id, category_id=cat.id, amount=Decimal("5000.00"))
    db.add(alloc)
    db.commit()

    service = MoneyReconciliationService(db)
    res = service.reconcile_month(user.id, 2026, 8)

    stocks_item = next(item for item in res["items"] if item["category_slug"] == "stocks")
    unresolved_item = next(item for item in res["items"] if item["category_slug"] == "unresolved-investment")

    # Stocks maps to Zerodha transaction (3000.00)
    assert stocks_item["actual"] == Decimal("3000.00")

    # Unresolved investments contains tx2 (1200.00)
    assert unresolved_item["actual"] == Decimal("1200.00")


def test_reconciliation_unavailable_vs_not_started(db):
    user = create_user(db, email="recon_unav@example.com")

    finance = MonthlyFinance(user_id=user.id, year=2026, month=8, income=Decimal("10000.00"), currency="INR")
    db.add(finance)
    db.flush()

    cat = AllocationCategory(name="Savings", slug="savings", semantic_type="savings")
    db.add(cat)
    db.flush()

    alloc = MonthlyAllocation(monthly_finance_id=finance.id, category_id=cat.id, amount=Decimal("5000.00"))
    db.add(alloc)
    db.commit()

    service = MoneyReconciliationService(db)

    # 1. No connected accounts -> UNAVAILABLE
    res1 = service.reconcile_month(user.id, 2026, 8)
    savings_item = next(item for item in res1["items"] if item["category_slug"] == "savings")
    assert savings_item["status"] == "UNAVAILABLE"
    assert savings_item["actual"] is None
    assert savings_item["provenance"] == "UNAVAILABLE"

    # 2. Account exists but no transactions -> NOT_STARTED
    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="SBI",
        account_type="Savings",
        masked_account_number="2222",
        status="ACTIVE",
        balance=Decimal("25000.00")
    )
    db.add(account)
    db.commit()

    res2 = service.reconcile_month(user.id, 2026, 8)
    savings_item = next(item for item in res2["items"] if item["category_slug"] == "savings")
    assert savings_item["status"] == "NOT_STARTED"
    assert savings_item["actual"] == Decimal("0.00")
    assert savings_item["provenance"] == "CONNECTED_ACCOUNT"


def test_reconciliation_separate_dimensions_and_provenance(db):
    user = create_user(db, email="recon_dims@example.com")

    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="SBI",
        account_type="Savings",
        masked_account_number="2222",
        status="ACTIVE",
        balance=Decimal("25000.00")
    )
    db.add(account)
    db.flush()

    # 1. Income Credit
    tx_inc = BankTransaction(
        user_id=user.id,
        connected_account_id=account.id,
        provider_transaction_id="tx_inc",
        transaction_timestamp=datetime(2026, 8, 10, 10, 0, 0, tzinfo=timezone.utc),
        amount=Decimal("15000.00"),
        transaction_type="CREDIT",
        dedupe_hash="hash_inc",
        classification="INCOME",
        source="SETU"
    )
    # 2. Investment Debit
    tx_inv = BankTransaction(
        user_id=user.id,
        connected_account_id=account.id,
        provider_transaction_id="tx_inv",
        transaction_timestamp=datetime(2026, 8, 11, 10, 0, 0, tzinfo=timezone.utc),
        amount=Decimal("4000.00"),
        transaction_type="DEBIT",
        dedupe_hash="hash_inv",
        classification="INVESTMENT",
        source="SETU"
    )
    db.add_all([tx_inc, tx_inv])
    db.commit()

    finance = MonthlyFinance(user_id=user.id, year=2026, month=8, income=Decimal("15000.00"), currency="INR")
    db.add(finance)
    db.flush()

    cat = SpendingCategory(name="Rent", slug="rent")
    db.add(cat)
    db.flush()

    spend = MonthlySpending(monthly_finance_id=finance.id, category_id=cat.id, amount=Decimal("3000.00"))
    db.add(spend)
    db.commit()

    service = MoneyReconciliationService(db)
    res = service.reconcile_month(user.id, 2026, 8)

    # Verify separate dimensions are returned properly
    assert res["planned_spending_total"] == Decimal("3000.00")
    assert res["actual_spending_total"] == Decimal("0.00")
    assert res["actual_income_total"] == Decimal("15000.00")
    assert res["actual_investment_total"] == Decimal("4000.00")


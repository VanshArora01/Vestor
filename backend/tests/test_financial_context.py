import pytest
from decimal import Decimal
from app.models.banking import FinancialConnection, ConnectedAccount, FinancialConsent
from app.models.goal import Goal
from app.services.financial_context_service import FinancialContextService
from tests.conftest import create_user
from app.core.security import create_access_token


def test_aggregation_one_emergency_account(db):
    user = create_user(db, email="one_emerg@example.com")
    
    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="Test Bank",
        account_type="Savings",
        masked_account_number="1234",
        purpose="Emergency Fund",
        status="ACTIVE",
        balance=Decimal("72500.00")
    )
    db.add(account)
    db.commit()

    service = FinancialContextService(db)
    result = service.get_balances_aggregation(user.id)

    assert result["emergency_fund_has_accounts"] is True
    assert result["emergency_fund_balance"] == Decimal("72500.00")
    assert result["resolved_emergency_fund_balance"] == Decimal("72500.00")


def test_aggregation_multiple_emergency_accounts(db):
    user = create_user(db, email="multi_emerg@example.com")
    
    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account1 = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="Test Bank 1",
        account_type="Savings",
        masked_account_number="1111",
        purpose="Emergency Fund",
        status="ACTIVE",
        balance=Decimal("72500.00")
    )
    account2 = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="Test Bank 2",
        account_type="Savings",
        masked_account_number="2222",
        purpose="Emergency Fund",
        status="ACTIVE",
        balance=Decimal("15000.00")
    )
    db.add_all([account1, account2])
    db.commit()

    service = FinancialContextService(db)
    result = service.get_balances_aggregation(user.id)

    assert result["emergency_fund_has_accounts"] is True
    assert result["emergency_fund_balance"] == Decimal("87500.00")
    assert result["resolved_emergency_fund_balance"] == Decimal("87500.00")


def test_aggregation_one_savings_account(db):
    user = create_user(db, email="one_savings@example.com")
    
    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="Test Bank",
        account_type="Savings",
        masked_account_number="3333",
        purpose="Savings",
        status="ACTIVE",
        balance=Decimal("50000.00")
    )
    db.add(account)
    db.commit()

    service = FinancialContextService(db)
    result = service.get_balances_aggregation(user.id)

    assert result["savings_has_accounts"] is True
    assert result["savings_balance"] == Decimal("50000.00")
    assert result["resolved_savings_balance"] == Decimal("50000.00")


def test_aggregation_multiple_savings_accounts(db):
    user = create_user(db, email="multi_savings@example.com")
    
    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account1 = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="Test Bank 1",
        account_type="Savings",
        masked_account_number="1111",
        purpose="Savings",
        status="ACTIVE",
        balance=Decimal("30000.00")
    )
    account2 = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="Test Bank 2",
        account_type="Savings",
        masked_account_number="2222",
        purpose="Savings",
        status="ACTIVE",
        balance=Decimal("20000.00")
    )
    db.add_all([account1, account2])
    db.commit()

    service = FinancialContextService(db)
    result = service.get_balances_aggregation(user.id)

    assert result["savings_has_accounts"] is True
    assert result["savings_balance"] == Decimal("50000.00")
    assert result["resolved_savings_balance"] == Decimal("50000.00")


def test_aggregation_null_balance(db):
    user = create_user(db, email="null_bal@example.com")
    
    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="Test Bank",
        account_type="Savings",
        masked_account_number="9999",
        purpose="Emergency Fund",
        status="ACTIVE",
        balance=None  # Not synced yet
    )
    db.add(account)
    db.commit()

    service = FinancialContextService(db)
    result = service.get_balances_aggregation(user.id)

    assert result["emergency_fund_has_accounts"] is True
    assert result["emergency_fund_balance"] is None
    # Verify we do NOT fallback to goal.current_amount if connected account exists but has NULL balance
    assert result["resolved_emergency_fund_balance"] is None


def test_aggregation_inactive_account_ignored(db):
    user = create_user(db, email="inactive_acc@example.com")
    
    # Active connection but account is DISCONNECTED
    connection1 = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection1)
    db.flush()

    account1 = ConnectedAccount(
        user_id=user.id,
        connection_id=connection1.id,
        institution_name="Test Bank 1",
        account_type="Savings",
        masked_account_number="1111",
        purpose="Emergency Fund",
        status="DISCONNECTED",
        balance=Decimal("72500.00")
    )

    # DISCONNECTED connection but account is ACTIVE
    connection2 = FinancialConnection(user_id=user.id, provider="SETU_AA", status="DISCONNECTED")
    db.add(connection2)
    db.flush()

    account2 = ConnectedAccount(
        user_id=user.id,
        connection_id=connection2.id,
        institution_name="Test Bank 2",
        account_type="Savings",
        masked_account_number="2222",
        purpose="Emergency Fund",
        status="ACTIVE",
        balance=Decimal("15000.00")
    )

    db.add_all([account1, account2])
    db.commit()

    service = FinancialContextService(db)
    result = service.get_balances_aggregation(user.id)

    assert result["emergency_fund_has_accounts"] is False
    assert result["emergency_fund_balance"] is None
    assert result["resolved_emergency_fund_balance"] == Decimal("0")  # Fallback to zero goal amount


def test_aggregation_purpose_change(db):
    user = create_user(db, email="purpose_change@example.com")
    
    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="Test Bank",
        account_type="Savings",
        masked_account_number="4444",
        purpose="Emergency Fund",
        status="ACTIVE",
        balance=Decimal("72500.00")
    )
    db.add(account)
    db.commit()

    service = FinancialContextService(db)
    
    # 1. Initially Emergency Fund
    result1 = service.get_balances_aggregation(user.id)
    assert result1["emergency_fund_balance"] == Decimal("72500.00")
    assert result1["savings_balance"] is None

    # 2. Update purpose to Savings
    account.purpose = "Savings"
    db.commit()

    result2 = service.get_balances_aggregation(user.id)
    assert result2["emergency_fund_balance"] is None
    assert result2["savings_balance"] == Decimal("72500.00")


def test_api_endpoint_receives_updated_values(client, db):
    user = create_user(db, email="api_aggregation@example.com")
    headers = {"Authorization": f"Bearer {create_access_token(user.id)}"}

    connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add(connection)
    db.flush()

    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="Test HDFC Bank",
        account_type="Savings",
        masked_account_number="9876",
        purpose="Savings",
        status="ACTIVE",
        balance=Decimal("45000.50")
    )
    db.add(account)
    db.commit()

    response = client.get("/api/v1/banking/balances/aggregate", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert data["savings_has_accounts"] is True
    assert data["savings_balance"] == "45000.50"
    assert data["resolved_savings_balance"] == "45000.50"
    assert data["emergency_fund_has_accounts"] is False

import pytest
from httpx import Response, Request, HTTPStatusError
from unittest.mock import MagicMock, AsyncMock, patch

from app.integrations.setu.client import SetuClient
from app.integrations.setu.exceptions import SetuAuthenticationError, SetuAPIError

@pytest.fixture
def mock_httpx_client():
    with patch("app.integrations.setu.client.httpx.AsyncClient") as mock_client_cls:
        mock_instance = AsyncMock()
        mock_instance.__aenter__.return_value = mock_instance
        mock_client_cls.return_value = mock_instance
        yield mock_instance

@pytest.mark.asyncio
async def test_setu_client_token_success(mock_httpx_client):
    mock_httpx_client.post.return_value = Response(
        status_code=200,
        json={"access_token": "fake_token", "expires_in": 3600},
        request=Request("POST", "url")
    )
    
    client = SetuClient()
    token = await client._get_access_token()
    assert token == "fake_token"
    mock_httpx_client.post.assert_called_once()

@pytest.mark.asyncio
async def test_setu_client_token_failure(mock_httpx_client):
    mock_httpx_client.post.return_value = Response(
        status_code=401,
        json={"error": "invalid_client"},
        request=Request("POST", "url")
    )
    mock_httpx_client.post.return_value.raise_for_status = MagicMock(
        side_effect=HTTPStatusError("error", request=Request("POST", "url"), response=mock_httpx_client.post.return_value)
    )
    
    client = SetuClient()
    with pytest.raises(SetuAuthenticationError):
        await client._get_access_token()

@pytest.mark.asyncio
async def test_setu_client_fip_success(mock_httpx_client):
    mock_httpx_client.post.return_value = Response(
        status_code=200,
        json={"access_token": "fake_token", "expires_in": 3600},
        request=Request("POST", "url")
    )
    mock_httpx_client.get.return_value = Response(
        status_code=200,
        json={"fips": [
            {"fipId": "1", "fipName": "Bank A", "fiTypes": ["DEPOSIT"], "institutionType": "BANK", "status": "ACTIVE"}
        ]},
        request=Request("GET", "url")
    )
    
    client = SetuClient()
    fips = await client.get_fips()
    
    assert len(fips) == 1
    assert fips[0].fipId == "1"
    assert fips[0].display_name == "Bank A"

def test_get_providers_endpoint_success(client, user_headers, mock_httpx_client):
    mock_httpx_client.post.return_value = Response(
        status_code=200,
        json={"access_token": "fake_token", "expires_in": 3600},
        request=Request("POST", "url")
    )
    mock_httpx_client.get.return_value = Response(
        status_code=200,
        json={"fips": [
            {"fipId": "1", "fipName": "Bank A", "fiTypes": ["DEPOSIT"], "institutionType": "BANK", "status": "ACTIVE"}
        ]},
        request=Request("GET", "url")
    )
    
    response = client.get("/api/v1/banking/providers", headers=user_headers)
    assert response.status_code == 200
    data = response.json()
    assert "providers" in data
    assert len(data["providers"]) == 1
    assert data["providers"][0]["provider_id"] == "1"
    assert data["providers"][0]["name"] == "Bank A"

def test_get_providers_unauthenticated(client):
    response = client.get("/api/v1/banking/providers")
    assert response.status_code == 401

def test_credentials_not_in_payload(client, user_headers, mock_httpx_client):
    mock_httpx_client.post.return_value = Response(
        status_code=401,
        json={"error": "invalid"},
        request=Request("POST", "url")
    )
    mock_httpx_client.post.return_value.raise_for_status = MagicMock(
        side_effect=HTTPStatusError("error", request=Request("POST", "url"), response=mock_httpx_client.post.return_value)
    )
    
    response = client.get("/api/v1/banking/providers", headers=user_headers)
    assert response.status_code == 502
    data = response.json()
    # Check that secrets did not leak in error
    assert "fake_token" not in str(data)
    assert "3Kd8Ih236PeQRwoV7fL2hs8Eytd1MgHp" not in str(data)

@pytest.mark.asyncio
async def test_create_consent_400_preserves_error_details(mock_httpx_client):
    token_resp = Response(status_code=200, json={"access_token": "fake_token_secret", "expires_in": 3600}, request=Request("POST", "url"))
    
    consent_req = Request("POST", "url")
    consent_resp = Response(status_code=400, json={"errorCode": "INVALID_CONSENT", "errorMessage": "Consent format is wrong"}, request=consent_req)
    consent_resp.raise_for_status = MagicMock(side_effect=HTTPStatusError("error", request=consent_req, response=consent_resp))
    
    mock_httpx_client.post.side_effect = [token_resp, consent_resp]
    
    client = SetuClient()
    with pytest.raises(SetuAPIError) as exc_info:
        await client.create_consent("9876543210", "http://redirect")
        
    assert exc_info.value.status_code == 400
    assert exc_info.value.error_code == "INVALID_CONSENT"
    assert exc_info.value.provider_message == "Consent format is wrong"
    assert "fake_token_secret" not in str(exc_info.value)

def test_connect_bank_missing_mobile(client, user_headers):
    response = client.post("/api/v1/banking/connect", json={"redirect_url": "http://localhost"}, headers=user_headers)
    assert response.status_code == 422 # validation error

def test_connect_bank_invalid_mobile(client, user_headers):
    response = client.post("/api/v1/banking/connect", json={"mobile_number": "123", "redirect_url": "http://localhost"}, headers=user_headers)
    assert response.status_code == 422 # validation error


def test_month_analysis_reconciles_connected_spending_and_isolates_simulated_source(client, db):
    from datetime import datetime, timezone
    from decimal import Decimal

    from app.core.security import create_access_token
    from app.models.banking import BankTransaction, ConnectedAccount, FinancialConnection
    from app.services.money_service import MoneyService
    from tests.conftest import create_user

    user = create_user(db, email="monthly-analysis@example.com")
    headers = {"Authorization": f"Bearer {create_access_token(user.id)}"}

    demo_connection = FinancialConnection(user_id=user.id, provider="VESTOR_DEMO", status="ACTIVE")
    live_connection = FinancialConnection(user_id=user.id, provider="SETU_AA", status="ACTIVE")
    db.add_all([demo_connection, live_connection])
    db.flush()

    demo_account = ConnectedAccount(
        user_id=user.id,
        connection_id=demo_connection.id,
        institution_name="Vestor Simulated Bank",
        account_type="SAVINGS",
        masked_account_number="**2026",
        purpose="main_spending",
        status="ACTIVE",
        opening_balance=Decimal("0.00"),
    )
    live_account = ConnectedAccount(
        user_id=user.id,
        connection_id=live_connection.id,
        institution_name="Test Bank",
        account_type="Savings",
        masked_account_number="**1234",
        purpose="main_spending",
        status="ACTIVE",
        opening_balance=Decimal("0.00"),
    )
    db.add_all([demo_account, live_account])
    db.flush()

    timestamp = datetime(2026, 10, 12, 12, tzinfo=timezone.utc)
    demo_rows = [
        BankTransaction(
            user_id=user.id,
            connected_account_id=demo_account.id,
            provider_transaction_id="demo-salary",
            transaction_timestamp=timestamp,
            amount=Decimal("100000.00"),
            transaction_type="CREDIT",
            narration="SALARY CREDIT ACME",
            classification="INCOME",
            classification_status="USER_CONFIRMED",
            category="Salary",
            source="DEMO",
            dedupe_hash="demo-salary-hash",
        ),
        BankTransaction(
            user_id=user.id,
            connected_account_id=demo_account.id,
            provider_transaction_id="demo-food",
            transaction_timestamp=timestamp,
            amount=Decimal("1000.00"),
            transaction_type="DEBIT",
            narration="SWIGGY FOOD ORDER",
            classification="UNCLASSIFIED",
            classification_status="UNCLASSIFIED",
            category="Unclassified",
            source="DEMO",
            dedupe_hash="demo-food-hash",
        ),
        BankTransaction(
            user_id=user.id,
            connected_account_id=demo_account.id,
            provider_transaction_id="demo-unknown",
            transaction_timestamp=timestamp,
            amount=Decimal("500.00"),
            transaction_type="DEBIT",
            narration="UPI LOCAL MERCHANT",
            classification="UNCLASSIFIED",
            classification_status="UNCLASSIFIED",
            category="Unclassified",
            source="DEMO",
            dedupe_hash="demo-unknown-hash",
        ),
        BankTransaction(
            user_id=user.id,
            connected_account_id=demo_account.id,
            provider_transaction_id="demo-transfer",
            transaction_timestamp=timestamp,
            amount=Decimal("2000.00"),
            transaction_type="DEBIT",
            narration="TRANSFER TO SELF",
            classification="TRANSFER",
            classification_status="SYSTEM_CLASSIFIED",
            category="Transfer",
            source="DEMO",
            dedupe_hash="demo-transfer-hash",
        ),
    ]
    live_rows = [
        BankTransaction(
            user_id=user.id,
            connected_account_id=live_account.id,
            provider_transaction_id="live-salary",
            transaction_timestamp=timestamp,
            amount=Decimal("50000.00"),
            transaction_type="CREDIT",
            narration="PAYROLL CREDIT",
            classification="INCOME",
            classification_status="USER_CONFIRMED",
            category="Salary",
            source="SETU",
            dedupe_hash="live-salary-hash",
        ),
        BankTransaction(
            user_id=user.id,
            connected_account_id=live_account.id,
            provider_transaction_id="live-grocery",
            transaction_timestamp=timestamp,
            amount=Decimal("2000.00"),
            transaction_type="DEBIT",
            narration="BIGBASKET GROCERIES",
            classification="UNCLASSIFIED",
            classification_status="UNCLASSIFIED",
            category="Unclassified",
            source="SETU",
            dedupe_hash="live-grocery-hash",
        ),
    ]
    db.add_all([*demo_rows, *live_rows])
    db.flush()

    demo_request = {"year": 2026, "month": 10, "account_id": str(demo_account.id)}
    demo_first = client.post("/api/v1/banking/transactions/analyze-month", json=demo_request, headers=headers)
    assert demo_first.status_code == 200
    demo_summary = demo_first.json()
    assert demo_summary["simulated"] is True
    assert demo_summary["transaction_count"] == 4
    assert demo_summary["confirmed_income"] == "100000.00"
    assert demo_summary["total_recorded_ordinary_debits"] == "1500.00"
    assert demo_summary["cash_remaining"] == "98500.00"
    assert {item["category"]: item["amount"] for item in demo_summary["category_totals"]} == {
        "Food": "1000.00",
        "Uncategorised": "500.00",
    }
    assert demo_summary["plan_preview"]["available_to_plan"] == "100000.00"
    live_money_before_live_analysis = MoneyService(db).get_month(user, 2026, 10)
    assert live_money_before_live_analysis["metrics"]["income"] == "50000.00"
    assert live_money_before_live_analysis["metrics"]["spending_total"] == "0.00"

    live_request = {"year": 2026, "month": 10, "account_id": str(live_account.id)}
    live_first = client.post("/api/v1/banking/transactions/analyze-month", json=live_request, headers=headers)
    assert live_first.status_code == 200
    live_summary = live_first.json()
    assert live_summary["simulated"] is False
    assert live_summary["transaction_count"] == 2
    assert live_summary["confirmed_income"] == "50000.00"
    assert live_summary["total_recorded_ordinary_debits"] == "2000.00"

    live_month = MoneyService(db).get_month(user, 2026, 10)
    assert live_month["metrics"]["income"] == "50000.00"
    assert live_month["metrics"]["spending_total"] == "2000.00"
    assert sum(Decimal(item["amount"]) for item in live_month["spending"]) == Decimal("2000.00")

    demo_second = client.post("/api/v1/banking/transactions/analyze-month", json=demo_request, headers=headers)
    live_second = client.post("/api/v1/banking/transactions/analyze-month", json=live_request, headers=headers)
    assert demo_second.status_code == live_second.status_code == 200
    assert demo_second.json()["category_totals"] == demo_summary["category_totals"]
    assert live_second.json()["category_totals"] == live_summary["category_totals"]
    assert live_second.json()["transaction_count"] == live_summary["transaction_count"]
    db.refresh(live_rows[1])
    assert live_rows[1].classification == "EXPENSE"
    assert MoneyService(db).get_month(user, 2026, 10)["metrics"]["spending_total"] == "2000.00"

@pytest.mark.asyncio
async def test_create_consent_payload_structure(mock_httpx_client):
    token_resp = Response(status_code=200, json={"access_token": "fake", "expires_in": 3600}, request=Request("POST", "url"))
    consent_resp = Response(status_code=200, json={"id": "consent-123", "url": "http://consent"}, request=Request("POST", "url"))
    
    mock_httpx_client.post.side_effect = [token_resp, consent_resp]
    
    client = SetuClient()
    await client.create_consent("9876543210", "http://redirect")
    
    call_args, call_kwargs = mock_httpx_client.post.call_args_list[1]
    payload = call_kwargs['json']
    
    assert payload["vua"] == "9876543210"
    assert "Customer" not in payload
    assert "Detail" not in payload
    assert "from" in payload["dataRange"]
    assert "to" in payload["dataRange"]
    assert payload["consentDuration"]["unit"] == "YEAR"
    assert payload["frequency"]["unit"] == "DAY"
    assert "category" in payload["purpose"]
    assert "Category" not in payload["purpose"]
    assert "dataConsumer" not in payload

def test_get_account_details_success(client, db):
    from tests.conftest import create_user
    from app.core.security import create_access_token
    user = create_user(db, email="account_details@example.com")
    headers = {"Authorization": f"Bearer {create_access_token(user.id)}"}
    
    from app.models.banking import FinancialConnection, ConnectedAccount, FinancialConsent
    from decimal import Decimal
    
    connection = FinancialConnection(
        user_id=user.id,
        provider="SETU_AA",
        status="ACTIVE"
    )
    db.add(connection)
    db.flush()
    
    account = ConnectedAccount(
        user_id=user.id,
        connection_id=connection.id,
        institution_name="Test Bank",
        account_type="Savings",
        masked_account_number="1234",
        purpose="Savings",
        status="ACTIVE",
        balance=Decimal("15000.50")
    )
    db.add(account)
    
    consent = FinancialConsent(
        user_id=user.id,
        connection_id=connection.id,
        provider="SETU_AA",
        external_consent_id="ext-consent-123",
        status="ACTIVE"
    )
    db.add(consent)
    db.commit()
    
    response = client.get(f"/api/v1/banking/accounts/{account.id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["institution_name"] == "Test Bank"
    assert float(data["balance"]) == 15000.50
    assert len(data["transactions"]) == 0

def test_get_account_details_isolation(client, db):
    from tests.conftest import create_user
    from app.core.security import create_access_token
    user1 = create_user(db, email="user1@example.com")
    user2 = create_user(db, email="user2@example.com")
    headers1 = {"Authorization": f"Bearer {create_access_token(user1.id)}"}
    
    from app.models.banking import FinancialConnection, ConnectedAccount
    connection = FinancialConnection(
        user_id=user2.id,
        provider="SETU_AA",
        status="ACTIVE"
    )
    db.add(connection)
    db.flush()
    
    account = ConnectedAccount(
        user_id=user2.id,
        connection_id=connection.id,
        institution_name="User 2 Bank",
        account_type="Savings",
        masked_account_number="4321",
        status="ACTIVE"
    )
    db.add(account)
    db.commit()
    
    response = client.get(f"/api/v1/banking/accounts/{account.id}", headers=headers1)
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_create_connected_accounts_and_self_healing(db):
    from app.services.banking_service import BankingService
    from app.models.banking import FinancialConnection, FinancialConsent, ConnectedAccount
    from tests.conftest import create_user
    from app.core.security import create_access_token
    
    user = create_user(db, email="self_heal@example.com")
    service = BankingService(db)
    
    connection = FinancialConnection(
        user_id=user.id,
        provider="SETU_AA",
        status="ACTIVE",
        last_synced_at=None
    )
    db.add(connection)
    db.flush()
    
    consent = FinancialConsent(
        user_id=user.id,
        connection_id=connection.id,
        provider="SETU_AA",
        external_consent_id="heal-consent-123",
        status="ACTIVE"
    )
    db.add(consent)
    db.commit()
    
    mock_setu_data = {
        "status": "ACTIVE",
        "accountsLinked": [
            {
                "accType": "SAVINGS",
                "fiType": "DEPOSIT",
                "fipId": "hdfc-fip",
                "maskedAccNumber": "XXXXXXXX6015",
                "linkRefNumber": "ref-123"
            },
            {
                "accType": "CURRENT",
                "fiType": "DEPOSIT",
                "fipId": "sbi-fip",
                "maskedAccNumber": "XXXXXXXX1330",
                "linkRefNumber": "ref-456"
            }
        ]
    }
    
    with patch.object(service.setu_client, "get_consent", return_value=mock_setu_data) as mock_get:
        result = await service.get_consent_status(user.id, consent.id)
        mock_get.assert_called_once_with("heal-consent-123")
        
        db.refresh(connection)
        assert len(connection.accounts) == 2
        
        accs = sorted(connection.accounts, key=lambda x: x.masked_account_number)
        
        assert accs[0].institution_name == "sbi-fip"
        assert accs[0].account_type == "CURRENT"
        assert accs[0].masked_account_number == "1330"
        
        assert accs[1].institution_name == "hdfc-fip"
        assert accs[1].account_type == "SAVINGS"
        assert accs[1].masked_account_number == "6015"
        
        assert connection.last_synced_at is not None
        
        # Test Bounded Self-Healing Retries (should not query Setu if last_synced_at is not None)
        mock_get.reset_mock()
        await service.get_consent_status(user.id, consent.id)
        mock_get.assert_not_called()
        
        # Test Idempotence at Database level
        connection.last_synced_at = None
        db.commit()
        
        await service.get_consent_status(user.id, consent.id)
        db.refresh(connection)
        assert len(connection.accounts) == 2

@pytest.mark.asyncio
async def test_accounts_lifecycle_and_retry_behavior(client, db):
    from app.services.banking_service import BankingService
    from app.models.banking import FinancialConnection, FinancialConsent, ConnectedAccount
    from tests.conftest import create_user
    from uuid import UUID
    
    user = create_user(db, email="lifecycle@example.com")
    service = BankingService(db)
    
    # 1. Verify retry does not create duplicate active connections
    with patch.object(service.setu_client, "create_consent", side_effect=[
        {"id": "mock-consent-1", "url": "http://mock-url-1"},
        {"id": "mock-consent-2", "url": "http://mock-url-2"},
        {"id": "mock-consent-3", "url": "http://mock-url-3"},
        {"id": "mock-consent-4", "url": "http://mock-url-4"},
    ]):
        # Initiate first connection attempt
        res1 = await service.connect_bank(user.id, "9999999999", "http://localhost")
        consent1 = service.repo.get_consent_by_id(UUID(res1["consent_id"]))
        conn1_id = consent1.connection_id
        
        # Initiate second (retry) connection attempt while first is still PENDING
        res2 = await service.connect_bank(user.id, "9999999999", "http://localhost")
        consent2 = service.repo.get_consent_by_id(UUID(res2["consent_id"]))
        conn2_id = consent2.connection_id
        
        # The retry should reuse the same connection row!
        assert conn1_id == conn2_id
        
        # Mark this connection as FAILED
        service.repo.update_consent_status(consent2, "FAILED")
        
        # Initiate third attempt after failure
        res3 = await service.connect_bank(user.id, "9999999999", "http://localhost")
        consent3 = service.repo.get_consent_by_id(UUID(res3["consent_id"]))
        conn3_id = consent3.connection_id
        
        # It should still reuse the same connection row!
        assert conn1_id == conn3_id
        
        # Now complete this connection successfully
        mock_setu_data = {
            "status": "ACTIVE",
            "accountsLinked": [
                {
                    "accType": "SAVINGS",
                    "fiType": "DEPOSIT",
                    "fipId": "hdfc-fip",
                    "maskedAccNumber": "XXXXXXXX6015"
                },
                {
                    "accType": "CURRENT",
                    "fiType": "DEPOSIT",
                    "fipId": "sbi-fip",
                    "maskedAccNumber": "XXXXXXXX1330"
                }
            ]
        }
        with patch.object(service.setu_client, "get_consent", return_value=mock_setu_data):
            # We manually clear last_synced_at to ensure it syncs
            consent3.connection.last_synced_at = None
            db.commit()
            await service.get_consent_status(user.id, consent3.id)
            
        db.refresh(consent3.connection)
        assert consent3.connection.status == "ACTIVE"
        assert len(consent3.connection.accounts) == 2
        
        # Verify balances remain None (pending sync)
        for a in consent3.connection.accounts:
            assert a.balance is None
            
        # Verify mock transactions are empty
        # Let's test the actual detail retrieval endpoint to verify empty transactions are returned
        from app.core.security import create_access_token
        headers = {"Authorization": f"Bearer {create_access_token(user.id)}"}
        
        account_id = consent3.connection.accounts[0].id
        response = client.get(f"/api/v1/banking/accounts/{account_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["transactions"] == []
        
        # Verify retry after success creates a NEW connection (doesn't overwrite active)
        res4 = await service.connect_bank(user.id, "9999999999", "http://localhost")
        consent4 = service.repo.get_consent_by_id(UUID(res4["consent_id"]))
        assert consent4.connection_id != conn1_id




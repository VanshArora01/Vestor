# -*- coding: utf-8 -*-
"""
Unit tests for sync retry logic.
"""

import pytest
from datetime import datetime, timezone
from app.models.banking import ConnectedAccount
from app.repositories.banking_repository import BankingRepository
from app.services.banking_service import BankingService


@pytest.fixture
def banking_repository():
    """Fixture for BankingRepository."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine("sqlite:///:memory:")
    Session = sessionmaker(bind=engine)
    db = Session()

    yield BankingRepository(db)
    db.close()


def test_update_account_failed_sync(banking_repository):
    """Test updating account sync state with error message."""
    # Mock account
    account = ConnectedAccount(
        user_id="723e4567-e89b-12d3-a456-426614174001",
        connection_id="123e4567-e89b-12d3-a456-426614174000",
        institution_name="HDFC Bank",
        account_type="SAVINGS",
        masked_account_number="****6015",
        purpose="Savings",
        balance=Decimal("72500.00"),
        balance_status="NOT_SYNCED",
        sync_attempt_count=0,
    )

    # Update account with failed sync
    banking_repository.update_account_failed_sync(
        account,
        balance_status="FAILED",
        error_message="No data returned from provider"
    )

    # Verify changes
    assert account.balance_status == "FAILED"
    assert account.error_message == "No data returned from provider"
    assert account.sync_attempt_count == 0  # Not incremented in this test


def test_sync_attempt_count_increment(banking_repository):
    """Test incrementing sync attempt count."""
    # Mock account
    account = ConnectedAccount(
        user_id="723e4567-e89b-12d3-a456-426614174001",
        connection_id="123e4567-e89b-12d3-a456-426614174000",
        institution_name="HDFC Bank",
        account_type="SAVINGS",
        masked_account_number="****6015",
        purpose="Savings",
        balance=Decimal("72500.00"),
        balance_status="NOT_SYNCED",
        sync_attempt_count=0,
    )

    # Simulate sync attempt count increment
    account.sync_attempt_count += 1

    # Update account with failed sync
    banking_repository.update_account_failed_sync(
        account,
        balance_status="FAILED",
        error_message="No data returned from provider"
    )

    # Verify changes
    assert account.balance_status == "FAILED"
    assert account.error_message == "No data returned from provider"
    assert account.sync_attempt_count == 1
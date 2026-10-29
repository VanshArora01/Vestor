# -*- coding: utf-8 -*-
"""
Unit tests for transaction classification logic.
"""

import pytest
from decimal import Decimal
from datetime import datetime, timezone
from app.services.banking_service import BankingService
from app.models.banking import BankTransaction
from app.schemas.banking import UpdateTransactionClassificationRequest


@pytest.fixture
def banking_service():
    """Fixture for BankingService."""
    return BankingService()


def test_transaction_classification(banking_service):
    """Test transaction classification logic."""
    # Mock user patterns
    patterns = [
        {
            "narration_pattern": "SALARY",
            "typical_amount": Decimal("100000.00"),
            "amount_tolerance": Decimal("5000.00"),
            "merchant_name": "Office Salary",
            "is_confirmed": True,
        }
    ]

    # Mock raw transaction data
    raw_txs = [
        {
            "txnId": "SETU_TXN_1330_01",
            "transactionTimestamp": "2026-08-21T09:15:00Z",
            "amount": "12500.00",
            "type": "CREDIT",
            "narration": "OFFICE SALARY AUG 2026",
            "mode": "NEFT",
            "currentBalance": "150000.00"
        }
    ]

    # Mock account data
    account_id = "123e4567-e89b-12d3-a456-426614174000"
    user_id = "723e4567-e89b-12d3-a456-426614174001"

    # Normalize transactions
    normalized_txs = banking_service._normalize_transactions(user_id, account_id, raw_txs)

    # Verify classification
    assert len(normalized_txs) == 1
    tx = normalized_txs[0]
    assert tx["classification"] == "INCOME"
    assert tx["classification_status"] == "SYSTEM_CLASSIFIED"
    assert tx["confidence"] == Decimal("0.95")
    assert tx["category"] == "Salary"


def test_user_classification_override(banking_service):
    """Test user classification override logic."""
    # Mock raw transaction data
    raw_txs = [
        {
            "txnId": "SETU_TXN_1330_02",
            "transactionTimestamp": "2026-08-18T16:45:00Z",
            "amount": "3200.00",
            "type": "DEBIT",
            "narration": "Amazon India Retail",
            "mode": "UPI",
            "currentBalance": "137500.00"
        }
    ]

    # Mock account data
    account_id = "123e4567-e89b-12d3-a456-426614174000"
    user_id = "723e4567-e89b-12d3-a456-426614174001"

    # Normalize transactions
    normalized_txs = banking_service._normalize_transactions(user_id, account_id, raw_txs)

    # Verify initial classification
    assert len(normalized_txs) == 1
    tx = normalized_txs[0]
    assert tx["classification"] == "EXPENSE"
    assert tx.get("user_classification") is None

    # Simulate user override
    tx["user_classification"] = "INCOME"
    assert tx["user_classification"] == "INCOME"
# -*- coding: utf-8 -*-
"""
Banking schemas for Vestor.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from uuid import UUID





class PurposeUpdateRequest(BaseModel):
    """
    Request body for updating an account's purpose.
    """
    purpose: str = Field(..., description="The purpose/goal for this account")


class ProviderRecord(BaseModel):
    """
    Schema for a provider record.
    """
    name: str
    provider_id: str
    institution_type: Optional[str]
    fi_types: Optional[List[str]]
    status: Optional[str]


class ProviderListResponse(BaseModel):
    """
    Schema for a list of providers.
    """
    providers: List[ProviderRecord]


class ConnectedAccountSchema(BaseModel):
    """
    Schema for a connected account.
    """
    id: UUID
    institution_name: str
    account_type: str
    masked_account_number: str
    purpose: Optional[str] = None
    status: str
    balance: Optional[Decimal]
    balance_status: str
    balance_timestamp: Optional[datetime]
    last_synced_at: Optional[datetime]
    earmarked_for_goals: Optional[Decimal]
    unallocated_balance: Optional[Decimal]
    over_allocated_amount: Optional[Decimal]


class FinancialConnectionSchema(BaseModel):
    """
    Schema for a financial connection (consent + accounts).
    """
    id: UUID
    provider: str
    status: str
    created_at: datetime
    last_synced_at: Optional[datetime]
    accounts: List[ConnectedAccountSchema]
    consent_id: Optional[UUID]
    consent_status: Optional[str]
    consent_expires_at: Optional[datetime]

    class Config:
        from_attributes = True


class TransactionSchema(BaseModel):
    """
    Schema for a bank transaction.
    """
    id: UUID
    user_id: UUID
    connected_account_id: UUID
    provider_transaction_id: Optional[str]
    transaction_timestamp: datetime
    amount: Decimal
    transaction_type: str
    narration: Optional[str]
    transaction_mode: Optional[str]
    category: Optional[str]
    classification: Optional[str]
    classification_status: str
    confidence: Optional[Decimal]
    classification_source: Optional[str]
    merchant_name: Optional[str]
    source: str
    reference_number: Optional[str]
    account_purpose: Optional[str]
    dedupe_hash: str
    # Removed autonomous fields
    class Config:
        from_attributes = True

class AccountTransactionSchema(BaseModel):
    """
    Schema for a bank transaction in the context of an account detail view.
    Excludes internal identifiers like user_id and connected_account_id which are redundant.
    """
    id: UUID
    provider_transaction_id: Optional[str]
    transaction_timestamp: datetime
    amount: Decimal
    transaction_type: str
    narration: Optional[str]
    transaction_mode: Optional[str]
    balance_after_transaction: Optional[Decimal]
    category: Optional[str]
    classification: Optional[str]
    classification_status: str
    confidence: Optional[Decimal]
    classification_source: Optional[str]
    merchant_name: Optional[str]
    source: str
    reference_number: Optional[str]
    
    class Config:
        from_attributes = True


class AccountDetailResponse(BaseModel):
    """
    Schema for account details.
    """
    id: UUID
    institution_name: str
    account_type: str
    masked_account_number: str
    purpose: Optional[str] = None
    status: str
    balance: Optional[Decimal]
    balance_status: str
    balance_timestamp: Optional[datetime]
    last_synced_at: Optional[datetime]
    consent_expires_at: Optional[datetime]
    earmarked_for_goals: Optional[Decimal]
    unallocated_balance: Optional[Decimal]
    over_allocated_amount: Optional[Decimal]
    transactions: List[AccountTransactionSchema]

    class Config:
        from_attributes = True


# Alias used by the classification endpoint
BankTransactionSchema = TransactionSchema


class ClassificationUpdateRequest(BaseModel):
    """
    Request body for manually correcting a transaction's classification.
    """
    classification: str = Field(..., description="Updated classification label")
    category: Optional[str] = Field(None, description="Updated category")


UpdateTransactionClassificationRequest = ClassificationUpdateRequest


class AggregatedBalancesResponse(BaseModel):
    """
    Aggregated balance data across all connected accounts.
    """
    actual_connected_cash: Optional[Decimal]
    main_spending_balance: Optional[Decimal]
    savings_balance: Optional[Decimal]
    emergency_fund_balance: Optional[Decimal]
    main_spending_has_accounts: bool
    savings_has_accounts: bool
    emergency_fund_has_accounts: bool
    resolved_main_spending_balance: Optional[Decimal]
    resolved_savings_balance: Optional[Decimal]
    resolved_emergency_fund_balance: Optional[Decimal]
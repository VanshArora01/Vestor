from datetime import datetime
from uuid import UUID

from decimal import Decimal
from sqlalchemy import ForeignKey, String, Numeric, UniqueConstraint, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

class ConnectionStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"
    FAILED = "FAILED"
    DISCONNECTED = "DISCONNECTED"

class FinancialConnection(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "financial_connections"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default=ConnectionStatus.PENDING.value, nullable=False)
    external_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(nullable=True)
    
    consents: Mapped[list["FinancialConsent"]] = relationship(
        "FinancialConsent", back_populates="connection", cascade="all, delete-orphan"
    )
    accounts: Mapped[list["ConnectedAccount"]] = relationship(
        "ConnectedAccount", back_populates="connection", cascade="all, delete-orphan"
    )

class ConnectedAccount(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "connected_accounts"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    connection_id: Mapped[UUID] = mapped_column(ForeignKey("financial_connections.id", ondelete="CASCADE"), nullable=False)

    institution_name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_type: Mapped[str] = mapped_column(String(100), nullable=False)
    masked_account_number: Mapped[str] = mapped_column(String(50), nullable=False)

    purpose: Mapped[str] = mapped_column(String(100), nullable=False)  # Made purpose required
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)
    opening_balance: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    balance: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    balance_status: Mapped[str] = mapped_column(String(50), default="NOT_SYNCED", nullable=False)
    balance_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # New fields for sync state management
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sync_attempt_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    connection: Mapped["FinancialConnection"] = relationship("FinancialConnection", back_populates="accounts")
    transactions: Mapped[list["BankTransaction"]] = relationship(
        "BankTransaction", back_populates="connected_account", cascade="all, delete-orphan"
    )

class FinancialConsent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "financial_consents"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    connection_id: Mapped[UUID] = mapped_column(ForeignKey("financial_connections.id", ondelete="CASCADE"), nullable=False)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)
    external_consent_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True, unique=True)
    status: Mapped[str] = mapped_column(String(50), default=ConnectionStatus.PENDING.value, nullable=False)
    consent_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    purpose: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    expires_at: Mapped[datetime | None] = mapped_column(nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(nullable=True)
    
    connection: Mapped["FinancialConnection"] = relationship("FinancialConnection", back_populates="consents")

class BankTransaction(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "bank_transactions"
    __table_args__ = (
        UniqueConstraint("connected_account_id", "dedupe_hash", name="uq_account_dedupe_hash"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    connected_account_id: Mapped[UUID] = mapped_column(ForeignKey("connected_accounts.id", ondelete="CASCADE"), nullable=False, index=True)

    provider_transaction_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    transaction_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)  # CREDIT or DEBIT
    narration: Mapped[str | None] = mapped_column(String(500), nullable=True)
    transaction_mode: Mapped[str | None] = mapped_column(String(50), nullable=True)

    category: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    classification: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    classification_status: Mapped[str] = mapped_column(String(50), default="UNCLASSIFIED", nullable=False)
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(4, 2), nullable=True, default=None)
    classification_source: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    merchant_name: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    source: Mapped[str] = mapped_column(String(50), default="SETU", nullable=False)

    balance_after_transaction: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    reference_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    account_purpose: Mapped[str | None] = mapped_column(String(100), nullable=True)
    dedupe_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    connected_account: Mapped["ConnectedAccount"] = relationship("ConnectedAccount", back_populates="transactions")


from uuid import UUID
from typing import Optional
from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.banking import FinancialConnection, FinancialConsent, ConnectionStatus, ConnectedAccount

class BankingRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_consent_by_id(self, consent_id: UUID) -> Optional[FinancialConsent]:
        return self.db.scalars(select(FinancialConsent).where(FinancialConsent.id == consent_id)).first()
        
    def get_consent_by_external_id(self, external_id: str) -> Optional[FinancialConsent]:
        return self.db.scalars(
            select(FinancialConsent).where(FinancialConsent.external_consent_id == external_id)
        ).first()

    def create_connection_and_consent(
        self, user_id: UUID, provider: str, external_consent_id: str, consent_url: str
    ) -> FinancialConsent:
        # Check for an existing pending/failed/rejected connection to reuse
        existing_conn = self.db.scalars(
            select(FinancialConnection)
            .where(
                FinancialConnection.user_id == user_id,
                FinancialConnection.provider == provider,
                FinancialConnection.status.in_([
                    ConnectionStatus.PENDING.value,
                    ConnectionStatus.FAILED.value,
                    ConnectionStatus.REJECTED.value,
                    ConnectionStatus.DISCONNECTED.value,
                    ConnectionStatus.REVOKED.value
                ])
            )
            .order_by(FinancialConnection.created_at.desc())
        ).first()

        if existing_conn:
            connection = existing_conn
            connection.status = ConnectionStatus.PENDING.value
            connection.last_synced_at = None
        else:
            connection = FinancialConnection(
                user_id=user_id,
                provider=provider,
                status=ConnectionStatus.PENDING.value
            )
            self.db.add(connection)
            self.db.flush()

        consent = FinancialConsent(
            user_id=user_id,
            connection_id=connection.id,
            provider=provider,
            external_consent_id=external_consent_id,
            status=ConnectionStatus.PENDING.value,
            consent_url=consent_url
        )
        self.db.add(consent)
        self.db.commit()
        self.db.refresh(consent)
        return consent

    def update_consent_status(
        self, 
        consent: FinancialConsent, 
        status: str, 
        timestamp_field: str = None, 
        timestamp_value = None
    ) -> FinancialConsent:
        consent.status = status
        if timestamp_field and timestamp_value:
            setattr(consent, timestamp_field, timestamp_value)
            
        if status in [ConnectionStatus.ACTIVE.value, ConnectionStatus.REJECTED.value, ConnectionStatus.FAILED.value]:
            consent.connection.status = status
            
        self.db.commit()
        self.db.refresh(consent)
        return consent

    def create_connected_accounts(self, connection_id: UUID, user_id: UUID, accounts_data: list) -> list:
        from app.models.banking import ConnectedAccount
        
        # Query existing accounts for this connection to prevent duplicates (idempotence)
        existing = self.db.scalars(
            select(ConnectedAccount).where(
                ConnectedAccount.connection_id == connection_id,
                ConnectedAccount.user_id == user_id
            )
        ).all()
        existing_keys = {(a.masked_account_number, a.account_type.upper()): a for a in existing}
        
        accounts = []
        for acct in accounts_data:
            masked_num_raw = acct.get("maskedAccNumber") or acct.get("accRefNumber") or "****"
            masked_num = masked_num_raw[-4:]
            acc_type = acct.get("accType", "UNKNOWN")
            
            # Extract balance if available at linking time
            bal_val = acct.get("balance") or acct.get("currentBalance") or acct.get("summary", {}).get("currentBalance") or acct.get("summary", {}).get("balance")
            parsed_bal = None
            if bal_val is not None:
                try:
                    parsed_bal = Decimal(str(bal_val))
                except Exception:
                    pass

            key = (masked_num, acc_type.upper())
            if key in existing_keys:
                ca = existing_keys[key]
                ca.status = "ACTIVE"  # Ensure it is ACTIVE if previously marked disconnected
                accounts.append(ca)
            else:
                ca = ConnectedAccount(
                    user_id=user_id,
                    connection_id=connection_id,
                    institution_name=acct.get("fipName") or acct.get("fipId") or "Unknown Bank",
                    account_type=acc_type,
                    masked_account_number=masked_num,
                    status="ACTIVE",
                    opening_balance=parsed_bal,
                    balance=parsed_bal,
                    balance_timestamp=datetime.utcnow() if parsed_bal is not None else None
                )
                self.db.add(ca)
                accounts.append(ca)
            
        self.db.commit()
        return accounts

    def get_connections(self, user_id: UUID) -> list[FinancialConnection]:
        return self.db.scalars(
            select(FinancialConnection).where(FinancialConnection.user_id == user_id)
        ).all()

    def update_account_purpose(self, account_id: UUID, user_id: UUID, purpose: str):
        from app.models.banking import ConnectedAccount
        account = self.db.scalars(
            select(ConnectedAccount).where(ConnectedAccount.id == account_id, ConnectedAccount.user_id == user_id)
        ).first()
        if account:
            account.purpose = purpose
            self.db.commit()
            self.db.refresh(account)
        return account

    def get_connection_by_id(self, connection_id: UUID, user_id: UUID) -> Optional[FinancialConnection]:
        return self.db.scalars(
            select(FinancialConnection).where(FinancialConnection.id == connection_id, FinancialConnection.user_id == user_id)
        ).first()

    def disconnect_connection(self, connection: FinancialConnection):
        connection.status = ConnectionStatus.DISCONNECTED.value if hasattr(ConnectionStatus, 'DISCONNECTED') else "DISCONNECTED"
        for consent in connection.consents:
            consent.status = "REVOKED"
        for account in connection.accounts:
            account.status = "DISCONNECTED"
        self.db.commit()
        self.db.refresh(connection)
        return connection

    def get_account_by_id(self, account_id: UUID, user_id: UUID):
        from app.models.banking import ConnectedAccount
        return self.db.scalars(
            select(ConnectedAccount).where(
                ConnectedAccount.id == account_id,
                ConnectedAccount.user_id == user_id
            )
        ).first()

    def update_account_sync_state(
        self, 
        account, 
        balance = None, 
        balance_timestamp = None, 
        last_synced_at = None, 
        balance_status: str = "SYNCED"
    ):
        if balance is not None:
            account.balance = balance
            account.balance_timestamp = balance_timestamp
        if last_synced_at is not None:
            account.last_synced_at = last_synced_at
            if account.connection:
                account.connection.last_synced_at = last_synced_at
                
        account.balance_status = balance_status
        self.db.commit()
        self.db.refresh(account)
        return account

    def update_account_failed_sync(self, account, balance_status: str = "FAILED", error_message: str = None):
        # Retains existing balance, balance_timestamp, and last_synced_at intact!
        account.balance_status = balance_status
        if error_message:
            account.error_message = error_message
        self.db.commit()
        self.db.refresh(account)
        return account

    def upsert_bank_transactions(self, transactions_data: list[dict]) -> list:
        from app.models.banking import BankTransaction
        if not transactions_data:
            return []

        inserted = []
        for tx in transactions_data:
            # Check if (connected_account_id, dedupe_hash) already exists
            existing = self.db.scalars(
                select(BankTransaction).where(
                    BankTransaction.connected_account_id == tx["connected_account_id"],
                    BankTransaction.dedupe_hash == tx["dedupe_hash"]
                )
            ).first()

            if existing:
                # Deduplication: preserve original record, don't re-insert
                inserted.append(existing)
            else:
                new_tx = BankTransaction(**tx)
                self.db.add(new_tx)
                inserted.append(new_tx)

        self.db.commit()
        return inserted

    def get_transactions_for_account(self, account_id: UUID, user_id: UUID, limit: int = 100) -> list:
        from app.models.banking import BankTransaction
        stmt = select(BankTransaction).join(
            ConnectedAccount, BankTransaction.connected_account_id == ConnectedAccount.id
        ).where(
            ConnectedAccount.id == account_id,
            (BankTransaction.source == "DEMO") if self.db.scalar(select(ConnectedAccount.institution_name).where(ConnectedAccount.id == account_id)) == "Vestor Simulated Bank" else (BankTransaction.source != "DEMO"),
        )
        return list(self.db.scalars(
            stmt
            .where(
                BankTransaction.connected_account_id == account_id,
                BankTransaction.user_id == user_id
            )
            .order_by(BankTransaction.transaction_timestamp.desc())
            .limit(limit)
        ).all())

    def get_transactions_for_user(self, user_id: UUID, limit: int = 500, *, include_simulated: bool = False) -> list:
        from app.models.banking import BankTransaction
        stmt = select(BankTransaction).join(
            ConnectedAccount, BankTransaction.connected_account_id == ConnectedAccount.id
        ).where(BankTransaction.user_id == user_id, ConnectedAccount.user_id == user_id)
        if not include_simulated:
            stmt = stmt.where(BankTransaction.source != "DEMO", ConnectedAccount.institution_name != "Vestor Simulated Bank")
        return list(self.db.scalars(
            stmt
            .order_by(BankTransaction.transaction_timestamp.desc())
            .limit(limit)
        ).all())


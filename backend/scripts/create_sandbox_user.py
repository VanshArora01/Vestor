# -*- coding: utf-8 -*-
"""
Development utility: create a sandbox user for manual acceptance testing.

Run from the backend directory with the virtual environment active:

    python -m scripts.create_sandbox_user
"""

import logging
from uuid import uuid4
from datetime import datetime

from app.core.logging import setup_logging
from app.models.user import User
from app.models.banking import ConnectedAccount, FinancialConnection, FinancialConsent
from app.repositories.user_repository import UserRepository
from app.repositories.banking_repository import BankingRepository
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)


def main() -> None:
    setup_logging()
    db = SessionLocal()

    try:
        user_repo = UserRepository(db)
        banking_repo = BankingRepository(db)

        # Create a sandbox user
        user = user_repo.create(
            email=f"sandbox_{uuid4().hex[:8]}@vestor.test",
            password_hash="$2b$12$fakehashedpassword",  # Placeholder
            name="Sandbox User",
        )
        logger.info("Created sandbox user: %s", user.id)

        # Create a financial connection
        connection = FinancialConnection(
            user_id=user.id,
            provider="SETU_AA",
            status="ACTIVE",
            external_reference="SETU_SANDBOX_REF",
            last_synced_at=datetime.utcnow(),
        )
        db.add(connection)
        db.commit()
        db.refresh(connection)
        logger.info("Created financial connection: %s", connection.id)

        # Create a connected account
        account = ConnectedAccount(
            user_id=user.id,
            connection_id=connection.id,
            institution_name="HDFC Bank",
            account_type="SAVINGS",
            masked_account_number="****6015",
            purpose="Savings",
            status="ACTIVE",
            opening_balance=72500.00,
            balance=72500.00,
            balance_status="SYNCED",
            balance_timestamp=datetime.utcnow(),
            last_synced_at=datetime.utcnow(),
        )
        db.add(account)
        db.commit()
        db.refresh(account)
        logger.info("Created connected account: %s", account.id)

        # Create a financial consent
        consent = FinancialConsent(
            user_id=user.id,
            connection_id=connection.id,
            provider="SETU_AA",
            external_consent_id="SETU_SANDBOX_CONSENT",
            status="ACTIVE",
            consent_url="https://sandbox.setu.co/consent",
            purpose="Account Aggregation",
            expires_at=datetime.utcnow(),
            approved_at=datetime.utcnow(),
        )
        db.add(consent)
        db.commit()
        db.refresh(consent)
        logger.info("Created financial consent: %s", consent.id)

        logger.info("Sandbox user setup complete: %s", user.id)

    except Exception as e:
        logger.error("Failed to create sandbox user: %s", e)
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()
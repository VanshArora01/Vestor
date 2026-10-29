"""Schema / migration smoke checks (run once per suite via session fixtures)."""

from __future__ import annotations

import pytest
from sqlalchemy import text


@pytest.mark.migration
def test_alembic_schema_has_invest_tables(db_connection):
    # Use a short-lived transaction so the session-scoped connection stays clean.
    with db_connection.begin():
        rows = db_connection.execute(
            text(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name IN (
                    'assets',
                    'portfolio_holdings',
                    'investment_transactions',
                    'price_cache',
                    'portfolio_snapshots',
                    'users',
                    'monthly_finances',
                    'goals'
                  )
                ORDER BY table_name
                """
            )
        ).fetchall()
    names = {row[0] for row in rows}
    assert {
        "assets",
        "portfolio_holdings",
        "investment_transactions",
        "price_cache",
        "portfolio_snapshots",
        "users",
        "monthly_finances",
        "goals",
    }.issubset(names)


@pytest.mark.migration
def test_asset_universe_seed_present(db_connection):
    with db_connection.begin():
        count = db_connection.execute(
            text("SELECT COUNT(*) FROM assets WHERE metadata->>'universe_version' = 'v1'")
        ).scalar()
    assert count and count >= 10

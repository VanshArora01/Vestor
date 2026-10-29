"""Test database URL resolution and one-time schema preparation."""

from __future__ import annotations

import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine


BACKEND_ROOT = Path(__file__).resolve().parents[1]

# Default local test cluster from scripts/start_test_postgres.ps1 (trust auth, port 55432).
DEFAULT_LOCAL_TEST_DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/vestor_test"


def _can_connect(url: str, *, timeout_seconds: float = 1.0) -> bool:
    engine = None
    try:
        engine = create_engine(
            url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": max(1, int(timeout_seconds))},
        )
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
    finally:
        if engine is not None:
            engine.dispose()


def resolve_test_database_url() -> tuple[str, str]:
    """Return (url, source_label). Prefer local Postgres; never require Neon for speed."""
    test_url = os.getenv("TEST_DATABASE_URL", "").strip()
    if test_url:
        return test_url, "TEST_DATABASE_URL"

    local_url = os.getenv("VESTOR_LOCAL_TEST_DATABASE_URL", DEFAULT_LOCAL_TEST_DATABASE_URL).strip()
    if local_url and _can_connect(local_url):
        return local_url, "local_default"

    # Last resort: app DATABASE_URL (often remote Neon). Slow; warn in conftest.
    from app.core.config import get_settings

    return get_settings().database_url, "DATABASE_URL"


def create_test_engine(url: str) -> Engine:
    # NullPool: connections are not retained in a pool between checkouts.
    # Session fixture holds one connection for the whole pytest session.
    from sqlalchemy.pool import NullPool

    connect_args: dict = {}
    if "sslmode=require" in url or "neon.tech" in url:
        connect_args["sslmode"] = "require"

    return create_engine(url, pool_pre_ping=True, poolclass=NullPool, connect_args=connect_args)


def prepare_schema(engine: Engine, url: str) -> None:
    """Ensure Alembic head is applied once. Skip upgrade network work if already current."""
    expected_head = "010_create_advisor"
    with engine.connect() as conn:
        try:
            current = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
            if current == expected_head:
                conn.execute(text("SELECT 1 FROM assets LIMIT 1"))
                conn.commit()
                return
        except Exception:
            conn.rollback()

    cfg = Config(str(BACKEND_ROOT / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, "head")
    with engine.connect() as conn:
        conn.execute(text("SELECT 1 FROM assets LIMIT 1"))
        conn.commit()

from __future__ import annotations

from collections.abc import Generator
from uuid import uuid4

import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

import app.core.security as security
from app.core.security import create_access_token, hash_password
from app.db.session import get_db
from app.main import app
from app.models.user import User
from app.repositories.user_repository import UserRepository
from tests.db_utils import create_test_engine, prepare_schema, resolve_test_database_url


# ---------------------------------------------------------------------------
# Session infrastructure (expensive — once per pytest process)
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session", autouse=True)
def _fast_password_hasher() -> Generator[None, None, None]:
    """Keep auth coverage but avoid production Argon2 cost in the suite."""
    previous = security._password_hasher
    security._password_hasher = PasswordHasher(time_cost=1, memory_cost=8, parallelism=1)
    try:
        yield
    finally:
        security._password_hasher = previous


@pytest.fixture(autouse=True)
def _isolate_redis_price_cache(monkeypatch: pytest.MonkeyPatch) -> None:
    """Prevent Upstash Redis from leaking live prices into local DB tests."""
    monkeypatch.setattr(
        "app.services.market_data_service.redis_get_price",
        lambda *_args, **_kwargs: None,
    )
    monkeypatch.setattr(
        "app.services.market_data_service.redis_set_price",
        lambda *_args, **_kwargs: None,
    )


@pytest.fixture(scope="session")
def test_db_url() -> tuple[str, str]:
    return resolve_test_database_url()


@pytest.fixture(scope="session")
def test_engine(test_db_url: tuple[str, str]):
    url, source = test_db_url
    if source == "DATABASE_URL" and "neon.tech" in url:
        import warnings

        warnings.warn(
            "Tests are using remote Neon via DATABASE_URL (slow). "
            "Run backend/scripts/start_test_postgres.ps1 and/or set TEST_DATABASE_URL "
            "to a local PostgreSQL database.",
            UserWarning,
            stacklevel=1,
        )
    engine = create_test_engine(url)
    prepare_schema(engine, url)
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture(scope="session")
def db_connection(test_engine):
    connection = test_engine.connect()
    try:
        yield connection
    finally:
        connection.close()


@pytest.fixture(scope="session")
def api_client() -> Generator[TestClient, None, None]:
    with TestClient(app) as client:
        yield client


# ---------------------------------------------------------------------------
# Per-test isolation
# ---------------------------------------------------------------------------


@pytest.fixture
def db(db_connection) -> Generator[Session, None, None]:
    """Nested-transaction isolation: service commits become savepoints."""
    # Clear any leftover autobegin/transaction from session-scoped connection use
    # (e.g. migration smoke tests that SELECT without an outer fixture transaction).
    if db_connection.in_transaction():
        db_connection.rollback()
    transaction = db_connection.begin()
    session = Session(bind=db_connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        if transaction.is_active:
            transaction.rollback()
        elif db_connection.in_transaction():
            db_connection.rollback()


@pytest.fixture
def client(api_client: TestClient, db: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield api_client
    finally:
        app.dependency_overrides.pop(get_db, None)


# ---------------------------------------------------------------------------
# Auth helpers — JWT via DB user (no HTTP register round-trip)
# ---------------------------------------------------------------------------


def create_user(db: Session, *, email: str | None = None, name: str = "Test User") -> User:
    return UserRepository(db).create(
        email=email or f"test-{uuid4().hex[:8]}@example.com",
        password_hash=hash_password("password123"),
        name=name,
    )


def auth_headers(db: Session, email: str | None = None) -> dict[str, str]:
    """Create an authenticated user for API tests without HTTP /auth/register."""
    user = create_user(db, email=email)
    token = create_access_token(user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user_headers(db: Session) -> dict[str, str]:
    return auth_headers(db)


def get_allocation_categories(client: TestClient, headers: dict[str, str]) -> list[dict]:
    response = client.get("/api/v1/money/categories?kind=allocation", headers=headers)
    assert response.status_code == 200
    return response.json()


def get_spending_categories(client: TestClient, headers: dict[str, str]) -> list[dict]:
    response = client.get("/api/v1/money/categories?kind=spending", headers=headers)
    assert response.status_code == 200
    return response.json()


def category_by_slug(categories: list[dict], slug: str) -> dict:
    return next(c for c in categories if c["slug"] == slug)

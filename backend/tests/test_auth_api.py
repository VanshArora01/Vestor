"""HTTP auth register/login still covered after suite auth helpers moved to JWT."""

from uuid import uuid4

import pytest

pytestmark = pytest.mark.api


def test_register_and_me_roundtrip(client):
    email = f"auth-{uuid4().hex[:8]}@example.com"
    register = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "password123", "name": "Auth User"},
    )
    assert register.status_code == 201
    token = register.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email

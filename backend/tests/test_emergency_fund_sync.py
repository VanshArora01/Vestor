from datetime import date
from decimal import Decimal
from uuid import uuid4
from tests.conftest import auth_headers

def auth_for_new_user(db):
    return auth_headers(db, f"ef-sync-{uuid4().hex[:8]}@example.com")

def test_emergency_fund_allocation_flow(client, db):
    headers = auth_for_new_user(db)
    
    # 1. Set Income
    res = client.post("/api/v1/money/2026/8/income", json={"amount": "100000"}, headers=headers)
    assert res.status_code == 200

    # 2. Get categories list to obtain emergency fund category ID
    cats = client.get("/api/v1/money/categories?kind=allocation", headers=headers).json()
    ef_cat = next(c for c in cats if c["slug"] == "emergency-fund")
    ef_cat_id = ef_cat["id"]

    # 3. Set allocation to Emergency Fund category (10,000)
    res = client.put(
        "/api/v1/money/2026/8/allocation",
        json={"items": [{"category_id": ef_cat_id, "amount": "10000"}]},
        headers=headers
    )
    assert res.status_code == 200

    # 4. Check that Emergency Fund goal has been auto-created with 10,000 actual
    goals = client.get("/api/v1/goals", headers=headers).json()["goals"]
    ef_goal = next(g for g in goals if g["goal_type"] == "emergency_fund")
    assert ef_goal["current_amount"] == "10000.00"

    # 5. Save again with same amount - should remain 10,000 (idempotent)
    res = client.put(
        "/api/v1/money/2026/8/allocation",
        json={"items": [{"category_id": ef_cat_id, "amount": "10000"}]},
        headers=headers
    )
    assert res.status_code == 200
    goals = client.get("/api/v1/goals", headers=headers).json()["goals"]
    ef_goal = next(g for g in goals if g["goal_type"] == "emergency_fund")
    assert ef_goal["current_amount"] == "10000.00"

    # 6. Change allocation: 10,000 -> 8,000
    res = client.put(
        "/api/v1/money/2026/8/allocation",
        json={"items": [{"category_id": ef_cat_id, "amount": "8000"}]},
        headers=headers
    )
    assert res.status_code == 200
    goals = client.get("/api/v1/goals", headers=headers).json()["goals"]
    ef_goal = next(g for g in goals if g["goal_type"] == "emergency_fund")
    assert ef_goal["current_amount"] == "8000.00"

    # 7. Add allocation for another month (September 2026) -> should accumulate (8,000 + 5,000 = 13,000)
    res = client.post("/api/v1/money/2026/9/income", json={"amount": "100000"}, headers=headers)
    assert res.status_code == 200

    res = client.put(
        "/api/v1/money/2026/9/allocation",
        json={"items": [{"category_id": ef_cat_id, "amount": "5000"}]},
        headers=headers
    )
    assert res.status_code == 200

    goals = client.get("/api/v1/goals", headers=headers).json()["goals"]
    ef_goal = next(g for g in goals if g["goal_type"] == "emergency_fund")
    assert ef_goal["current_amount"] == "13000.00"

    # 8. Setting allocation to 0 in September -> should reduce back to 8,000
    res = client.put(
        "/api/v1/money/2026/9/allocation",
        json={"items": []},
        headers=headers
    )
    assert res.status_code == 200
    goals = client.get("/api/v1/goals", headers=headers).json()["goals"]
    ef_goal = next(g for g in goals if g["goal_type"] == "emergency_fund")
    assert ef_goal["current_amount"] == "8000.00"

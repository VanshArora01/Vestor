import sys
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.db.session import SessionLocal

db = SessionLocal()
user = db.query(User).first()

if not user:
    print("No user found.")
    sys.exit(1)

# Override auth dependency
app.dependency_overrides[get_current_user] = lambda: user

client = TestClient(app)

endpoints = [
    "/api/v1/banking/balances/aggregate",
    "/api/v1/goals/",
    "/api/v1/banking/connections",
    "/api/v1/money/months",
    "/api/v1/money/2026/8",
]

print(f"Testing for user: {user.email}")
for ep in endpoints:
    resp = client.get(ep)
    print(f"{ep}: {resp.status_code}")
    if resp.status_code != 200:
        print(f"  Error: {resp.text}")

# Get an account ID for the last test
from app.models.banking import ConnectedAccount
account = db.query(ConnectedAccount).first()
if account:
    ep = f"/api/v1/banking/accounts/{account.id}"
    resp = client.get(ep)
    print(f"{ep}: {resp.status_code}")
    if resp.status_code != 200:
        print(f"  Error: {resp.text}")
else:
    print("No account found to test account detail endpoint.")

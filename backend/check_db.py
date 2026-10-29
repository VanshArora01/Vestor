import sys
from app.db.session import engine
from sqlalchemy import inspect

inspector = inspect(engine)
columns = inspector.get_columns('connected_accounts')
print("Columns in connected_accounts:")
for c in columns:
    print(f"- {c['name']}")

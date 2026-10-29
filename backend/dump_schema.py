import sys
from app.db.session import engine
from sqlalchemy import inspect
import json

inspector = inspect(engine)
schema = {}
for table_name in inspector.get_table_names():
    schema[table_name] = [c['name'] for c in inspector.get_columns(table_name)]

with open("db_schema.json", "w") as f:
    json.dump(schema, f, indent=2)

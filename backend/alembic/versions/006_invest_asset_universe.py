"""Seed Invest asset universe v1 and search indexes

Revision ID: 006_invest_asset_universe
Revises: 005_create_invest
Create Date: 2026-08-09

Loads backend/data/invest_assets_universe_v1.json — a curated initial universe,
not a complete Indian market listing. Replaceable by a later sync job.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "006_invest_asset_universe"
down_revision: Union[str, None] = "005_create_invest"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

UNIVERSE_PATH = Path(__file__).resolve().parents[2] / "data" / "invest_assets_universe_v1.json"


def upgrade() -> None:
    op.create_index(
        "ix_assets_name_lower",
        "assets",
        [sa.text("lower(name)")],
    )
    op.create_index(
        "ix_assets_symbol_lower",
        "assets",
        [sa.text("lower(symbol)")],
        postgresql_where=sa.text("symbol IS NOT NULL"),
    )
    op.create_index(
        "ix_assets_provider_symbol_lower",
        "assets",
        [sa.text("lower(provider_symbol)")],
        postgresql_where=sa.text("provider_symbol IS NOT NULL"),
    )
    op.create_index(
        "uq_assets_symbol_exchange",
        "assets",
        ["symbol", "exchange"],
        unique=True,
        postgresql_where=sa.text("symbol IS NOT NULL AND exchange IS NOT NULL"),
    )

    payload = json.loads(UNIVERSE_PATH.read_text(encoding="utf-8"))
    assets_table = sa.table(
        "assets",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("asset_type", sa.String),
        sa.column("symbol", sa.String),
        sa.column("exchange", sa.String),
        sa.column("name", sa.String),
        sa.column("provider_symbol", sa.String),
        sa.column("isin", sa.String),
        sa.column("active", sa.Boolean),
        sa.column("metadata", postgresql.JSONB),
    )
    rows = []
    for item in payload["assets"]:
        rows.append(
            {
                "id": item["id"],
                "asset_type": item["asset_type"],
                "symbol": item.get("symbol"),
                "exchange": item.get("exchange"),
                "name": item["name"],
                "provider_symbol": item.get("provider_symbol"),
                "isin": item.get("isin"),
                "active": bool(item.get("active", True)),
                "metadata": {"universe_version": payload["version"]},
            }
        )
    op.bulk_insert(assets_table, rows)


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM assets WHERE metadata->>'universe_version' = 'v1'"))

    op.drop_index("uq_assets_symbol_exchange", table_name="assets")
    op.drop_index("ix_assets_provider_symbol_lower", table_name="assets")
    op.drop_index("ix_assets_symbol_lower", table_name="assets")
    op.drop_index("ix_assets_name_lower", table_name="assets")

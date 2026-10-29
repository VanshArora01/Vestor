"""Market-data Redis cache key helpers — keep key format in one place."""

from __future__ import annotations

from uuid import UUID

PRICE_CACHE_PREFIX = "vestor:price"


def price_cache_key(asset_id: UUID | str) -> str:
    return f"{PRICE_CACHE_PREFIX}:{asset_id}"

"""Redis serialization helpers for latest prices."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from app.core.config import get_settings
from app.core.redis_client import get_redis_client
from app.market_data.cache_keys import price_cache_key
from app.market_data.types import LatestPrice, PriceStatus

logger = logging.getLogger(__name__)


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value)


def serialize_latest_price(price: LatestPrice) -> str:
    payload = {
        "asset_id": str(price.asset_id),
        "provider": price.provider,
        "provider_symbol": price.provider_symbol,
        "price": str(price.price) if price.price is not None else None,
        "previous_close": str(price.previous_close) if price.previous_close is not None else None,
        "currency": price.currency,
        "price_timestamp": price.price_timestamp.isoformat() if price.price_timestamp else None,
        "fetched_at": price.fetched_at.isoformat() if price.fetched_at else None,
        "status": str(price.status),
        "error_message": price.error_message,
    }
    return json.dumps(payload)


def deserialize_latest_price(raw: str) -> LatestPrice | None:
    try:
        data: dict[str, Any] = json.loads(raw)
        price_raw = data.get("price")
        return LatestPrice(
            asset_id=UUID(str(data["asset_id"])),
            provider=data.get("provider"),
            provider_symbol=data.get("provider_symbol"),
            price=Decimal(str(price_raw)) if price_raw is not None else None,
            previous_close=Decimal(str(data["previous_close"])) if data.get("previous_close") is not None else None,
            currency=data.get("currency"),
            price_timestamp=_parse_dt(data.get("price_timestamp")),
            fetched_at=_parse_dt(data.get("fetched_at")),
            status=PriceStatus(str(data.get("status") or PriceStatus.UNAVAILABLE)),
            error_message=data.get("error_message"),
            source="redis",
        )
    except Exception:
        logger.warning("Failed to deserialize Redis price payload", exc_info=True)
        return None


def redis_get_price(asset_id: UUID) -> LatestPrice | None:
    try:
        raw = get_redis_client().get(price_cache_key(asset_id))
        if not raw:
            return None
        return deserialize_latest_price(raw)
    except Exception:
        logger.warning("Redis get failed asset_id=%s", asset_id, exc_info=True)
        return None


def redis_set_price(price: LatestPrice) -> None:
    if price.price is None:
        return
    try:
        ttl = get_settings().market_data_redis_ttl_seconds
        get_redis_client().setex(
            price_cache_key(price.asset_id),
            ttl,
            serialize_latest_price(price),
        )
    except Exception:
        logger.warning("Redis set failed asset_id=%s", price.asset_id, exc_info=True)

"""Shared Redis client for application caching (same REDIS_URL as Celery broker)."""

from __future__ import annotations

import logging
import ssl
from functools import lru_cache
from typing import Any
from urllib.parse import urlparse, urlunparse

import redis

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _normalize_redis_url(url: str) -> str:
    """Upstash often ships redis:// URLs that still require TLS (Celery forces SSL)."""
    parsed = urlparse(url)
    if parsed.scheme == "rediss":
        return url
    host = (parsed.hostname or "").lower()
    if "upstash.io" in host or parsed.scheme == "redis":
        # Prefer rediss:// so redis-py negotiates TLS the same way Celery does.
        if "upstash.io" in host and parsed.scheme == "redis":
            return urlunparse(("rediss", parsed.netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))
    return url


@lru_cache
def get_redis_client() -> redis.Redis:
    """Return a Redis client configured from REDIS_URL (supports Upstash TLS)."""
    settings = get_settings()
    url = _normalize_redis_url(settings.redis_url)
    parsed = urlparse(url)
    kwargs: dict[str, Any] = {
        "decode_responses": True,
        "socket_connect_timeout": 5,
        "socket_timeout": 5,
    }
    if parsed.scheme == "rediss":
        kwargs["ssl_cert_reqs"] = ssl.CERT_REQUIRED
    client = redis.Redis.from_url(url, **kwargs)
    return client


def ping_redis() -> bool:
    try:
        return bool(get_redis_client().ping())
    except Exception as exc:
        logger.warning("Redis ping failed: %s", type(exc).__name__)
        return False

"""
Pluggable cache for screening payloads (v1 in-memory, v2 Redis-compatible interface).
"""

from __future__ import annotations

import threading
import time
from abc import ABC, abstractmethod
from typing import Any


class CacheService(ABC):
    """Abstract cache; swap InMemoryCacheService for RedisCacheService in production."""

    @abstractmethod
    def get(self, key: str) -> Any | None:
        """Return cached value if still valid, else None."""

    @abstractmethod
    def set(self, key: str, data: Any, ttl_seconds: float) -> None:
        """Store data with TTL from now."""

    @abstractmethod
    def delete(self, key: str) -> None:
        """Invalidate one key."""


class InMemoryCacheService(CacheService):
    """Thread-safe TTL cache (single-process)."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._store: dict[str, dict[str, Any]] = {}

    def get(self, key: str) -> Any | None:
        now = time.monotonic()
        with self._lock:
            entry = self._store.get(key)
            if not entry:
                return None
            if now > float(entry["expires_at"]):
                del self._store[key]
                return None
            return entry.get("data")

    def set(self, key: str, data: Any, ttl_seconds: float) -> None:
        now = time.monotonic()
        with self._lock:
            self._store[key] = {"data": data, "expires_at": now + ttl_seconds, "timestamp": now}

    def delete(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)


# Process-wide singleton for screening (routes import this instance)
screening_cache = InMemoryCacheService()

SCREENING_CACHE_TTL_SECONDS = 300.0


def screening_cache_key(symbol: str, exchange: str | None) -> str:
    ex = (exchange or "").strip().upper() or "_"
    return f"screen:{symbol.strip().upper()}:{ex}"

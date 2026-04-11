"""Extra per-IP budget for heavy public screening and discovery routes."""

from __future__ import annotations

import threading
import time
from collections import defaultdict

from fastapi import HTTPException, Request

_lock = threading.RLock()
_hits: dict[str, list[float]] = defaultdict(list)
_WINDOW_SEC = 60.0
_MAX_PER_WINDOW = 45


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def enforce_screening_budget(request: Request) -> None:
    ip = _client_ip(request)
    now = time.monotonic()
    with _lock:
        lst = _hits[ip]
        lst[:] = [t for t in lst if now - t < _WINDOW_SEC]
        if len(lst) >= _MAX_PER_WINDOW:
            raise HTTPException(
                status_code=429,
                detail="Screening rate limit exceeded. Please wait a minute and try again.",
            )
        lst.append(now)

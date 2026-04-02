"""
Simple in-memory rate limiting middleware.

Uses a token bucket per IP address. Production deployments should use
Redis-backed rate limiting (e.g., fastapi-limiter) for multi-process support.
"""

import time
from collections import defaultdict
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class _TokenBucket:
    __slots__ = ("capacity", "refill_rate", "tokens", "last_refill")

    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate  # tokens per second
        self.tokens = float(capacity)
        self.last_refill = time.monotonic()

    def consume(self) -> bool:
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting by client IP.

    Args:
        app: ASGI application
        requests_per_minute: Max requests per minute per IP (default 60)
        burst: Max burst size (default 20)
    """

    def __init__(self, app, requests_per_minute: int = 60, burst: int = 20):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.burst = burst
        self.refill_rate = requests_per_minute / 60.0
        self._buckets: dict[str, _TokenBucket] = defaultdict(
            lambda: _TokenBucket(burst, self.refill_rate)
        )
        self._last_cleanup = time.monotonic()

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _cleanup_stale_buckets(self):
        """Remove buckets that haven't been used in 10 minutes."""
        now = time.monotonic()
        if now - self._last_cleanup < 300:  # cleanup every 5 min
            return
        self._last_cleanup = now
        stale = [
            ip for ip, bucket in self._buckets.items()
            if now - bucket.last_refill > 600
        ]
        for ip in stale:
            del self._buckets[ip]

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip rate limiting for health checks
        if request.url.path in ("/", "/health"):
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        bucket = self._buckets[client_ip]

        if not bucket.consume():
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down."},
                headers={"Retry-After": str(int(60 / self.requests_per_minute) + 1)},
            )

        self._cleanup_stale_buckets()
        response = await call_next(request)
        return response

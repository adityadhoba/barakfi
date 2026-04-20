"""
HTTP session helper for NSE public endpoints.

NSE's website requires:
  1. Browser-like headers (User-Agent, Accept, Accept-Language, Referer, sec-fetch-*)
  2. A session cookie obtained by visiting the homepage first
  3. Cookie persistence across requests — a NEW session per request will be blocked

Architecture:
  NSESession wraps a single httpx.Client that lives for the duration of a
  pipeline run.  Call warm() once at the start of a batch, then reuse the
  instance for all symbol requests.  The session is re-warmed automatically
  when a 403 is detected (rate-limit/session-expiry).

  If NSE continues to return 403 after re-warming, the server's IP may be
  blocked by NSE at a network level (known to happen on cloud provider IPs).
  In that case, the yfinance fallback in fundamentals_sync.py takes over.
"""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx

logger = logging.getLogger("barakfi.nse")

# Complete browser header set that NSE's Cloudflare/bot-detection checks
_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/123.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "keep-alive",
    "Referer": "https://www.nseindia.com/",
    "Origin": "https://www.nseindia.com",
    "sec-ch-ua": '"Google Chrome";v="123", "Not:A-Brand";v="8"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "DNT": "1",
}

_WARM_URLS = [
    "https://www.nseindia.com/",
    "https://www.nseindia.com/market-data/live-equity-market",
]


class NSESession:
    """
    Persistent httpx session for NSE API calls.

    Usage (typical pipeline pattern):
        session = NSESession(timeout=60.0)
        session.warm()                    # once per batch
        code, data, hdrs = session.get(url1)
        code, data, hdrs = session.get(url2)
        # ... 500 symbols later ...
        session.close()

    Or use as a context manager:
        with NSESession() as session:
            session.warm()
            code, data, hdrs = session.get(url)
    """

    def __init__(self, timeout: float = 60.0) -> None:
        self._timeout = timeout
        self._client: httpx.Client | None = None
        self._warm_at: float = 0.0

    def _make_client(self) -> httpx.Client:
        return httpx.Client(
            timeout=self._timeout,
            follow_redirects=True,
            http2=False,  # NSE can misbehave with HTTP/2 from servers
        )

    def warm(self) -> bool:
        """
        Visit NSE homepage + live market page to obtain session cookies.
        Returns True if warming succeeded (2xx response on at least one page).
        """
        if self._client is None:
            self._client = self._make_client()

        ok = False
        for url in _WARM_URLS:
            try:
                r = self._client.get(url, headers=_BROWSER_HEADERS)
                logger.debug("NSE warm %s → %d", url, r.status_code)
                if r.status_code < 400:
                    ok = True
                    time.sleep(0.3)  # be polite
            except Exception as exc:
                logger.debug("NSE warm failed for %s: %s", url, exc)
        self._warm_at = time.monotonic()
        return ok

    def get(self, url: str) -> tuple[int, bytes, dict[str, Any]]:
        """
        Fetch *url* using the persistent session.  Re-warms automatically
        on 403 (session expired) and retries once.
        """
        if self._client is None:
            self._client = self._make_client()
            self.warm()

        for attempt in range(2):
            try:
                r = self._client.get(url, headers=_BROWSER_HEADERS)
                if r.status_code == 403 and attempt == 0:
                    logger.info("NSE 403 on attempt 0 — re-warming session")
                    time.sleep(2.0)
                    self.warm()
                    continue
                headers = {k.lower(): v for k, v in r.headers.items()}
                return r.status_code, r.content, headers
            except Exception as exc:
                logger.warning("NSE GET %s failed attempt %d: %s", url, attempt, exc)
                if attempt == 0:
                    time.sleep(1.0)
        return 0, b"", {}

    def close(self) -> None:
        if self._client is not None:
            try:
                self._client.close()
            except Exception:
                pass
            self._client = None

    def __enter__(self) -> "NSESession":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()


# ---------------------------------------------------------------------------
# Legacy single-call API (kept for backward compatibility)
# Creates a temporary session per call — suitable for one-off fetches only,
# not for batches of 500 symbols.
# ---------------------------------------------------------------------------

class NSEClient:
    """
    Single-call NSE client.  Kept for backward compatibility.
    For batch jobs, prefer NSESession which persists cookies across calls.
    """

    def __init__(self, timeout: float = 60.0) -> None:
        self._timeout = timeout

    def fetch_bytes(self, url: str) -> tuple[int, bytes, dict[str, Any]]:
        with NSESession(timeout=self._timeout) as session:
            session.warm()
            return session.get(url)

    def fetch_text(self, url: str) -> tuple[int, str]:
        code, data, _ = self.fetch_bytes(url)
        text = data.decode("utf-8", errors="replace")
        return code, text

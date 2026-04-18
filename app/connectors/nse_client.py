"""HTTP session helper for NSE public endpoints (cookies + polite headers)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger("barakfi.nse")

NSE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "*/*",
    "Accept-Language": "en-GB,en;q=0.9",
}


class NSEClient:
    """Minimal client: warm session then fetch URLs."""

    def __init__(self, timeout: float = 60.0) -> None:
        self._timeout = timeout

    def fetch_bytes(self, url: str) -> tuple[int, bytes, dict[str, Any]]:
        with httpx.Client(timeout=self._timeout, follow_redirects=True) as client:
            client.get("https://www.nseindia.com/", headers=NSE_HEADERS)
            r = client.get(url, headers=NSE_HEADERS)
            headers = {k.lower(): v for k, v in r.headers.items()}
            return r.status_code, r.content, headers

    def fetch_text(self, url: str) -> tuple[int, str]:
        code, data, _ = self.fetch_bytes(url)
        text = data.decode("utf-8", errors="replace")
        return code, text

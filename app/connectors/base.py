"""
Base connector utilities: HTTP session, retry logic, content hashing, raw artifact recording.

All connectors inherit from BaseConnector which provides:
- Polite HTTP session with exponential backoff + jitter
- content_sha256 computation
- Raw artifact recording via upsert
"""

from __future__ import annotations

import hashlib
import io
import logging
import random
import time
from datetime import datetime, timezone
from typing import Optional, Tuple
from uuid import uuid4

import httpx

logger = logging.getLogger("barakfi.connector")

UTC = timezone.utc

# NSE requires a browser-like User-Agent and a Referer to serve CSV downloads.
NSE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/122.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
    "Referer": "https://www.nseindia.com/",
}

BSE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/122.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
    "Referer": "https://www.bseindia.com/",
}

# Retry policy: 3 network/5xx attempts
_RETRY_DELAYS = [2.0, 10.0, 30.0]  # seconds before each retry


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _jitter(base: float, spread: float = 0.3) -> float:
    return base + random.uniform(0, base * spread)


class FetchError(Exception):
    """Raised when a fetch fails after all retries."""


class BaseConnector:
    """
    Thin HTTP wrapper with retry/backoff and artifact recording.

    Subclasses should call self.fetch(url) instead of using httpx directly.
    Every successful fetch is optionally saved as a RawArtifact via record_artifact().
    """

    source_name: str = "unknown"
    default_headers: dict = {}

    def __init__(self, timeout: int = 60, max_retries: int = 3):
        self.timeout = timeout
        self.max_retries = max_retries
        self._session: Optional[httpx.Client] = None

    def _get_session(self) -> httpx.Client:
        if self._session is None or self._session.is_closed:
            self._session = httpx.Client(
                headers=self.default_headers,
                timeout=self.timeout,
                follow_redirects=True,
            )
        return self._session

    def fetch(self, url: str, extra_headers: Optional[dict] = None) -> Tuple[bytes, int]:
        """
        Fetch a URL with retry/backoff.

        Returns (content_bytes, http_status).
        Raises FetchError after max_retries exhausted.
        """
        session = self._get_session()
        headers = {**self.default_headers}
        if extra_headers:
            headers.update(extra_headers)

        last_exc: Exception = Exception("No attempts made")
        for attempt, delay in enumerate([0.0] + _RETRY_DELAYS[: self.max_retries - 1]):
            if delay > 0:
                sleep_time = _jitter(delay)
                logger.info(
                    "[%s] Retry %d for %s — sleeping %.1fs",
                    self.source_name, attempt, url, sleep_time,
                )
                time.sleep(sleep_time)
            try:
                resp = session.get(url, headers=headers)
                if resp.status_code == 429:
                    # Rate limited — back off longer
                    back = _jitter(30.0)
                    logger.warning("[%s] 429 on %s — sleeping %.0fs", self.source_name, url, back)
                    time.sleep(back)
                    continue
                if resp.status_code >= 500:
                    logger.warning(
                        "[%s] HTTP %d on %s, will retry", self.source_name, resp.status_code, url
                    )
                    last_exc = FetchError(f"HTTP {resp.status_code}")
                    continue
                resp.raise_for_status()
                return resp.content, resp.status_code
            except (httpx.TimeoutException, httpx.NetworkError) as exc:
                logger.warning("[%s] Network error on %s: %s", self.source_name, url, exc)
                last_exc = exc

        raise FetchError(f"[{self.source_name}] Failed after {self.max_retries} retries: {url}") from last_exc

    def record_artifact(
        self,
        db_session,
        url: str,
        content: bytes,
        source_kind: str,
        published_at: Optional[datetime] = None,
        job_run_id: Optional[int] = None,
        source_ref: Optional[str] = None,
        http_status: int = 200,
    ) -> "RawArtifact":  # noqa: F821
        """
        Upsert a RawArtifact row for the fetched content.

        Uses INSERT OR IGNORE style: if the same (source_name, source_url, sha256)
        already exists, return the existing row.
        """
        from app.models_v2 import RawArtifact
        from sqlalchemy.exc import IntegrityError

        sha = sha256_bytes(content)
        existing = (
            db_session.query(RawArtifact)
            .filter_by(source_name=self.source_name, source_url=url, content_sha256=sha)
            .first()
        )
        if existing:
            logger.debug("[%s] Artifact already recorded: %s (%s)", self.source_name, url, sha[:12])
            return existing

        artifact = RawArtifact(
            job_run_id=job_run_id,
            source_name=self.source_name,
            source_kind=source_kind,
            source_url=url,
            source_ref=source_ref,
            published_at=published_at,
            fetched_at=datetime.now(UTC),
            http_status=http_status,
            content_sha256=sha,
            parse_status="pending",
        )
        try:
            db_session.add(artifact)
            db_session.flush()
        except IntegrityError:
            db_session.rollback()
            artifact = (
                db_session.query(RawArtifact)
                .filter_by(source_name=self.source_name, source_url=url, content_sha256=sha)
                .first()
            )
        return artifact

    def close(self):
        if self._session and not self._session.is_closed:
            self._session.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

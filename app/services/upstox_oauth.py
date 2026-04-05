"""Upstox OAuth2 helpers — state signing."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import httpx

from app.config import INTERNAL_SERVICE_TOKEN, UPSTOX_API_KEY, UPSTOX_API_SECRET, UPSTOX_REDIRECT_URI

STATE_MAX_AGE_SEC = 600

UPSTOX_AUTH_URL = "https://api.upstox.com/v2/login/authorization/dialog"
UPSTOX_TOKEN_URL = "https://api.upstox.com/v2/login/authorization/token"


def _signing_key() -> bytes:
    return (INTERNAL_SERVICE_TOKEN or "dev-broker-state").encode()


def create_oauth_state(auth_subject: str) -> str:
    payload = {"sub": auth_subject, "ts": int(time.time())}
    raw = json.dumps(payload, separators=(",", ":")).encode()
    sig = hmac.new(_signing_key(), raw, hashlib.sha256).digest()
    token = base64.urlsafe_b64encode(raw + b"." + sig).decode().rstrip("=")
    return token


def verify_oauth_state(state: str) -> str | None:
    if not state:
        return None
    try:
        pad = "=" * (-len(state) % 4)
        decoded = base64.urlsafe_b64decode(state + pad)
        raw, sep, sig = decoded.rpartition(b".")
        if sep != b"." or not raw or not sig:
            return None
        expected = hmac.new(_signing_key(), raw, hashlib.sha256).digest()
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(raw.decode())
        sub = payload.get("sub")
        ts = int(payload.get("ts", 0))
        if not sub or (time.time() - ts) > STATE_MAX_AGE_SEC:
            return None
        return str(sub)
    except Exception:
        return None


def build_authorize_url(state: str) -> str:
    if not UPSTOX_API_KEY or not UPSTOX_REDIRECT_URI:
        raise ValueError("UPSTOX_API_KEY and UPSTOX_REDIRECT_URI must be set")
    q = urlencode(
        {
            "response_type": "code",
            "client_id": UPSTOX_API_KEY,
            "redirect_uri": UPSTOX_REDIRECT_URI,
            "state": state,
        }
    )
    return f"{UPSTOX_AUTH_URL}?{q}"


def exchange_code_for_token(code: str) -> dict:
    if not all([UPSTOX_API_KEY, UPSTOX_API_SECRET, UPSTOX_REDIRECT_URI]):
        raise ValueError("Upstox credentials not configured")
    data = {
        "code": code,
        "client_id": UPSTOX_API_KEY,
        "client_secret": UPSTOX_API_SECRET,
        "redirect_uri": UPSTOX_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    with httpx.Client(timeout=30.0) as client:
        r = client.post(
            UPSTOX_TOKEN_URL,
            headers={"accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"},
            data=data,
        )
    if r.status_code != 200:
        try:
            detail = r.json()
        except Exception:
            detail = r.text
        raise RuntimeError(f"Upstox token exchange failed: {r.status_code} {detail}")
    return r.json()

"""Encrypt broker access tokens at rest using Fernet."""

from __future__ import annotations

import base64
import hashlib
import os

from cryptography.fernet import Fernet

from app.config import INTERNAL_SERVICE_TOKEN


def _fernet() -> Fernet:
    env_key = os.getenv("BROKER_TOKEN_ENCRYPTION_KEY", "").strip()
    if env_key:
        return Fernet(env_key.encode() if isinstance(env_key, str) else env_key)
    digest = hashlib.sha256((INTERNAL_SERVICE_TOKEN or "dev").encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_token(plain: str) -> str:
    return _fernet().encrypt(plain.encode()).decode()


def decrypt_token(enc: str) -> str:
    return _fernet().decrypt(enc.encode()).decode()

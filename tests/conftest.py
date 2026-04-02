import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services import auth_service  # noqa: E402

ADMIN_SUBJECT = "google-oauth2|aditya-seed"
ADMIN_CLAIMS = {"sub": ADMIN_SUBJECT, "azp": "http://localhost:3000"}


@pytest.fixture()
def mock_admin_auth(monkeypatch):
    """Patch verify_clerk_token to return admin claims."""
    monkeypatch.setattr(
        auth_service,
        "verify_clerk_token",
        lambda _token: ADMIN_CLAIMS,
    )


@pytest.fixture()
def mock_auth(monkeypatch):
    """
    Factory fixture: returns a callable that patches verify_clerk_token
    with the given subject.

    Usage:
        def test_something(mock_auth):
            mock_auth("my-custom-subject")
            ...
    """

    def _set_subject(subject: str):
        monkeypatch.setattr(
            auth_service,
            "verify_clerk_token",
            lambda _token: {"sub": subject, "azp": "http://localhost:3000"},
        )

    return _set_subject

"""Uniform JSON envelope for API responses."""

from __future__ import annotations

from typing import Any

from app.config import API_ENVELOPE_LEGACY


def api_success(data: Any, legacy: Any | None = None) -> dict[str, Any]:
    body: dict[str, Any] = {"success": True, "data": data, "error": None}
    if API_ENVELOPE_LEGACY and legacy is not None:
        body["legacy"] = legacy
    return body


def api_error(message: str, code: str | None = None, extra: dict[str, Any] | None = None) -> dict[str, Any]:
    err: dict[str, Any] = {"message": message}
    if code:
        err["code"] = code
    if extra:
        err.update(extra)
    return {"success": False, "data": None, "error": err}

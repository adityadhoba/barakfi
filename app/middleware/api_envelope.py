"""
Wrap JSON responses for /api/* in { success, data, error } without editing every route.

Skips responses that already look enveloped. Does not wrap non-JSON or redirects.
"""

from __future__ import annotations

import json
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.api.envelope import api_error, api_success


def _is_already_enveloped(payload: Any) -> bool:
    return (
        isinstance(payload, dict)
        and "success" in payload
        and "data" in payload
        and "error" in payload
    )


class ApiEnvelopeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        path = request.url.path or ""
        if not path.startswith("/api"):
            return response

        ct = (response.headers.get("content-type") or "").lower()
        if "application/json" not in ct:
            return response

        chunks: list[bytes] = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)
        raw = b"".join(chunks)

        try:
            payload = json.loads(raw.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return Response(
                content=raw,
                status_code=response.status_code,
                headers={k: v for k, v in response.headers.items() if k.lower() != "content-length"},
                media_type=response.media_type,
            )

        hdrs = {k: v for k, v in response.headers.items() if k.lower() != "content-length"}

        if _is_already_enveloped(payload):
            return JSONResponse(content=payload, status_code=response.status_code, headers=hdrs)

        if 200 <= response.status_code < 300:
            return JSONResponse(content=api_success(payload), status_code=response.status_code, headers=hdrs)

        if isinstance(payload, dict) and "detail" in payload:
            detail = payload["detail"]
            msg = detail if isinstance(detail, str) else json.dumps(detail)
        else:
            msg = json.dumps(payload) if not isinstance(payload, str) else payload
        return JSONResponse(content=api_error(msg), status_code=response.status_code, headers=hdrs)

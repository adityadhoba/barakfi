"""Daily screening quota enforcement (Postgres-backed)."""

from __future__ import annotations

import hashlib
import os
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from starlette.requests import Request

from app.models import ScreeningQuota

FREE_SCREENS_PER_DAY = int(os.getenv("FREE_SCREENS_PER_DAY", "5"))


def _actor_key(request: Request) -> str:
    """Resolve actor: Clerk userId header or hashed IP."""
    user_id = request.headers.get("x-clerk-user-id")
    if user_id:
        return f"user:{user_id}"
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    return f"ip:{hashlib.sha256(ip.encode()).hexdigest()[:16]}"


def check_and_increment_quota(db: Session, request: Request) -> dict:
    """Check if actor has remaining screens today. Increments on success."""
    actor = _actor_key(request)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    row = (
        db.query(ScreeningQuota)
        .filter(ScreeningQuota.actor_key == actor, ScreeningQuota.date == today)
        .first()
    )

    if row and row.count >= FREE_SCREENS_PER_DAY:
        return {
            "allowed": False,
            "remaining": 0,
            "resets_at": f"{today}T23:59:59Z",
        }

    if row:
        row.count += 1
    else:
        row = ScreeningQuota(actor_key=actor, date=today, count=1)
        db.add(row)

    db.flush()

    return {
        "allowed": True,
        "remaining": max(0, FREE_SCREENS_PER_DAY - row.count),
        "resets_at": f"{today}T23:59:59Z",
    }

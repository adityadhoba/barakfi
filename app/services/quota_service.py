"""Daily screening quota enforcement (Postgres-backed) with IST day boundary."""

from __future__ import annotations

import hashlib
import os
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session
from starlette.requests import Request

from app.models import ScreeningQuota, ScreeningAccessLog

ANON_SCREENS_PER_DAY = int(os.getenv("ANON_SCREENS_PER_DAY", "2"))
AUTH_SCREENS_PER_DAY = int(os.getenv("AUTH_SCREENS_PER_DAY", "5"))
COMPARE_PER_DAY = int(os.getenv("COMPARE_PER_DAY", "1"))
PEER_COMPARISON_PER_DAY = int(os.getenv("PEER_COMPARISON_PER_DAY", "1"))

IST = timezone(timedelta(hours=5, minutes=30))


def _ist_today() -> str:
    """Current date string in IST (YYYY-MM-DD)."""
    return datetime.now(IST).strftime("%Y-%m-%d")


def _ist_midnight_utc() -> str:
    """Next midnight IST expressed as UTC ISO string for resets_at."""
    now_ist = datetime.now(IST)
    tomorrow_ist = (now_ist + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return tomorrow_ist.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _actor_key(request: Request) -> str:
    """Resolve actor: Clerk userId header or hashed IP."""
    user_id = request.headers.get("x-clerk-user-id")
    if user_id:
        return f"user:{user_id}"
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = (
        forwarded.split(",")[0].strip()
        if forwarded
        else (request.client.host if request.client else "unknown")
    )
    return f"ip:{hashlib.sha256(ip.encode()).hexdigest()[:16]}"


def _is_authenticated(request: Request) -> bool:
    return bool(request.headers.get("x-clerk-user-id"))


def _is_admin(request: Request) -> bool:
    from app.config import ADMIN_EMAILS, ADMIN_AUTH_SUBJECTS

    user_id = request.headers.get("x-clerk-user-id", "")
    email = request.headers.get("x-actor-email", "").lower()
    if user_id and user_id in ADMIN_AUTH_SUBJECTS:
        return True
    if email and email in ADMIN_EMAILS:
        return True
    return False


def _check_quota(
    db: Session,
    request: Request,
    quota_type: str,
    limit: int | None = None,
) -> dict:
    """Generic quota check+increment for a given quota_type."""
    if _is_admin(request):
        return {
            "allowed": True,
            "remaining": 999,
            "resets_at": _ist_midnight_utc(),
        }

    actor = _actor_key(request)
    today = _ist_today()

    if limit is None:
        limit = AUTH_SCREENS_PER_DAY if _is_authenticated(request) else ANON_SCREENS_PER_DAY

    row = (
        db.query(ScreeningQuota)
        .filter(
            ScreeningQuota.actor_key == actor,
            ScreeningQuota.date == today,
            ScreeningQuota.quota_type == quota_type,
        )
        .first()
    )

    resets_at = _ist_midnight_utc()

    if row and row.count >= limit:
        return {"allowed": False, "remaining": 0, "resets_at": resets_at}

    if row:
        row.count += 1
    else:
        row = ScreeningQuota(
            actor_key=actor, date=today, count=1, quota_type=quota_type
        )
        db.add(row)

    db.flush()

    return {
        "allowed": True,
        "remaining": max(0, limit - row.count),
        "resets_at": resets_at,
    }


def check_and_increment_quota(db: Session, request: Request) -> dict:
    """Check if actor has remaining screens today. Increments on success."""
    return _check_quota(db, request, "screen")


def check_compare_quota(db: Session, request: Request) -> dict:
    return _check_quota(db, request, "compare", COMPARE_PER_DAY)


def check_peer_quota(db: Session, request: Request) -> dict:
    return _check_quota(db, request, "peer", PEER_COMPARISON_PER_DAY)


def _quota_used_today(
    db: Session, actor: str, today: str, quota_type: str
) -> int:
    row = (
        db.query(ScreeningQuota)
        .filter(
            ScreeningQuota.actor_key == actor,
            ScreeningQuota.date == today,
            ScreeningQuota.quota_type == quota_type,
        )
        .first()
    )
    return row.count if row else 0


def get_quota_status(db: Session, request: Request) -> dict:
    """Read-only quota status without incrementing."""
    actor = _actor_key(request)
    today = _ist_today()
    is_auth = _is_authenticated(request)
    admin = _is_admin(request)
    limit = 999 if admin else (AUTH_SCREENS_PER_DAY if is_auth else ANON_SCREENS_PER_DAY)

    used = _quota_used_today(db, actor, today, "screen")

    screened = get_accessible_symbols(db, request)

    cmp_limit = 999 if admin else COMPARE_PER_DAY
    cmp_used = _quota_used_today(db, actor, today, "compare")
    peer_limit = 999 if admin else PEER_COMPARISON_PER_DAY
    peer_used = _quota_used_today(db, actor, today, "peer")

    return {
        "remaining": max(0, limit - used) if not admin else 999,
        "limit": limit,
        "used": used,
        "is_admin": admin,
        "resets_at": _ist_midnight_utc(),
        "screened_symbols": screened,
        "compare_remaining": max(0, cmp_limit - cmp_used) if not admin else 999,
        "compare_limit": cmp_limit,
        "compare_used": cmp_used,
        "peer_remaining": max(0, peer_limit - peer_used) if not admin else 999,
        "peer_limit": peer_limit,
        "peer_used": peer_used,
    }


# ── Screening access log (24h gating) ──

def log_screening_access(db: Session, request: Request, symbol: str) -> None:
    """Record that the actor screened a symbol (for 24h access window)."""
    actor = _actor_key(request)
    clean = symbol.strip().upper()
    existing = (
        db.query(ScreeningAccessLog)
        .filter(
            ScreeningAccessLog.actor_key == actor,
            ScreeningAccessLog.symbol == clean,
        )
        .first()
    )
    if existing:
        existing.screened_at = datetime.now(timezone.utc)
    else:
        db.add(
            ScreeningAccessLog(
                actor_key=actor,
                symbol=clean,
                screened_at=datetime.now(timezone.utc),
            )
        )
    db.flush()


def get_accessible_symbols(db: Session, request: Request) -> list[str]:
    """Return symbols the actor screened within the last 24 hours."""
    if _is_admin(request):
        return ["__all__"]

    actor = _actor_key(request)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    rows = (
        db.query(ScreeningAccessLog.symbol)
        .filter(
            ScreeningAccessLog.actor_key == actor,
            ScreeningAccessLog.screened_at >= cutoff,
        )
        .all()
    )
    return [r[0] for r in rows]


def has_screening_access(
    db: Session, request: Request, symbol: str
) -> bool:
    """Check if actor has 24h access to a specific symbol."""
    if _is_admin(request):
        return True
    actor = _actor_key(request)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    clean = symbol.strip().upper()
    return (
        db.query(ScreeningAccessLog)
        .filter(
            ScreeningAccessLog.actor_key == actor,
            ScreeningAccessLog.symbol == clean,
            ScreeningAccessLog.screened_at >= cutoff,
        )
        .first()
    ) is not None

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import (
    ADMIN_AUTH_SUBJECTS,
    ADMIN_EMAILS,
    CLERK_SECRET_KEY,
    OWNER_AUTH_SUBJECTS,
    OWNER_EMAILS,
)
from app.models import Plan, User, UserSettings
from app.services.rbac import VALID_ROLES, normalize_user_role

logger = logging.getLogger("barakfi.user_resolution")
IST = timezone(timedelta(hours=5, minutes=30))


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def claims_email(claims: dict) -> str:
    for key in ("email", "primary_email_address"):
        value = claims.get(key)
        if isinstance(value, str) and "@" in value:
            return value.strip().lower()
    email_addresses = claims.get("email_addresses")
    if isinstance(email_addresses, list):
        for item in email_addresses:
            if isinstance(item, dict):
                value = item.get("email_address")
                if isinstance(value, str) and "@" in value:
                    return value.strip().lower()
    return ""


def claims_name(claims: dict) -> str:
    for key in ("name", "full_name"):
        value = claims.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    first = claims.get("given_name")
    last = claims.get("family_name")
    if isinstance(first, str) and first.strip():
        return f"{first.strip()} {last.strip()}".strip() if isinstance(last, str) else first.strip()
    email = claims_email(claims)
    sub = str(claims.get("sub") or "user").strip()
    return email.split("@")[0] if email else sub


def claims_image(claims: dict) -> str | None:
    for key in ("image_url", "picture"):
        value = claims.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def looks_placeholder_email(value: str | None) -> bool:
    if not value:
        return True
    email = value.strip().lower()
    return not email or email.endswith("@example.local")


def looks_placeholder_name(value: str | None, auth_subject: str, email: str | None = None) -> bool:
    if not value:
        return True
    name = value.strip()
    lower = name.lower()
    if not lower:
        return True
    if lower == auth_subject.strip().lower():
        return True
    if lower.startswith("user_"):
        return True
    if email and lower == email.split("@")[0].lower():
        return True
    return False


def fetch_clerk_user_profile(clerk_user_id: str) -> tuple[str | None, str | None, str | None]:
    if not CLERK_SECRET_KEY or not clerk_user_id:
        return None, None, None
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                f"https://api.clerk.com/v1/users/{clerk_user_id}",
                headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"},
            )
            response.raise_for_status()
            payload = response.json()
    except Exception:
        return None, None, None

    email = None
    emails = payload.get("email_addresses") or []
    if isinstance(emails, list):
        for item in emails:
            if isinstance(item, dict):
                raw = item.get("email_address")
                if isinstance(raw, str) and "@" in raw:
                    email = raw.strip().lower()
                    break

    first = str(payload.get("first_name") or "").strip()
    last = str(payload.get("last_name") or "").strip()
    full_name = f"{first} {last}".strip() or None
    image_url = str(payload.get("image_url") or "").strip() or None
    return email, full_name, image_url


def ensure_free_plan(db: Session) -> Plan:
    plan = db.query(Plan).filter(Plan.key == "free").first()
    if plan:
        return plan
    plan = Plan(
        key="free",
        name="Free",
        max_reports_per_month=50,
        max_watchlist_items=25,
        alerts_allowed=False,
        advanced_filters_allowed=False,
        export_allowed=False,
        compare_allowed=False,
        portfolio_allowed=False,
        historical_tracking_allowed=False,
    )
    db.add(plan)
    db.flush()
    return plan


def ensure_user_settings(db: Session, user: User) -> None:
    if user.settings:
        return
    db.add(
        UserSettings(
            user_id=user.id,
            preferred_currency="INR",
            risk_profile="moderate",
            notifications_enabled=True,
            theme="dark",
            preferred_index="NIFTY 50",
            default_screening_method="AAOIFI Aligned",
            notification_preference="Email · Weekly digest",
        )
    )


def _safe_assign_email(db: Session, user: User, email: str | None) -> bool:
    if not email:
        return False
    normalized = email.strip().lower()
    current = (user.email or "").strip().lower()
    if current == normalized:
        return False
    conflict = (
        db.query(User)
        .filter(func.lower(User.email) == normalized, User.id != user.id)
        .first()
    )
    if conflict:
        logger.warning(
            "User email collision for %s while resolving subject %s; keeping existing row %s",
            normalized,
            user.auth_subject,
            conflict.auth_subject,
        )
        return False
    user.email = normalized
    return True


def repair_user_identity_from_clerk(db: Session, user: User) -> bool:
    placeholder_email = looks_placeholder_email(user.email)
    placeholder_name = looks_placeholder_name(user.display_name, user.auth_subject, user.email)
    missing_image = not (user.image_url or "").strip()
    if not (placeholder_email or placeholder_name or missing_image):
        return False

    email, full_name, image_url = fetch_clerk_user_profile(user.auth_subject)
    changed = False
    if email and placeholder_email:
        changed = _safe_assign_email(db, user, email) or changed
    if full_name and placeholder_name:
        user.display_name = full_name
        changed = True
    elif email and placeholder_name:
        user.display_name = email.split("@")[0]
        changed = True
    if image_url and missing_image:
        user.image_url = image_url
        changed = True
    return changed


def _apply_privileged_role(user: User, claim_email: str, auth_subject: str) -> None:
    current_role = normalize_user_role(user.role)
    if current_role in VALID_ROLES and (user.role or "") != current_role:
        user.role = current_role

    db_email = (user.email or "").strip().lower()
    owner_match = (
        (db_email and db_email in OWNER_EMAILS)
        or (claim_email and claim_email in OWNER_EMAILS)
        or (auth_subject in OWNER_AUTH_SUBJECTS)
    )
    admin_match = (
        (db_email and db_email in ADMIN_EMAILS)
        or (claim_email and claim_email in ADMIN_EMAILS)
        or (auth_subject in ADMIN_AUTH_SUBJECTS)
    )
    if owner_match and current_role != "owner":
        user.role = "owner"
    elif admin_match and current_role not in {"owner", "admin"}:
        user.role = "admin"


def resolve_or_provision_user(db: Session, claims: dict) -> User:
    auth_subject = str(claims.get("sub") or "").strip()
    if not auth_subject:
        raise HTTPException(status_code=401, detail="Token subject missing")

    email = claims_email(claims)
    name = claims_name(claims)
    image_url = claims_image(claims)
    if not email or looks_placeholder_name(name, auth_subject, email) or not image_url:
        clerk_email, clerk_name, clerk_image = fetch_clerk_user_profile(auth_subject)
        email = email or (clerk_email or "")
        if looks_placeholder_name(name, auth_subject, email) and clerk_name:
            name = clerk_name
        image_url = image_url or clerk_image

    user_by_subject = db.query(User).filter(User.auth_subject == auth_subject).first()
    user_by_email = None
    if email:
        user_by_email = db.query(User).filter(func.lower(User.email) == email.lower()).first()

    user = user_by_subject or user_by_email
    if user_by_subject and user_by_email and user_by_subject.id != user_by_email.id:
        logger.warning(
            "Split identity detected for subject %s and email %s; preserving auth_subject row %s",
            auth_subject,
            email,
            user_by_subject.id,
        )
        user = user_by_subject

    now = utc_now()
    if user:
        user.auth_subject = auth_subject
        _safe_assign_email(db, user, email or None)
        if name and not looks_placeholder_name(name, auth_subject, email):
            user.display_name = name
        elif not (user.display_name or "").strip():
            user.display_name = (email.split("@")[0] if email else auth_subject)
        user.auth_provider = "clerk"
        user.is_active = True
        user.status = "active"
        user.last_seen_at = now
        if image_url:
            user.image_url = image_url
        if not user.plan_key:
            user.plan_key = "free"
    else:
        user = User(
            email=email or f"{auth_subject}@example.local",
            display_name=name or (email.split("@")[0] if email else auth_subject),
            auth_provider="clerk",
            auth_subject=auth_subject,
            is_active=True,
            status="active",
            plan_key="free",
            image_url=image_url,
            last_seen_at=now,
        )
        db.add(user)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            recovered = db.query(User).filter(User.auth_subject == auth_subject).first()
            if not recovered and email:
                recovered = db.query(User).filter(func.lower(User.email) == email.lower()).first()
                if recovered:
                    recovered.auth_subject = auth_subject
            if not recovered:
                raise
            user = recovered
            user.is_active = True
            user.status = "active"
            user.last_seen_at = now
            user.auth_provider = "clerk"
            _safe_assign_email(db, user, email or None)

    ensure_free_plan(db)
    ensure_user_settings(db, user)
    repair_user_identity_from_clerk(db, user)
    _apply_privileged_role(user, email, auth_subject)
    db.flush()
    return user

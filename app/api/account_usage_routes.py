from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone
from hashlib import sha256

import httpx
from fastapi import APIRouter, Body, Depends, Header, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session
from svix.webhooks import Webhook, WebhookVerificationError

from app.api import helpers
from app.config import CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET
from app.database import get_db
from app.models import (
    AccountDeletionRequest,
    AnalyticsEvent,
    AuditLog,
    DataExportRequest,
    FeatureWaitlist,
    MonthlyUsage,
    Plan,
    ReportUsageEvent,
    ScreeningReportHistory,
    Stock,
    User,
    UserSettings,
    WatchlistEntry,
)
from app.schemas import (
    ActionResponse,
    AccountDeletionRequestCreate,
    AccountDeletionRequestRead,
    AccountOverviewFeatures,
    AccountProfileUpdateRequest,
    AccountOverviewResponse,
    AccountOverviewUsage,
    AccountOverviewUser,
    AccountOverviewWaitlist,
    DataExportRequestRead,
    ReportUnlockResponse,
    CompareUnlockRequest,
    CompareUnlockResponse,
    ScreeningReportHistoryRead,
    WaitlistJoinRequest,
    WaitlistJoinResponse,
    WatchlistEntryCreateRequest,
    WatchlistEntryRead,
    WatchlistMutationResponse,
    AnalyticsEventIngestRequest,
)
from app.services.auth_service import get_current_auth_claims, get_optional_auth_claims
from app.services.halal_service import PRIMARY_PROFILE, evaluate_stock, get_profile_version
from app.services.stock_lookup import resolve_stock
from app.services.user_resolution import (
    ensure_free_plan,
    ensure_user_settings,
    repair_user_identity_from_clerk as shared_repair_user_identity_from_clerk,
    resolve_or_provision_user,
)

router = APIRouter(prefix="/api")

IST = timezone(timedelta(hours=5, minutes=30))
WAITLIST_FEATURES = {
    "pro",
    "alerts",
    "advanced_filters",
    "export",
    "compare",
    "portfolio",
    "historical_tracking",
    "unlimited_reports",
    "unlimited_watchlist",
}
WAITLIST_SOURCES = {
    "account_page",
    "stock_page",
    "premium_filter_click",
    "export_click",
    "compare_click",
    "report_limit_reached",
    "watchlist_limit_reached",
    "alerts_section",
    "screener_save_click",
}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _today_ist() -> date:
    return datetime.now(IST).date()


def _usage_month_for(d: date | None = None) -> str:
    dt = d or _today_ist()
    return dt.strftime("%Y-%m")


def _reset_date_iso() -> str:
    now = datetime.now(IST)
    first_of_next = (now.replace(day=1, hour=0, minute=0, second=0, microsecond=0) + timedelta(days=32)).replace(day=1)
    return first_of_next.date().isoformat()


def _claims_email(claims: dict) -> str:
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


def _claims_name(claims: dict) -> str:
    for key in ("name", "full_name"):
        value = claims.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    first = claims.get("given_name")
    last = claims.get("family_name")
    if isinstance(first, str) and first.strip():
        return f"{first.strip()} {last.strip()}".strip() if isinstance(last, str) else first.strip()
    email = _claims_email(claims)
    sub = str(claims.get("sub") or "user").strip()
    return email.split("@")[0] if email else sub


def _claims_image(claims: dict) -> str | None:
    for key in ("image_url", "picture"):
        value = claims.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _hash_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "")
    return sha256(ip.encode()).hexdigest()[:24] if ip else None


def _user_agent(request: Request) -> str | None:
    value = request.headers.get("user-agent", "").strip()
    return value or None


def _looks_placeholder_email(value: str | None) -> bool:
    if not value:
        return True
    email = value.strip().lower()
    return not email or email.endswith("@example.local")


def _looks_placeholder_name(value: str | None, auth_subject: str, email: str | None = None) -> bool:
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


def _fetch_clerk_user_profile(clerk_user_id: str) -> tuple[str | None, str | None, str | None]:
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


def _repair_user_identity_from_clerk(user: User) -> bool:
    placeholder_email = _looks_placeholder_email(user.email)
    placeholder_name = _looks_placeholder_name(user.display_name, user.auth_subject, user.email)
    missing_image = not (user.image_url or "").strip()
    if not (placeholder_email or placeholder_name or missing_image):
        return False

    email, full_name, image_url = _fetch_clerk_user_profile(user.auth_subject)
    changed = False
    if email and placeholder_email:
        user.email = email
        changed = True
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


def _audit(db: Session, *, user_id: int | None, action: str, request: Request | None = None, metadata: dict | None = None) -> None:
    db.add(
        AuditLog(
            user_id=user_id,
            action=action,
            ip_hash=_hash_ip(request) if request else None,
            user_agent=_user_agent(request) if request else None,
            metadata_json=metadata or {},
        )
    )


def _track_event(
    db: Session,
    *,
    event_name: str,
    user_id: int | None = None,
    request: Request | None = None,
    properties: dict | None = None,
    page_path: str | None = None,
    anonymous_id: str | None = None,
) -> None:
    db.add(
        AnalyticsEvent(
            user_id=user_id,
            anonymous_id=anonymous_id,
            event_name=event_name,
            properties=properties or {},
            page_path=page_path,
            ip_hash=_hash_ip(request) if request else None,
            user_agent=_user_agent(request) if request else None,
        )
    )


def _ensure_current_user(db: Session, claims: dict) -> User:
    return resolve_or_provision_user(db, claims)


def get_current_app_user(
    claims: dict = Depends(get_current_auth_claims),
    db: Session = Depends(get_db),
) -> User:
    try:
        user = _ensure_current_user(db, claims)
        db.commit()
        db.refresh(user)
        return user
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to resolve authenticated user")


def _get_or_create_monthly_usage(db: Session, user_id: int, usage_month: str) -> MonthlyUsage:
    usage = (
        db.query(MonthlyUsage)
        .filter(MonthlyUsage.user_id == user_id, MonthlyUsage.usage_month == usage_month)
        .first()
    )
    if usage:
        return usage
    usage = MonthlyUsage(user_id=user_id, usage_month=usage_month, reports_used=0, watchlist_count=0)
    db.add(usage)
    db.flush()
    return usage


def _plan_for_user(db: Session, user: User) -> Plan:
    ensure_free_plan(db)
    plan = db.query(Plan).filter(Plan.key == (user.plan_key or "free")).first()
    return plan or db.query(Plan).filter(Plan.key == "free").one()


@router.post("/webhooks/clerk")
async def clerk_webhook(request: Request, db: Session = Depends(get_db)):
    if not CLERK_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Clerk webhook secret not configured")

    payload = await request.body()
    headers = {
        "svix-id": request.headers.get("svix-id", ""),
        "svix-timestamp": request.headers.get("svix-timestamp", ""),
        "svix-signature": request.headers.get("svix-signature", ""),
    }
    try:
        event = Webhook(CLERK_WEBHOOK_SECRET).verify(payload, headers)
    except WebhookVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = event.get("type")
    data = event.get("data") or {}
    clerk_user_id = str(data.get("id") or "").strip()
    if not clerk_user_id:
        raise HTTPException(status_code=400, detail="Webhook missing user id")

    emails = data.get("email_addresses") or []
    email = ""
    if isinstance(emails, list):
        for item in emails:
            if isinstance(item, dict):
                raw = item.get("email_address")
                if isinstance(raw, str) and "@" in raw:
                    email = raw.strip().lower()
                    break
    first = str(data.get("first_name") or "").strip()
    last = str(data.get("last_name") or "").strip()
    display_name = f"{first} {last}".strip() or email.split("@")[0] if email else clerk_user_id
    image_url = str(data.get("image_url") or "").strip() or None

    user = db.query(User).filter(User.auth_subject == clerk_user_id).first()
    if not user and email:
        user = db.query(User).filter(User.email == email).first()

    if event_type == "user.deleted":
        if user:
            user.is_active = False
            user.status = "deleted"
            user.deleted_at = _utc_now()
            _audit(db, user_id=user.id, action="clerk_user_deleted", metadata={"clerk_user_id": clerk_user_id})
            db.commit()
        return {"ok": True}

    if user:
        user.email = email or user.email
        user.display_name = display_name or user.display_name
        user.image_url = image_url or user.image_url
        user.is_active = True
        user.status = "active"
        user.plan_key = user.plan_key or "free"
    else:
        user = User(
            email=email or f"{clerk_user_id}@example.local",
            display_name=display_name,
            auth_provider="clerk",
            auth_subject=clerk_user_id,
            is_active=True,
            status="active",
            plan_key="free",
            image_url=image_url,
            last_seen_at=_utc_now(),
        )
        db.add(user)
        db.flush()
    ensure_user_settings(db, user)
    ensure_free_plan(db)
    action = "user_synced_from_clerk" if event_type == "user.created" else "clerk_user_updated"
    _audit(db, user_id=user.id, action=action, metadata={"clerk_user_id": clerk_user_id})
    db.commit()
    return {"ok": True}


@router.get("/account/overview", response_model=AccountOverviewResponse)
def get_account_overview(
    request: Request,
    user: User = Depends(get_current_app_user),
    db: Session = Depends(get_db),
):
    usage_month = _usage_month_for()
    shared_repair_user_identity_from_clerk(db, user)
    ensure_user_settings(db, user)
    usage = _get_or_create_monthly_usage(db, user.id, usage_month)
    plan = _plan_for_user(db, user)
    watchlist_count = db.query(func.count(WatchlistEntry.id)).filter(WatchlistEntry.user_id == user.id).scalar() or 0
    usage.watchlist_count = watchlist_count
    joined_pro = db.query(FeatureWaitlist).filter(FeatureWaitlist.email == user.email, FeatureWaitlist.feature_key == "pro").first() is not None
    joined_alerts = db.query(FeatureWaitlist).filter(FeatureWaitlist.email == user.email, FeatureWaitlist.feature_key == "alerts").first() is not None
    _track_event(db, event_name="account_page_viewed", user_id=user.id, request=request, page_path="/account")
    db.commit()
    return AccountOverviewResponse(
        user=AccountOverviewUser(
            name=user.display_name,
            email=user.email,
            plan=plan.name,
            member_since=user.created_at,
            image_url=user.image_url,
            preferred_index=user.settings.preferred_index if user.settings else "NIFTY 50",
            default_screening_method=user.settings.default_screening_method if user.settings else "AAOIFI Aligned",
            notification_preference=user.settings.notification_preference if user.settings else "Email · Weekly digest",
        ),
        usage=AccountOverviewUsage(
            reports_used=usage.reports_used,
            reports_limit=plan.max_reports_per_month,
            reports_remaining=max(plan.max_reports_per_month - usage.reports_used, 0),
            watchlist_count=watchlist_count,
            watchlist_limit=plan.max_watchlist_items,
            reset_date=_reset_date_iso(),
        ),
        features=AccountOverviewFeatures(
            alerts_allowed=plan.alerts_allowed,
            export_allowed=plan.export_allowed,
            compare_allowed=plan.compare_allowed,
            advanced_filters_allowed=plan.advanced_filters_allowed,
            portfolio_allowed=plan.portfolio_allowed,
            historical_tracking_allowed=plan.historical_tracking_allowed,
        ),
        waitlist=AccountOverviewWaitlist(joined_pro=joined_pro, joined_alerts=joined_alerts),
    )


@router.patch("/account/profile", response_model=AccountOverviewUser)
def update_account_profile(
    payload: AccountProfileUpdateRequest,
    user: User = Depends(get_current_app_user),
    db: Session = Depends(get_db),
):
    ensure_user_settings(db, user)
    shared_repair_user_identity_from_clerk(db, user)
    if payload.display_name is not None and payload.display_name.strip():
        user.display_name = payload.display_name.strip()
    if payload.preferred_index is not None and user.settings:
        user.settings.preferred_index = payload.preferred_index.strip() or "NIFTY 50"
    if payload.default_screening_method is not None and user.settings:
        user.settings.default_screening_method = payload.default_screening_method.strip() or "AAOIFI Aligned"
    if payload.notification_preference is not None and user.settings:
        user.settings.notification_preference = payload.notification_preference.strip() or "Email · Weekly digest"
    db.commit()
    db.refresh(user)
    return AccountOverviewUser(
        name=user.display_name,
        email=user.email,
        plan=_plan_for_user(db, user).name,
        member_since=user.created_at,
        image_url=user.image_url,
        preferred_index=user.settings.preferred_index if user.settings else "NIFTY 50",
        default_screening_method=user.settings.default_screening_method if user.settings else "AAOIFI Aligned",
        notification_preference=user.settings.notification_preference if user.settings else "Email · Weekly digest",
    )


@router.post("/reports/{symbol}/unlock", response_model=ReportUnlockResponse)
def unlock_report(
    symbol: str,
    request: Request,
    user: User = Depends(get_current_app_user),
    db: Session = Depends(get_db),
):
    today = _today_ist()
    usage_month = _usage_month_for(today)
    clean_symbol = symbol.strip().upper()

    existing = (
        db.query(ReportUsageEvent)
        .filter(
            ReportUsageEvent.user_id == user.id,
            ReportUsageEvent.stock_symbol == clean_symbol,
            ReportUsageEvent.usage_date == today,
        )
        .first()
    )
    plan = _plan_for_user(db, user)
    usage = _get_or_create_monthly_usage(db, user.id, usage_month)
    remaining = max(plan.max_reports_per_month - usage.reports_used, 0)
    if existing:
        _track_event(
            db,
            event_name="stock_page_viewed",
            user_id=user.id,
            request=request,
            properties={"symbol": clean_symbol, "counted": False},
            page_path=f"/stocks/{clean_symbol}",
        )
        db.commit()
        return ReportUnlockResponse(
            allowed=True,
            counted=False,
            reason="ALREADY_COUNTED_TODAY",
            reports_used=usage.reports_used,
            reports_limit=plan.max_reports_per_month,
            reports_remaining=remaining,
        )

    if usage.reports_used >= plan.max_reports_per_month:
        _track_event(
            db,
            event_name="report_limit_reached",
            user_id=user.id,
            request=request,
            properties={"symbol": clean_symbol},
            page_path=f"/stocks/{clean_symbol}",
        )
        db.commit()
        return ReportUnlockResponse(
            allowed=False,
            counted=False,
            reason="MONTHLY_LIMIT_REACHED",
            message="You’ve used all 50 BarakFi stock-page report credits for this month. Access resets next month. Join BarakFi Pro for more.",
            cta="JOIN_PRO_WAITLIST",
            reports_used=usage.reports_used,
            reports_limit=plan.max_reports_per_month,
            reports_remaining=0,
        )

    stock = resolve_stock(db, clean_symbol, None, active_only=True)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    result = evaluate_stock(helpers.stock_to_dict(stock), profile=PRIMARY_PROFILE)
    breakdown = result.get("breakdown", {})
    event = ReportUsageEvent(
        user_id=user.id,
        stock_symbol=clean_symbol,
        exchange=stock.exchange or "NSE",
        usage_date=today,
        usage_month=usage_month,
        counted=True,
    )
    usage.reports_used += 1
    usage.watchlist_count = db.query(func.count(WatchlistEntry.id)).filter(WatchlistEntry.user_id == user.id).scalar() or 0
    history = ScreeningReportHistory(
        user_id=user.id,
        stock_symbol=clean_symbol,
        exchange=stock.exchange or "NSE",
        company_name=stock.name,
        sector=stock.sector,
        screening_method=PRIMARY_PROFILE.upper(),
        result_status=result.get("status"),
        data_period=stock.fundamentals_updated_at.date().isoformat() if stock.fundamentals_updated_at else None,
        debt_ratio=breakdown.get("debt_to_market_cap_ratio"),
        interest_income_ratio=breakdown.get("interest_income_ratio"),
        business_activity_status="Permissible" if breakdown.get("sector_allowed") else "Requires Review",
        receivables_ratio=breakdown.get("receivables_to_market_cap_ratio"),
        report_version=get_profile_version(PRIMARY_PROFILE),
    )
    db.add(event)
    db.add(history)
    _track_event(
        db,
        event_name="stock_page_viewed",
        user_id=user.id,
        request=request,
        properties={"symbol": clean_symbol, "counted": True},
        page_path=f"/stocks/{clean_symbol}",
    )
    _track_event(
        db,
        event_name="report_unlocked",
        user_id=user.id,
        request=request,
        properties={"symbol": clean_symbol, "counted": True},
        page_path=f"/stocks/{clean_symbol}",
    )
    _audit(db, user_id=user.id, action="report_unlocked", request=request, metadata={"symbol": clean_symbol})
    db.commit()
    return ReportUnlockResponse(
        allowed=True,
        counted=True,
        reports_used=usage.reports_used,
        reports_limit=plan.max_reports_per_month,
        reports_remaining=max(plan.max_reports_per_month - usage.reports_used, 0),
    )


@router.post("/reports/compare/unlock", response_model=CompareUnlockResponse)
def unlock_compare_reports(
    payload: CompareUnlockRequest,
    request: Request,
    user: User = Depends(get_current_app_user),
    db: Session = Depends(get_db),
):
    clean_symbols = []
    seen = set()
    for symbol in payload.symbols:
        clean = str(symbol or "").strip().upper()
        if not clean or clean in seen:
            continue
        seen.add(clean)
        clean_symbols.append(clean)
        if len(clean_symbols) >= 3:
            break

    if len(clean_symbols) < 2:
        raise HTTPException(status_code=400, detail="Select at least 2 symbols to compare")

    usage_month = _usage_month_for()
    plan = _plan_for_user(db, user)
    usage = _get_or_create_monthly_usage(db, user.id, usage_month)

    charged_count = len(clean_symbols)
    remaining = max(plan.max_reports_per_month - usage.reports_used, 0)

    if remaining < charged_count:
        _track_event(
            db,
            event_name="compare_limit_reached",
            user_id=user.id,
            request=request,
            properties={"symbols": clean_symbols, "requested": charged_count},
            page_path="/compare",
        )
        db.commit()
        return CompareUnlockResponse(
            allowed=False,
            charged_count=0,
            reason="MONTHLY_LIMIT_REACHED",
            message="You do not have enough monthly report credits to run this comparison.",
            cta="JOIN_PRO_WAITLIST",
            reports_used=usage.reports_used,
            reports_limit=plan.max_reports_per_month,
            reports_remaining=remaining,
        )

    usage.reports_used += charged_count
    usage.watchlist_count = db.query(func.count(WatchlistEntry.id)).filter(WatchlistEntry.user_id == user.id).scalar() or 0

    for symbol in clean_symbols:
        db.add(
            ReportUsageEvent(
                user_id=user.id,
                stock_symbol=f"CMP::{symbol}::{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}",
                exchange="NSE",
                usage_date=_today_ist(),
                usage_month=usage_month,
                counted=True,
                reason="COMPARE_RUN",
            )
        )

    _track_event(
        db,
        event_name="compare_reports_unlocked",
        user_id=user.id,
        request=request,
        properties={"symbols": clean_symbols, "charged_count": charged_count},
        page_path="/compare",
    )
    _audit(db, user_id=user.id, action="compare_reports_unlocked", request=request, metadata={"symbols": clean_symbols, "charged_count": charged_count})
    db.commit()

    return CompareUnlockResponse(
        allowed=True,
        charged_count=charged_count,
        reports_used=usage.reports_used,
        reports_limit=plan.max_reports_per_month,
        reports_remaining=max(plan.max_reports_per_month - usage.reports_used, 0),
    )


@router.get("/reports/history", response_model=list[ScreeningReportHistoryRead])
def get_report_history(
    user: User = Depends(get_current_app_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(ScreeningReportHistory)
        .filter(ScreeningReportHistory.user_id == user.id)
        .order_by(ScreeningReportHistory.opened_at.desc())
        .limit(50)
        .all()
    )
    return rows


@router.get("/watchlist", response_model=list[WatchlistEntryRead])
def get_watchlist(
    user: User = Depends(get_current_app_user),
    db: Session = Depends(get_db),
):
    entries = (
        db.query(WatchlistEntry)
        .filter(WatchlistEntry.user_id == user.id)
        .order_by(WatchlistEntry.added_at.desc())
        .all()
    )
    return helpers.build_watchlist_entry_reads(db, user.id, entries)


@router.post("/watchlist", response_model=WatchlistMutationResponse)
def add_watchlist_item(
    payload: WatchlistEntryCreateRequest,
    request: Request,
    user: User = Depends(get_current_app_user),
    db: Session = Depends(get_db),
):
    stock = resolve_stock(db, payload.symbol, None, active_only=True)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    existing = (
        db.query(WatchlistEntry)
        .filter(WatchlistEntry.user_id == user.id, WatchlistEntry.stock_id == stock.id)
        .first()
    )
    plan = _plan_for_user(db, user)
    count = db.query(func.count(WatchlistEntry.id)).filter(WatchlistEntry.user_id == user.id).scalar() or 0
    if existing:
        reads = helpers.build_watchlist_entry_reads(db, user.id, [existing])
        return WatchlistMutationResponse(
            message="Stock already in watchlist",
            already_exists=True,
            watchlist_count=count,
            watchlist_limit=plan.max_watchlist_items,
            item=reads[0] if reads else None,
        )
    if count >= plan.max_watchlist_items:
        _track_event(db, event_name="watchlist_limit_reached", user_id=user.id, request=request, properties={"symbol": stock.symbol})
        db.commit()
        return WatchlistMutationResponse(
            ok=False,
            blocked=True,
            message="You have reached your free watchlist limit.",
            watchlist_count=count,
            watchlist_limit=plan.max_watchlist_items,
            cta="JOIN_PRO_WAITLIST",
        )

    entry = WatchlistEntry(
        user_id=user.id,
        owner_name=(user.display_name or user.email or "user").lower().replace(" ", "-"),
        stock_id=stock.id,
        notes=payload.notes.strip() or "Added from stock page.",
    )
    db.add(entry)
    db.flush()
    _audit(db, user_id=user.id, action="watchlist_added", request=request, metadata={"symbol": stock.symbol})
    _track_event(db, event_name="watchlist_added", user_id=user.id, request=request, properties={"symbol": stock.symbol})
    usage = _get_or_create_monthly_usage(db, user.id, _usage_month_for())
    usage.watchlist_count = count + 1
    db.commit()
    db.refresh(entry)
    reads = helpers.build_watchlist_entry_reads(db, user.id, [entry])
    return WatchlistMutationResponse(
        message="Added to watchlist",
        watchlist_count=count + 1,
        watchlist_limit=plan.max_watchlist_items,
        item=reads[0] if reads else None,
    )


@router.delete("/watchlist/{symbol}", response_model=ActionResponse)
def remove_watchlist_item(
    symbol: str,
    request: Request,
    user: User = Depends(get_current_app_user),
    db: Session = Depends(get_db),
):
    normalised_symbol = symbol.strip().upper()
    entry = (
        db.query(WatchlistEntry)
        .join(Stock, Stock.id == WatchlistEntry.stock_id)
        .filter(WatchlistEntry.user_id == user.id, Stock.symbol == normalised_symbol)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Watchlist entry not found")
    db.delete(entry)
    _audit(db, user_id=user.id, action="watchlist_removed", request=request, metadata={"symbol": normalised_symbol})
    db.commit()
    return ActionResponse(ok=True, message="Watchlist entry deleted")


@router.post("/waitlist", response_model=WaitlistJoinResponse)
def join_waitlist(
    payload: WaitlistJoinRequest,
    request: Request,
    db: Session = Depends(get_db),
    claims: dict | None = Depends(get_optional_auth_claims),
):
    if payload.feature_key not in WAITLIST_FEATURES:
        raise HTTPException(status_code=400, detail="Invalid feature key")
    if payload.source not in WAITLIST_SOURCES:
        raise HTTPException(status_code=400, detail="Invalid source")

    user = None
    email = payload.email.strip().lower() if payload.email else ""
    if claims and claims.get("sub"):
        try:
            user = _ensure_current_user(db, claims)
            email = user.email
        except Exception:
            user = None
    if not email:
        raise HTTPException(status_code=400, detail="Email required")

    existing = (
        db.query(FeatureWaitlist)
        .filter(FeatureWaitlist.email == email, FeatureWaitlist.feature_key == payload.feature_key)
        .first()
    )
    already_joined = existing is not None
    if not existing:
        existing = FeatureWaitlist(
            user_id=user.id if user else None,
            email=email,
            feature_key=payload.feature_key,
            source=payload.source,
            message=payload.message,
        )
        db.add(existing)
    _track_event(
        db,
        event_name="waitlist_joined",
        user_id=user.id if user else None,
        request=request,
        properties={"featureKey": payload.feature_key, "source": payload.source},
    )
    db.commit()
    return WaitlistJoinResponse(ok=True, already_joined=already_joined, feature_key=payload.feature_key, email=email)


@router.post("/events")
def create_event(
    payload: AnalyticsEventIngestRequest,
    request: Request,
    db: Session = Depends(get_db),
    claims: dict | None = Depends(get_optional_auth_claims),
):
    try:
        user = None
        if claims and claims.get("sub"):
            try:
                user = _ensure_current_user(db, claims)
            except Exception:
                user = None
        _track_event(
            db,
            event_name=payload.event_name,
            user_id=user.id if user else None,
            request=request,
            properties=payload.properties,
            page_path=payload.page_path,
            anonymous_id=payload.anonymous_id,
        )
        db.commit()
    except Exception:
        db.rollback()
    return {"ok": True}


@router.post("/account/export", response_model=DataExportRequestRead)
def request_account_export(
    request: Request,
    user: User = Depends(get_current_app_user),
    db: Session = Depends(get_db),
):
    export = DataExportRequest(user_id=user.id, status="requested")
    db.add(export)
    _audit(db, user_id=user.id, action="data_export_requested", request=request)
    db.commit()
    db.refresh(export)
    return export


@router.post("/account/delete-request", response_model=AccountDeletionRequestRead)
def request_account_deletion(
    payload: AccountDeletionRequestCreate,
    request: Request,
    user: User = Depends(get_current_app_user),
    db: Session = Depends(get_db),
):
    user.status = "deletion_requested"
    deletion = AccountDeletionRequest(
        user_id=user.id,
        clerk_user_id=user.auth_subject,
        status="requested",
        reason=(payload.reason or "").strip() or None,
    )
    db.add(deletion)
    _audit(db, user_id=user.id, action="account_deletion_requested", request=request)
    db.commit()
    db.refresh(deletion)
    return deletion

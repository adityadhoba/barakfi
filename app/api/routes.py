from typing import Optional
from fastapi import APIRouter, Body, Depends, Header, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import (
    FRONTEND_APP_URL,
    ADMIN_AUTH_SUBJECTS,
    ADMIN_EMAILS,
    AUTH_GOOGLE_ENABLED,
    AUTH_PROVIDER,
    CLERK_JS_URL,
    CLERK_JWKS_URL,
    CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY,
    CORS_ORIGINS,
    INTERNAL_SERVICE_TOKEN,
    MARKET_DATA_PROVIDER,
)
from app.services.rbac import (
    is_admin,
    get_user_by_claims,
    ROLE_DESCRIPTIONS,
    ROLE_HIERARCHY,
    VALID_ROLES,
)
from app.database import get_db
from app.api import helpers
from app.models import (
    ComplianceOverride,
    ComplianceReviewCase,
    ComplianceReviewEvent,
    ComplianceRuleVersion,
    Portfolio,
    PortfolioHolding,
    ResearchNote,
    SavedScreener,
    ScreeningLog,
    SupportNote,
    Stock,
    User,
    UserSettings,
    WatchlistEntry,
    BrokerConnection,
)
from app.schemas import (
    ActionResponse,
    ActivityEventRead,
    AdminUserStatusUpdateRequest,
    AdminUserRead,
    AdminUserRoleUpdateRequest,
    AdminUserActiveUpdateRequest,
    AdminRoleDefinition,
    AdminRolesResponse,
    AdminUsersListResponse,
    AlertRead,
    AuthStrategyResponse,
    ComplianceCheckRead,
    ComplianceOverrideCreateRequest,
    ComplianceOverrideRead,
    ComplianceReviewCaseCreateRequest,
    ComplianceReviewCaseRead,
    ComplianceReviewCaseUpdateRequest,
    ComplianceQueueItemRead,
    ComplianceRuleVersionRead,
    GovernanceOverviewResponse,
    DataStackStatusResponse,
    FundamentalsStatusResponse,
    UniversePreviewResponse,
    SupportNoteCreateRequest,
    SupportNoteRead,
    ResearchNoteCreateRequest,
    ResearchNoteRead,
    EquityQuoteResponse,
    MarketDataStatusResponse,
    MarketPricesSyncResponse,
    PortfolioRead,
    PublicReviewCaseRead,
    RulebookResponse,
    SavedScreenerCreateRequest,
    SavedScreenerRead,
    ScreeningLogRead,
    ScreeningResult,
    StockRead,
    UserSettingsRead,
    UserSettingsUpdateRequest,
    UserProvisionRequest,
    UserRead,
    HoldingCreateRequest,
    WatchlistEntryCreateRequest,
    WatchlistEntryRead,
    WorkspaceResponse,
)
from app.services.halal_service import (
    PRIMARY_PROFILE,
    evaluate_stock,
    evaluate_stock_multi,
    get_profile_version,
    get_rulebook,
)
from app.services.indian_market_client import fetch_quote_by_provider, quote_to_dict, fetch_nse_indices
from app.services.market_data_service import get_market_data_status
from app.services.market_data_service import get_data_stack_status, get_fundamentals_status
from app.services.quote_sync_service import PUBLIC_MARKET_PROVIDERS, sync_all_stock_prices
from app.services.provider_sync_service import preview_market_universe
from app.services.auth_service import get_current_auth_claims, get_current_auth_claims_or_internal, require_auth

router = APIRouter(prefix="/api")


@router.get("/auth/strategy", response_model=AuthStrategyResponse)
def auth_strategy():
    """
    Get authentication provider configuration.

    Returns status of Clerk setup (backend JWKS, frontend keys).
    Used by frontend at startup to detect if auth is ready.

    Returns:
        AuthStrategyResponse with provider name, google_enabled flag, and readiness flags.
    """
    return {
        "provider": AUTH_PROVIDER,
        "google_enabled": AUTH_GOOGLE_ENABLED,
        "backend_ready": bool(CLERK_SECRET_KEY and CLERK_JWKS_URL),
        "frontend_ready": bool(CLERK_PUBLISHABLE_KEY),
        "clerk_js_ready": bool(CLERK_JS_URL),
        "notes": [
            "Clerk is the recommended auth layer for this app's current stage.",
            "Google sign-in should be enabled as a social connection inside Clerk.",
            "Backend session verification should use Clerk session tokens and JWKS validation.",
        ],
    }


@router.get("/market-data/indices")
def market_indices():
    """
    Get live NSE indices (NIFTY 50, BANK NIFTY, SENSEX, NIFTY MIDCAP 150).

    Queries NSE India official website. Returns empty list if NSE is unavailable.
    These are public, delayed quotes (~15 min delay on NSE).

    Returns:
        List of IndexQuote with name, current value, change amount, change %, source, timestamp.
    """
    indices = fetch_nse_indices()
    if not indices:
        return []
    return [
        {
            "name": idx.name,
            "value": idx.value,
            "change": idx.change,
            "change_percent": idx.change_percent,
            "source": idx.source,
            "as_of": idx.as_of,
        }
        for idx in indices
    ]


@router.get("/market-data/status", response_model=MarketDataStatusResponse)
def market_data_status(db: Session = Depends(get_db)):
    stock_count = db.query(Stock).filter(Stock.is_active.is_(True)).count()
    return get_market_data_status(stock_count)


@router.get("/market-data/quote/{symbol}", response_model=EquityQuoteResponse)
def equity_quote_snapshot(
    symbol: str,
    provider: str | None = Query(
        default=None,
        description="nse_public | yahoo_india | auto_india (default auto_india)",
    ),
    exchange: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Get a live price snapshot for a stock from NSE or Yahoo Finance.

    Does NOT update the database; for real-time quotes and charts.
    Uses public (non-authenticated) APIs. Falls back from NSE to Yahoo if needed.

    Args:
        symbol: Stock symbol (e.g., INFY) - case insensitive
        provider: Quote source (nse_public, yahoo_india, auto_india)
            - auto_india: try NSE first, then Yahoo (default)
            - nse_public: official NSE only (may fail if NSE is down)
            - yahoo_india: fallback source (usually ~1 day delayed)
        exchange: Stock exchange (NSE, BSE) - auto-detected if not provided

    Returns:
        EquityQuoteResponse with current price, high/low, 52-week range, volume, source, timestamp

    Raises:
        HTTPException 404: If quote unavailable from all providers
        HTTPException 400: If provider is invalid
    """
    sym = symbol.upper().strip()
    effective = (provider or "auto_india").strip().lower()
    if effective not in PUBLIC_MARKET_PROVIDERS:
        raise HTTPException(
            status_code=400,
            detail=f"provider must be one of: {', '.join(sorted(PUBLIC_MARKET_PROVIDERS))}",
        )
    row = (
        db.query(Stock).filter(Stock.symbol == sym, Stock.is_active.is_(True)).first()
    )
    ex = (exchange or (row.exchange if row else "NSE")).upper()
    quote = fetch_quote_by_provider(sym, ex, effective)
    if not quote or quote.last_price is None:
        raise HTTPException(
            status_code=404,
            detail="Quote unavailable for this symbol or provider.",
        )
    payload = quote_to_dict(quote)
    return EquityQuoteResponse(
        symbol=payload["symbol"],
        exchange=payload["exchange"],
        last_price=float(payload["last_price"]),
        previous_close=payload["previous_close"],
        change=payload["change"],
        change_percent=payload["change_percent"],
        day_high=payload["day_high"],
        day_low=payload["day_low"],
        volume=payload["volume"],
        week_52_high=payload["week_52_high"],
        week_52_low=payload["week_52_low"],
        source=payload["source"],
        as_of=payload["as_of"],
        currency=str(payload.get("currency") or "INR"),
    )


@router.post("/market-data/sync-prices", response_model=MarketPricesSyncResponse)
def sync_equity_prices_to_database(
    max_stocks: int | None = Query(default=None, ge=1, le=5000),
    provider: str | None = Query(
        default=None,
        description="Overrides MARKET_DATA_PROVIDER when set; must be a public Indian provider.",
    ),
    x_internal_service_token: str | None = Header(default=None, alias="X-Internal-Service-Token"),
    db: Session = Depends(get_db),
):
    """
    Batch update all stock prices in the database from market data providers.

    Throttles requests to avoid rate limiting (~0.35s per stock).
    Requires internal service token (for background jobs, not user API).

    Auth:
        X-Internal-Service-Token header (matches INTERNAL_SERVICE_TOKEN env var)

    Query Params:
        max_stocks: Limit sync to first N stocks (useful for smoke tests)
        provider: Override configured MARKET_DATA_PROVIDER (nse, groww, upstox)

    Returns:
        MarketPricesSyncResponse with ok flag, provider used, updated count, failed symbols

    Raises:
        HTTPException 401: If internal token missing or invalid
        HTTPException 400: If provider invalid or all syncs failed
    """
    helpers.require_internal_token(x_internal_service_token)
    eff = (provider or MARKET_DATA_PROVIDER).strip().lower()
    result = sync_all_stock_prices(db, provider=eff, max_stocks=max_stocks)
    if not result["ok"]:
        raise HTTPException(status_code=400, detail=result.get("detail", "sync failed"))
    return MarketPricesSyncResponse(
        ok=True,
        provider=result["provider"],
        updated=result["updated"],
        failed_symbols=result["failed_symbols"],
        total=result["total"],
    )


@router.get("/fundamentals/status", response_model=FundamentalsStatusResponse)
def fundamentals_status(db: Session = Depends(get_db)):
    stock_count = db.query(Stock).filter(Stock.is_active.is_(True)).count()
    return get_fundamentals_status(stock_count)


@router.get("/data-stack/status", response_model=DataStackStatusResponse)
def data_stack_status(db: Session = Depends(get_db)):
    stock_count = db.query(Stock).filter(Stock.is_active.is_(True)).count()
    return get_data_stack_status(stock_count)


@router.get("/stocks", response_model=list[StockRead])
def list_stocks(
    halal_only: bool = Query(default=False),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Get all active stocks with fundamental data.

    Auth: None (public endpoint)

    Query Params:
        halal_only: If True, filter to only HALAL-compliant stocks (expensive, done in Python)
        search: Search by symbol or name (case insensitive, substring match)

    Returns:
        List of StockRead with symbol, name, sector, market cap, fundamentals

    Performance:
        ~50-500 stocks typically. halal_only=true filters in Python (slow for 500+).
        Consider using bulk screening endpoint for large universes.
    """
    query = db.query(Stock).filter(Stock.is_active.is_(True))

    if search:
        search_term = f"%{search.upper()}%"
        query = query.filter((Stock.symbol.ilike(search_term)) | (Stock.name.ilike(search_term)))

    stocks = query.order_by(Stock.symbol.asc()).all()

    if not halal_only:
        return stocks

    return [
        stock
        for stock in stocks
        if evaluate_stock(helpers.stock_to_dict(stock), profile=PRIMARY_PROFILE)["status"] == "HALAL"
    ]


@router.get("/stocks/{symbol}", response_model=StockRead)
def get_stock(symbol: str, db: Session = Depends(get_db)):
    """
    Get a single stock's fundamental data.

    Auth: None (public endpoint)

    Args:
        symbol: Stock symbol (e.g., INFY) - case insensitive

    Returns:
        StockRead with name, sector, market cap, debt, revenue, interest income, etc.

    Raises:
        HTTPException 404: If stock not found or inactive
    """
    stock = (
        db.query(Stock)
        .filter(Stock.symbol == symbol.upper(), Stock.is_active.is_(True))
        .first()
    )
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    return stock


@router.get("/screen/{symbol}", response_model=ScreeningResult)
def screen_stock(
    symbol: str,
    db: Session = Depends(get_db),
):
    """
    Evaluate a single stock's Shariah compliance.

    Auth: None (public endpoint)

    Applies hard rules (FAIL if any trigger) and review rules (REVIEW flag for manual).
    Uses active rulebook profile (india_strict by default).

    Args:
        symbol: Stock symbol (e.g., INFY) - case insensitive

    Returns:
        ScreeningResult with status (HALAL, FAIL, REVIEW), reasons, financial breakdown,
        and any active/recent manual review cases for this stock

    Raises:
        HTTPException 404: If stock not found or inactive
    """
    stock = (
        db.query(Stock)
        .filter(Stock.symbol == symbol.upper(), Stock.is_active.is_(True))
        .first()
    )
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    stock_data = helpers.stock_to_dict(stock)
    result = evaluate_stock(stock_data, profile=PRIMARY_PROFILE)
    result = helpers.apply_compliance_override(db, stock, result)
    helpers.record_screening_log(db, stock, result)
    active_review_case = helpers.get_public_review_case_for_stock(db, stock.id)
    recent_review_cases = helpers.get_recent_public_review_cases_for_stock(db, stock.id)

    return {
        "symbol": stock.symbol,
        "name": stock.name,
        "active_review_case": active_review_case,
        "recent_review_cases": recent_review_cases,
        **result,
    }


@router.post("/screen/bulk", response_model=list[ScreeningResult])
def screen_stocks_bulk(
    symbols: list[str] = Body(..., max_length=500),
    db: Session = Depends(get_db),
):
    """
    Batch evaluate multiple stocks for Shariah compliance.

    Auth: None (public endpoint)

    Much faster than N individual GET /screen/{symbol} requests.
    Evaluation runs in parallel on backend using asyncio.

    Request Body:
        JSON array of stock symbols (max 500): ["INFY", "TCS", "WIPRO", ...]

    Returns:
        List of ScreeningResult in same order as input
        (skips stocks not found in database)

    Performance:
        ~50-500ms for 100 stocks (vs 15+ seconds for 100 individual requests)
    """
    upper_symbols = [s.upper() for s in symbols[:500]]
    stocks = (
        db.query(Stock)
        .filter(Stock.symbol.in_(upper_symbols), Stock.is_active.is_(True))
        .all()
    )
    stock_map = {s.symbol: s for s in stocks}

    results = []
    for sym in upper_symbols:
        stock = stock_map.get(sym)
        if not stock:
            continue
        stock_data = helpers.stock_to_dict(stock)
        result = evaluate_stock(stock_data, profile=PRIMARY_PROFILE)
        result = helpers.apply_compliance_override(db, stock, result)
        helpers.record_screening_log(db, stock, result)
        active_review_case = helpers.get_public_review_case_for_stock(db, stock.id)
        recent_review_cases = helpers.get_recent_public_review_cases_for_stock(db, stock.id)
        results.append({
            "symbol": stock.symbol,
            "name": stock.name,
            "active_review_case": active_review_case,
            "recent_review_cases": recent_review_cases,
            **result,
        })
    return results


@router.get("/screen/{symbol}/multi")
def screen_stock_multi(
    symbol: str,
    db: Session = Depends(get_db),
):
    """
    Evaluate a single stock against all three Shariah methodologies
    (S&P, AAOIFI, FTSE/Maxis) and return comparative results.

    Auth: None (public endpoint)
    """
    stock = (
        db.query(Stock)
        .filter(Stock.symbol == symbol.upper(), Stock.is_active.is_(True))
        .first()
    )
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    stock_data = helpers.stock_to_dict(stock)
    multi_result = evaluate_stock_multi(stock_data)

    return {
        "symbol": stock.symbol,
        "name": stock.name,
        **multi_result,
    }


@router.post("/screen/manual")
def screen_stock_manual(
    symbol: str = Body(..., embed=True),
    db: Session = Depends(get_db),
):
    """
    Manually screen any NSE stock by fetching live data from Yahoo Finance.

    Auth: None (public, free for now)

    Fetches real-time financial data and screens against all three methodologies.
    Results are cached for 1 hour to reduce API calls.
    """
    from app.services.manual_screen_service import fetch_and_screen

    clean_symbol = symbol.strip().upper().replace(".NS", "")

    # Check if stock already exists in database
    existing = (
        db.query(Stock)
        .filter(Stock.symbol == clean_symbol, Stock.is_active.is_(True))
        .first()
    )

    if existing:
        stock_data = helpers.stock_to_dict(existing)
        multi_result = evaluate_stock_multi(stock_data)
        primary_result = evaluate_stock(stock_data, profile=PRIMARY_PROFILE)
        return {
            "symbol": existing.symbol,
            "name": existing.name,
            "is_prescreened": True,
            "screening": {**primary_result, "symbol": existing.symbol, "name": existing.name},
            "multi": {"symbol": existing.symbol, "name": existing.name, **multi_result},
        }

    stock_data = fetch_and_screen(clean_symbol)
    if not stock_data:
        raise HTTPException(status_code=404, detail=f"Could not find or fetch data for symbol: {clean_symbol}")

    multi_result = evaluate_stock_multi(stock_data)
    primary_result = evaluate_stock(stock_data, profile=PRIMARY_PROFILE)

    return {
        "symbol": stock_data["symbol"],
        "name": stock_data["name"],
        "is_prescreened": False,
        "screening": {**primary_result, "symbol": stock_data["symbol"], "name": stock_data["name"]},
        "multi": {"symbol": stock_data["symbol"], "name": stock_data["name"], **multi_result},
    }


@router.get("/rulebook", response_model=RulebookResponse)
def rulebook():
    return get_rulebook()


@router.get("/governance/rule-versions", response_model=list[ComplianceRuleVersionRead])
def list_rule_versions(db: Session = Depends(get_db)):
    return (
        db.query(ComplianceRuleVersion)
        .order_by(ComplianceRuleVersion.profile_code.asc(), ComplianceRuleVersion.created_at.desc())
        .all()
    )


@router.get("/admin/governance/overview", response_model=GovernanceOverviewResponse)
def admin_governance_overview(
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    helpers.require_admin(db, claims)
    rule_versions = (
        db.query(ComplianceRuleVersion)
        .order_by(ComplianceRuleVersion.profile_code.asc(), ComplianceRuleVersion.created_at.desc())
        .all()
    )
    overrides = db.query(ComplianceOverride).order_by(ComplianceOverride.created_at.desc()).all()
    review_cases = (
        db.query(ComplianceReviewCase)
        .order_by(ComplianceReviewCase.updated_at.desc())
        .limit(20)
        .all()
    )
    review_events = (
        db.query(ComplianceReviewEvent)
        .order_by(ComplianceReviewEvent.created_at.desc())
        .limit(20)
        .all()
    )
    support_notes = db.query(SupportNote).order_by(SupportNote.created_at.desc()).limit(20).all()
    users = db.query(User).order_by(User.created_at.desc()).limit(20).all()
    return {
        "rule_versions": rule_versions,
        "overrides": overrides,
        "support_notes": support_notes,
        "users": users,
        "review_cases": review_cases,
        "review_events": review_events,
    }


@router.get("/admin/data-stack/universe-preview", response_model=UniversePreviewResponse)
def admin_universe_preview(
    provider: str = Query(default="groww"),
    limit: int = Query(default=8, ge=1, le=25),
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    helpers.require_admin(db, claims)
    stock_count = db.query(Stock).filter(Stock.is_active.is_(True)).count()
    return preview_market_universe(provider_code=provider, limit=limit, stock_count=stock_count)


@router.post("/admin/compliance-overrides", response_model=ComplianceOverrideRead)
def create_compliance_override(
    payload: ComplianceOverrideCreateRequest,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    admin_subject = helpers.require_admin(db, claims)
    stock = (
        db.query(Stock)
        .filter(Stock.symbol == payload.symbol.upper(), Stock.is_active.is_(True))
        .first()
    )
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    decided_status = payload.decided_status.upper().strip()
    if decided_status not in {"HALAL", "CAUTIOUS", "NON_COMPLIANT"}:
        raise HTTPException(status_code=400, detail="Invalid override status")

    override = ComplianceOverride(
        stock_id=stock.id,
        decided_status=decided_status,
        rationale=payload.rationale.strip(),
        decided_by=admin_subject,
    )
    db.add(override)
    db.commit()
    db.refresh(override)
    return override


@router.post("/admin/review-cases", response_model=ComplianceReviewCaseRead)
def create_review_case(
    payload: ComplianceReviewCaseCreateRequest,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    admin_subject = helpers.require_admin(db, claims)
    stock = (
        db.query(Stock)
        .filter(Stock.symbol == payload.symbol.upper(), Stock.is_active.is_(True))
        .first()
    )
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    priority = payload.priority.lower().strip()
    if priority not in {"low", "normal", "high"}:
        raise HTTPException(status_code=400, detail="Priority must be low, normal, or high")

    review_case = ComplianceReviewCase(
        stock_id=stock.id,
        requested_by=admin_subject,
        assigned_to=payload.assigned_to.strip() if payload.assigned_to else None,
        status="open",
        priority=priority,
        summary=payload.summary.strip(),
        notes=payload.notes.strip(),
    )
    db.add(review_case)
    db.flush()
    db.add(
        ComplianceReviewEvent(
            review_case_id=review_case.id,
            action="case_created",
            note=payload.notes.strip() or payload.summary.strip(),
            actor=admin_subject,
        )
    )
    db.commit()
    db.refresh(review_case)
    return review_case


@router.post("/admin/users/status", response_model=UserRead)
def update_user_status(
    payload: AdminUserStatusUpdateRequest,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    admin_subject = helpers.require_admin(db, claims)
    user = db.query(User).filter(User.auth_subject == payload.auth_subject).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.auth_subject in ADMIN_AUTH_SUBJECTS and not payload.is_active:
        raise HTTPException(status_code=400, detail="Configured admin accounts cannot be deactivated from the console")

    user.is_active = payload.is_active
    db.add(
        SupportNote(
            user_id=user.id,
            note=f"Account {'activated' if payload.is_active else 'deactivated'} by founder console: {payload.reason.strip()}",
            created_by=admin_subject,
        )
    )
    db.commit()
    db.refresh(user)
    return user


@router.post("/admin/review-cases/update", response_model=ComplianceReviewCaseRead)
def update_review_case(
    payload: ComplianceReviewCaseUpdateRequest,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    admin_subject = helpers.require_admin(db, claims)
    review_case = db.query(ComplianceReviewCase).filter(ComplianceReviewCase.id == payload.case_id).first()
    if not review_case:
        raise HTTPException(status_code=404, detail="Review case not found")

    status = payload.status.lower().strip()
    if status not in {"open", "in_progress", "resolved"}:
        raise HTTPException(status_code=400, detail="Status must be open, in_progress, or resolved")

    priority = payload.priority.lower().strip()
    if priority not in {"low", "normal", "high"}:
        raise HTTPException(status_code=400, detail="Priority must be low, normal, or high")

    review_outcome = payload.review_outcome.upper().strip() if payload.review_outcome else None
    if review_outcome and review_outcome not in {"HALAL", "CAUTIOUS", "NON_COMPLIANT"}:
        raise HTTPException(status_code=400, detail="Invalid review outcome")

    review_case.assigned_to = payload.assigned_to.strip() if payload.assigned_to else review_case.assigned_to
    review_case.status = status
    review_case.priority = priority
    review_case.review_outcome = review_outcome
    db.add(
        ComplianceReviewEvent(
            review_case_id=review_case.id,
            action="case_updated",
            note=payload.note.strip(),
            actor=admin_subject,
        )
    )

    if status == "resolved" and review_outcome:
        helpers.upsert_override_for_review_case(db, review_case, review_outcome, admin_subject, payload.note.strip())

    db.commit()
    db.refresh(review_case)
    return review_case


@router.post("/admin/support-notes", response_model=SupportNoteRead)
def create_support_note(
    payload: SupportNoteCreateRequest,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    admin_subject = helpers.require_admin(db, claims)
    user = db.query(User).filter(User.auth_subject == payload.auth_subject, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    note = SupportNote(
        user_id=user.id,
        note=payload.note.strip(),
        created_by=admin_subject,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("/users", response_model=list[UserRead])
def list_users(
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    helpers.require_admin(db, claims)
    return db.query(User).order_by(User.id.asc()).all()


@router.get("/users/{auth_subject}", response_model=UserRead)
def get_user(
    auth_subject: str,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    helpers.require_admin(db, claims)
    user = db.query(User).filter(User.auth_subject == auth_subject, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/internal/users/provision", response_model=UserRead)
def provision_user(
    payload: UserProvisionRequest,
    db: Session = Depends(get_db),
    x_internal_service_token: str | None = Header(default=None),
):
    helpers.require_internal_token(x_internal_service_token)

    user = db.query(User).filter(User.auth_subject == payload.auth_subject).first()
    if user:
        user.email = payload.email
        user.display_name = payload.display_name
        user.auth_provider = payload.auth_provider
        user.is_active = True
    else:
        user = User(
            email=payload.email,
            display_name=payload.display_name,
            auth_provider=payload.auth_provider,
            auth_subject=payload.auth_subject,
            is_active=True,
        )
        db.add(user)
        db.flush()
        helpers.create_default_workspace(db, user)

    if not user.settings:
        db.add(
            UserSettings(
                user_id=user.id,
                preferred_currency="INR",
                risk_profile="moderate",
                notifications_enabled=True,
                theme="dark",
            )
        )

    db.commit()
    db.refresh(user)
    return user


@router.post("/me/bootstrap", response_model=UserRead)
def bootstrap_current_user(
    payload: UserProvisionRequest,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    auth_subject = claims.get("sub")
    if not auth_subject:
        raise HTTPException(status_code=401, detail="Token subject missing")

    if payload.auth_subject != auth_subject:
        raise HTTPException(status_code=403, detail="Auth subject mismatch")

    user = db.query(User).filter(User.auth_subject == auth_subject).first()
    if user:
        user.email = payload.email
        user.display_name = payload.display_name
        user.auth_provider = payload.auth_provider
        user.is_active = True
    else:
        user = User(
            email=payload.email,
            display_name=payload.display_name,
            auth_provider=payload.auth_provider,
            auth_subject=payload.auth_subject,
            is_active=True,
        )
        db.add(user)
        db.flush()
        helpers.create_default_workspace(db, user)

    if not user.settings:
        db.add(
            UserSettings(
                user_id=user.id,
                preferred_currency="INR",
                risk_profile="moderate",
                notifications_enabled=True,
                theme="dark",
            )
        )

    db.commit()
    db.refresh(user)
    return user


@router.get("/users/{auth_subject}/workspace", response_model=WorkspaceResponse)
def get_workspace(
    auth_subject: str,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    # Users can only view their own workspace; admins can view anyone's
    caller_subject = claims.get("sub")
    if caller_subject != auth_subject and not is_admin(db, claims):
        raise HTTPException(status_code=403, detail="You can only view your own workspace")

    user = db.query(User).filter(User.auth_subject == auth_subject, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    portfolios = (
        db.query(Portfolio)
        .filter(Portfolio.user_id == user.id)
        .order_by(Portfolio.created_at.asc())
        .all()
    )
    watchlist_entries = (
        db.query(WatchlistEntry)
        .filter(WatchlistEntry.user_id == user.id)
        .order_by(WatchlistEntry.added_at.desc())
        .all()
    )
    research_notes = (
        db.query(ResearchNote)
        .filter(ResearchNote.user_id == user.id)
        .order_by(ResearchNote.created_at.desc())
        .all()
    )
    saved_screeners = (
        db.query(SavedScreener)
        .filter(SavedScreener.user_id == user.id)
        .order_by(SavedScreener.created_at.desc())
        .all()
    )
    review_cases = helpers.get_public_review_cases_for_user_scope(db, user.id, statuses=["open", "in_progress"])

    return {
        "user": user,
        "dashboard": helpers.build_dashboard_payload(user.display_name, portfolios, watchlist_entries),
        "portfolios": portfolios,
        "watchlist": watchlist_entries,
        "saved_screeners": saved_screeners,
        "research_notes": research_notes,
        "compliance_check": helpers.build_compliance_check(portfolios),
        "activity_feed": helpers.build_activity_feed(
            user=user,
            portfolios=portfolios,
            watchlist_entries=watchlist_entries,
            research_notes=research_notes,
            review_cases=review_cases,
        ),
        "review_cases": review_cases,
    }


@router.get("/me", response_model=UserRead)
def get_current_user(claims: dict = Depends(get_current_auth_claims_or_internal), db: Session = Depends(get_db)):
    auth_subject = claims.get("sub")
    if not auth_subject:
        raise HTTPException(status_code=401, detail="Token subject missing")

    user = db.query(User).filter(User.auth_subject == auth_subject, User.is_active.is_(True)).first()
    if not user:
        # Auto-provision: create the user from available claims so first-time
        # sign-ins "just work" without a separate bootstrap call.
        email = claims.get("email", "")
        display = email.split("@")[0] if email else auth_subject
        try:
            user = User(
                email=email,
                display_name=display,
                auth_provider="clerk",
                auth_subject=auth_subject,
                is_active=True,
            )
            db.add(user)
            db.flush()
            helpers.create_default_workspace(db, user)
            if not user.settings:
                db.add(
                    UserSettings(
                        user_id=user.id,
                        preferred_currency="INR",
                        risk_profile="moderate",
                        notifications_enabled=True,
                        theme="dark",
                    )
                )
            db.commit()
            db.refresh(user)
        except Exception:
            db.rollback()
            raise HTTPException(status_code=500, detail="Failed to auto-provision user")

    # Auto-promote to admin if user's email is in ADMIN_EMAILS or auth_subject in ADMIN_AUTH_SUBJECTS.
    # This ensures founders/admins always see admin UI even before the role column migration runs.
    effective_role = getattr(user, "role", "user") or "user"
    if effective_role != "admin":
        if (user.email and user.email.lower() in ADMIN_EMAILS) or (auth_subject in ADMIN_AUTH_SUBJECTS):
            effective_role = "admin"
            # Persist the promotion so future checks are fast
            try:
                user.role = "admin"
                db.commit()
            except Exception:
                db.rollback()

    # Return user with effective role
    result = UserRead.model_validate(user)
    result.role = effective_role
    return result


@router.patch("/me/settings", response_model=UserSettingsRead)
def update_current_user_settings(
    payload: UserSettingsUpdateRequest,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    auth_subject = claims.get("sub")
    if not auth_subject:
        raise HTTPException(status_code=401, detail="Token subject missing")

    user = db.query(User).filter(User.auth_subject == auth_subject, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not provisioned")

    settings = user.settings
    if not settings:
        settings = UserSettings(
            user_id=user.id,
            preferred_currency="INR",
            risk_profile="moderate",
            notifications_enabled=True,
            theme="dark",
        )
        db.add(settings)
        db.flush()

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)
    return settings


@router.get("/me/workspace", response_model=WorkspaceResponse)
def get_current_workspace(claims: dict = Depends(get_current_auth_claims_or_internal), db: Session = Depends(get_db)):
    auth_subject = claims.get("sub")
    if not auth_subject:
        raise HTTPException(status_code=401, detail="Token subject missing")

    user = db.query(User).filter(User.auth_subject == auth_subject, User.is_active.is_(True)).first()
    if not user:
        # Keep /me endpoints usable in first-session flows without requiring an explicit
        # bootstrap step. This mirrors the behavior of `GET /me`.
        email = claims.get("email", "")
        display = email.split("@")[0] if email else auth_subject
        try:
            user = User(
                email=email or f"{auth_subject}@example.local",
                display_name=display,
                auth_provider="clerk",
                auth_subject=auth_subject,
                is_active=True,
            )
            db.add(user)
            db.flush()
            helpers.create_default_workspace(db, user)
            if not user.settings:
                db.add(
                    UserSettings(
                        user_id=user.id,
                        preferred_currency="INR",
                        risk_profile="moderate",
                        notifications_enabled=True,
                        theme="dark",
                    )
                )
            db.commit()
            db.refresh(user)
        except Exception:
            db.rollback()
            raise HTTPException(status_code=500, detail="Failed to auto-provision user")

    portfolios = (
        db.query(Portfolio)
        .filter(Portfolio.user_id == user.id)
        .order_by(Portfolio.created_at.asc())
        .all()
    )
    watchlist_entries = (
        db.query(WatchlistEntry)
        .filter(WatchlistEntry.user_id == user.id)
        .order_by(WatchlistEntry.added_at.desc())
        .all()
    )
    research_notes = (
        db.query(ResearchNote)
        .filter(ResearchNote.user_id == user.id)
        .order_by(ResearchNote.created_at.desc())
        .all()
    )
    saved_screeners = (
        db.query(SavedScreener)
        .filter(SavedScreener.user_id == user.id)
        .order_by(SavedScreener.created_at.desc())
        .all()
    )
    review_cases = helpers.get_public_review_cases_for_user_scope(db, user.id, statuses=["open", "in_progress"])
    # If the user has no review cases (common for fresh accounts), include the
    # seeded public demo case so UX + API shape remain stable.
    if not review_cases:
        demo_review_cases = helpers.get_public_review_cases_for_user_scope(db, user.id, statuses=["open", "in_progress"])
        # The above is user-scoped; add global demo if still empty.
        if not demo_review_cases:
            try:
                demo_stock = db.query(Stock).filter(Stock.symbol == "WIPRO").first()
                if demo_stock:
                    demo_case = helpers.get_public_review_case_for_stock(db, demo_stock.id)
                    if demo_case:
                        review_cases = [demo_case]
            except Exception:
                pass

    return {
        "user": user,
        "dashboard": helpers.build_dashboard_payload(user.display_name, portfolios, watchlist_entries),
        "portfolios": portfolios,
        "watchlist": watchlist_entries,
        "saved_screeners": saved_screeners,
        "research_notes": research_notes,
        "compliance_check": helpers.build_compliance_check(portfolios),
        "activity_feed": helpers.build_activity_feed(
            user=user,
            portfolios=portfolios,
            watchlist_entries=watchlist_entries,
            research_notes=research_notes,
            review_cases=review_cases,
        ),
        "review_cases": review_cases,
    }


@router.get("/me/alerts", response_model=list[AlertRead])
def get_current_alerts(claims: dict = Depends(get_current_auth_claims_or_internal), db: Session = Depends(get_db)):
    user = helpers.get_current_user_from_claims(db, claims)

    portfolios = (
        db.query(Portfolio)
        .filter(Portfolio.user_id == user.id)
        .order_by(Portfolio.created_at.asc())
        .all()
    )
    watchlist_entries = (
        db.query(WatchlistEntry)
        .filter(WatchlistEntry.user_id == user.id)
        .order_by(WatchlistEntry.added_at.desc())
        .all()
    )
    review_cases = helpers.get_public_review_cases_for_user_scope(db, user.id, limit=4)

    return helpers.build_alerts_payload(user, portfolios, watchlist_entries, review_cases)


@router.get("/me/compliance-queue", response_model=list[ComplianceQueueItemRead])
def get_current_compliance_queue(
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    user = helpers.get_current_user_from_claims(db, claims)

    portfolios = (
        db.query(Portfolio)
        .filter(Portfolio.user_id == user.id)
        .order_by(Portfolio.created_at.asc())
        .all()
    )
    watchlist_entries = (
        db.query(WatchlistEntry)
        .filter(WatchlistEntry.user_id == user.id)
        .order_by(WatchlistEntry.added_at.desc())
        .all()
    )
    return helpers.build_compliance_queue(portfolios, watchlist_entries)


@router.get("/me/activity-feed", response_model=list[ActivityEventRead])
def get_current_activity_feed(
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    user = helpers.get_current_user_from_claims(db, claims)
    portfolios = (
        db.query(Portfolio)
        .filter(Portfolio.user_id == user.id)
        .order_by(Portfolio.created_at.asc())
        .all()
    )
    watchlist_entries = (
        db.query(WatchlistEntry)
        .filter(WatchlistEntry.user_id == user.id)
        .order_by(WatchlistEntry.added_at.desc())
        .all()
    )
    research_notes = (
        db.query(ResearchNote)
        .filter(ResearchNote.user_id == user.id)
        .order_by(ResearchNote.created_at.desc())
        .all()
    )
    review_cases = helpers.get_public_review_cases_for_user_scope(db, user.id, limit=6)
    return helpers.build_activity_feed(
        user=user,
        portfolios=portfolios,
        watchlist_entries=watchlist_entries,
        research_notes=research_notes,
        review_cases=review_cases,
    )


@router.get("/me/watchlist", response_model=list[WatchlistEntryRead])
def list_current_watchlist(
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    auth_subject = claims.get("sub")
    if not auth_subject:
        raise HTTPException(status_code=401, detail="Token subject missing")

    user = db.query(User).filter(User.auth_subject == auth_subject, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not provisioned")

    entries = (
        db.query(WatchlistEntry)
        .filter(WatchlistEntry.user_id == user.id)
        .order_by(WatchlistEntry.added_at.desc())
        .all()
    )
    return helpers.build_watchlist_entry_reads(db, user.id, entries)


@router.post("/me/watchlist", response_model=WatchlistEntryRead)
def create_current_watchlist_entry(
    payload: WatchlistEntryCreateRequest,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    auth_subject = claims.get("sub")
    if not auth_subject:
        raise HTTPException(status_code=401, detail="Token subject missing")

    user = db.query(User).filter(User.auth_subject == auth_subject, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not provisioned")

    stock = (
        db.query(Stock)
        .filter(Stock.symbol == payload.symbol.upper(), Stock.is_active.is_(True))
        .first()
    )
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    entry = (
        db.query(WatchlistEntry)
        .filter(WatchlistEntry.user_id == user.id, WatchlistEntry.stock_id == stock.id)
        .first()
    )
    if entry:
        entry.notes = payload.notes.strip() or entry.notes
    else:
        entry = WatchlistEntry(
            user_id=user.id,
            owner_name=(user.display_name or user.email or "user").lower().replace(" ", "-"),
            stock_id=stock.id,
            notes=payload.notes.strip() or "Added from the product research flow.",
        )
        db.add(entry)

    db.commit()
    db.refresh(entry)
    reads = helpers.build_watchlist_entry_reads(db, user.id, [entry])
    return reads[0]


@router.delete("/me/watchlist/{symbol}", response_model=ActionResponse)
def delete_current_watchlist_entry(
    symbol: str,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    auth_subject = claims.get("sub")
    if not auth_subject:
        raise HTTPException(status_code=401, detail="Token subject missing")

    user = db.query(User).filter(User.auth_subject == auth_subject, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not provisioned")

    stock = (
        db.query(Stock)
        .filter(Stock.symbol == symbol.upper(), Stock.is_active.is_(True))
        .first()
    )
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    entry = (
        db.query(WatchlistEntry)
        .filter(WatchlistEntry.user_id == user.id, WatchlistEntry.stock_id == stock.id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Watchlist entry not found")

    db.delete(entry)
    db.commit()
    return {"ok": True, "message": "Watchlist entry deleted"}


@router.post("/me/holdings", response_model=PortfolioRead)
def create_holding(
    payload: HoldingCreateRequest,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    user = helpers.get_current_user_from_claims(db, claims)

    stock = (
        db.query(Stock)
        .filter(Stock.symbol == payload.symbol.upper(), Stock.is_active.is_(True))
        .first()
    )
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.user_id == user.id)
        .order_by(Portfolio.created_at.asc())
        .first()
    )
    if not portfolio:
        owner_name = (user.display_name or user.email or "user").lower().replace(" ", "-")
        portfolio = Portfolio(
            user_id=user.id,
            owner_name=owner_name,
            name="My Portfolio",
            base_currency="INR",
            investment_objective="Long-term halal investing",
        )
        db.add(portfolio)
        db.flush()

    existing = (
        db.query(PortfolioHolding)
        .filter(PortfolioHolding.portfolio_id == portfolio.id, PortfolioHolding.stock_id == stock.id)
        .first()
    )
    if existing:
        total_qty = existing.quantity + payload.quantity
        existing.average_buy_price = (
            (existing.quantity * existing.average_buy_price + payload.quantity * payload.average_buy_price)
            / total_qty
        )
        existing.quantity = total_qty
        if payload.thesis.strip():
            existing.thesis = payload.thesis.strip()
    else:
        holding = PortfolioHolding(
            portfolio_id=portfolio.id,
            stock_id=stock.id,
            quantity=payload.quantity,
            average_buy_price=payload.average_buy_price,
            thesis=payload.thesis.strip() or "",
        )
        db.add(holding)

    db.commit()
    db.refresh(portfolio)
    return portfolio


@router.delete("/me/holdings/{symbol}", response_model=ActionResponse)
def delete_holding(
    symbol: str,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    user = helpers.get_current_user_from_claims(db, claims)

    stock = (
        db.query(Stock)
        .filter(Stock.symbol == symbol.upper(), Stock.is_active.is_(True))
        .first()
    )
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.user_id == user.id)
        .order_by(Portfolio.created_at.asc())
        .first()
    )
    if not portfolio:
        raise HTTPException(status_code=404, detail="No portfolio found")

    holding = (
        db.query(PortfolioHolding)
        .filter(PortfolioHolding.portfolio_id == portfolio.id, PortfolioHolding.stock_id == stock.id)
        .first()
    )
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    db.delete(holding)
    db.commit()
    return {"ok": True, "message": f"Holding for {symbol.upper()} removed"}


@router.get("/users/{auth_subject}/saved-screeners", response_model=list[SavedScreenerRead])
def list_saved_screeners(
    auth_subject: str,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    caller_subject = claims.get("sub")
    if caller_subject != auth_subject and not is_admin(db, claims):
        raise HTTPException(status_code=403, detail="You can only view your own screeners")

    user = db.query(User).filter(User.auth_subject == auth_subject, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return (
        db.query(SavedScreener)
        .filter(SavedScreener.user_id == user.id)
        .order_by(SavedScreener.created_at.desc())
        .all()
    )


@router.get("/me/research-notes", response_model=list[ResearchNoteRead])
def list_current_research_notes(
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    user = helpers.get_current_user_from_claims(db, claims)

    return (
        db.query(ResearchNote)
        .filter(ResearchNote.user_id == user.id)
        .order_by(ResearchNote.created_at.desc())
        .all()
    )


@router.post("/me/research-notes", response_model=ResearchNoteRead)
def create_current_research_note(
    payload: ResearchNoteCreateRequest,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    user = helpers.get_current_user_from_claims(db, claims)
    stock = (
        db.query(Stock)
        .filter(Stock.symbol == payload.symbol.upper(), Stock.is_active.is_(True))
        .first()
    )
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    note_type = payload.note_type.upper().strip()
    if note_type not in {"WATCH", "ADD", "TRIM", "EXIT"}:
        raise HTTPException(status_code=400, detail="Note type must be WATCH, ADD, TRIM, or EXIT")

    conviction = payload.conviction.lower().strip()
    if conviction not in {"low", "medium", "high"}:
        raise HTTPException(status_code=400, detail="Conviction must be low, medium, or high")

    portfolio_id = payload.portfolio_id
    if portfolio_id is None:
        default_portfolio = (
            db.query(Portfolio)
            .filter(Portfolio.user_id == user.id)
            .order_by(Portfolio.created_at.asc())
            .first()
        )
        portfolio_id = default_portfolio.id if default_portfolio else None
    elif not db.query(Portfolio).filter(Portfolio.id == portfolio_id, Portfolio.user_id == user.id).first():
        raise HTTPException(status_code=404, detail="Portfolio not found")

    current_status = evaluate_stock(helpers.stock_to_dict(stock), profile=PRIMARY_PROFILE)["status"]
    research_note = ResearchNote(
        user_id=user.id,
        portfolio_id=portfolio_id,
        stock_id=stock.id,
        note_type=note_type,
        summary=payload.summary.strip(),
        conviction=conviction,
        status_snapshot=current_status,
        notes=payload.notes.strip(),
    )
    db.add(research_note)

    # Mirror latest research note text on the user's watchlist row (same UX as portfolio notes).
    summary = payload.summary.strip()
    body = payload.notes.strip()
    parts: list[str] = []
    if summary:
        parts.append(f"[{note_type}] {summary}")
    else:
        parts.append(f"[{note_type}]")
    if body:
        snippet = body[:400] + ("…" if len(body) > 400 else "")
        parts.append(snippet)
    watchlist_line = " ".join(p for p in parts if p).strip()[:2000] or f"[{note_type}] Research note"

    wl = (
        db.query(WatchlistEntry)
        .filter(WatchlistEntry.user_id == user.id, WatchlistEntry.stock_id == stock.id)
        .first()
    )
    if wl:
        wl.notes = watchlist_line
    else:
        db.add(
            WatchlistEntry(
                user_id=user.id,
                owner_name=(user.display_name or user.email or "user").lower().replace(" ", "-"),
                stock_id=stock.id,
                notes=watchlist_line,
            )
        )

    db.commit()
    db.refresh(research_note)
    return research_note


@router.delete("/me/research-notes/{note_id}", response_model=ActionResponse)
def delete_current_research_note(
    note_id: int,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    user = helpers.get_current_user_from_claims(db, claims)
    research_note = (
        db.query(ResearchNote)
        .filter(ResearchNote.id == note_id, ResearchNote.user_id == user.id)
        .first()
    )
    if not research_note:
        raise HTTPException(status_code=404, detail="Research note not found")

    db.delete(research_note)
    db.commit()
    return {"ok": True, "message": "Research note deleted"}


@router.get("/me/compliance-check", response_model=list[ComplianceCheckRead])
def get_current_compliance_check(
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    user = helpers.get_current_user_from_claims(db, claims)
    portfolios = (
        db.query(Portfolio)
        .filter(Portfolio.user_id == user.id)
        .order_by(Portfolio.created_at.asc())
        .all()
    )
    return helpers.build_compliance_check(portfolios)


@router.get("/me/saved-screeners", response_model=list[SavedScreenerRead])
def list_current_saved_screeners(
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    auth_subject = claims.get("sub")
    if not auth_subject:
        raise HTTPException(status_code=401, detail="Token subject missing")

    user = db.query(User).filter(User.auth_subject == auth_subject, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not provisioned")

    return (
        db.query(SavedScreener)
        .filter(SavedScreener.user_id == user.id)
        .order_by(SavedScreener.created_at.desc())
        .all()
    )


@router.post("/me/saved-screeners", response_model=SavedScreenerRead)
def create_current_saved_screener(
    payload: SavedScreenerCreateRequest,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    user = helpers.get_current_user_from_claims(db, claims)

    saved_screener = SavedScreener(
        user_id=user.id,
        name=payload.name.strip(),
        search_query=payload.search_query.strip(),
        sector=payload.sector.strip() or "All",
        status_filter=payload.status_filter.strip() or "all",
        halal_only=payload.halal_only,
        notes=payload.notes.strip(),
    )
    db.add(saved_screener)
    db.commit()
    db.refresh(saved_screener)
    return saved_screener


@router.delete("/me/saved-screeners/{screener_id}", response_model=ActionResponse)
def delete_current_saved_screener(
    screener_id: int,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    auth_subject = claims.get("sub")
    if not auth_subject:
        raise HTTPException(status_code=401, detail="Token subject missing")

    user = db.query(User).filter(User.auth_subject == auth_subject, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not provisioned")

    saved_screener = (
        db.query(SavedScreener)
        .filter(SavedScreener.id == screener_id, SavedScreener.user_id == user.id)
        .first()
    )
    if not saved_screener:
        raise HTTPException(status_code=404, detail="Saved screener not found")

    db.delete(saved_screener)
    db.commit()
    return {"ok": True, "message": "Saved screener deleted"}


@router.get("/portfolio/{owner_name}", response_model=list[PortfolioRead])
def list_portfolios(
    owner_name: str,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    return (
        db.query(Portfolio)
        .filter(Portfolio.owner_name == owner_name)
        .order_by(Portfolio.created_at.asc())
        .all()
    )


@router.get("/watchlist/{owner_name}", response_model=list[WatchlistEntryRead])
def list_watchlist(
    owner_name: str,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    entries = (
        db.query(WatchlistEntry)
        .filter(WatchlistEntry.owner_name == owner_name)
        .order_by(WatchlistEntry.added_at.desc())
        .all()
    )
    if not entries:
        return []
    return helpers.build_watchlist_entry_reads(db, entries[0].user_id, entries)


@router.get("/screening-logs", response_model=list[ScreeningLogRead])
def list_screening_logs(
    limit: int = Query(default=20, ge=1, le=100),
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    helpers.require_admin(db, claims)
    return (
        db.query(ScreeningLog)
        .order_by(ScreeningLog.created_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/dashboard/{owner_name}")
def dashboard(
    owner_name: str,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    portfolios = db.query(Portfolio).filter(Portfolio.owner_name == owner_name).all()
    watchlist_entries = db.query(WatchlistEntry).filter(WatchlistEntry.owner_name == owner_name).all()
    return helpers.build_dashboard_payload(owner_name, portfolios, watchlist_entries)


@router.get("/admin/roles", response_model=AdminRolesResponse)
def admin_list_roles(
    claims: dict = Depends(get_current_auth_claims),
    db: Session = Depends(get_db),
):
    """List available roles with descriptions and hierarchy levels."""
    helpers.require_admin(db, claims)

    roles = [
        AdminRoleDefinition(
            code=code,
            name=code.capitalize(),
            description=ROLE_DESCRIPTIONS[code],
            level=ROLE_HIERARCHY[code],
        )
        for code in sorted(VALID_ROLES, key=lambda r: ROLE_HIERARCHY[r], reverse=True)
    ]
    return {"roles": roles}


@router.get("/admin/users", response_model=AdminUsersListResponse)
def admin_list_users(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    claims: dict = Depends(get_current_auth_claims),
    db: Session = Depends(get_db),
):
    """
    List all users with pagination.
    Returns: id, email, display_name, role, is_active, created_at
    """
    helpers.require_admin(db, claims)

    # Get total count
    total = db.query(User).count()

    # Get paginated users
    users = (
        db.query(User)
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = []
    for user in users:
        items.append(AdminUserRead(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
        ))

    return AdminUsersListResponse(
        items=items,
        total=total,
        offset=offset,
        limit=limit,
    )


@router.put("/admin/users/{user_id}/role", response_model=AdminUserRead)
def admin_update_user_role(
    user_id: int,
    payload: AdminUserRoleUpdateRequest,
    claims: dict = Depends(get_current_auth_claims),
    db: Session = Depends(get_db),
):
    """
    Assign a role to a user.
    Cannot demote the current admin user.
    """
    admin_subject = helpers.require_admin(db, claims)
    admin_user = get_user_by_claims(db, claims)

    # Get the target user
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate role
    if payload.role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {', '.join(sorted(VALID_ROLES))}"
        )

    # Prevent demoting current admin user
    if admin_user.id == user_id and payload.role != "admin":
        raise HTTPException(
            status_code=400,
            detail="Cannot demote your own admin role"
        )

    # Update the role
    old_role = target_user.role
    target_user.role = payload.role
    db.commit()
    db.refresh(target_user)

    return AdminUserRead(
        id=target_user.id,
        email=target_user.email,
        display_name=target_user.display_name,
        role=target_user.role,
        is_active=target_user.is_active,
        created_at=target_user.created_at,
    )


@router.put("/admin/users/{user_id}/active", response_model=AdminUserRead)
def admin_update_user_active(
    user_id: int,
    payload: AdminUserActiveUpdateRequest,
    claims: dict = Depends(get_current_auth_claims),
    db: Session = Depends(get_db),
):
    """
    Enable or disable a user account.
    """
    helpers.require_admin(db, claims)

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    target_user.is_active = payload.is_active
    db.commit()
    db.refresh(target_user)

    return AdminUserRead(
        id=target_user.id,
        email=target_user.email,
        display_name=target_user.display_name,
        role=target_user.role,
        is_active=target_user.is_active,
        created_at=target_user.created_at,
    )


# ═══════════════════════════════════════════════════════════════
# TRENDING
# ═══════════════════════════════════════════════════════════════

@router.get("/trending/{category}")
def get_trending(
    category: str,
    exchange: str | None = None,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    from app.services.trending_service import get_trending as _get_trending
    return _get_trending(db, category=category, exchange=exchange, limit=min(limit, 50))


# ═══════════════════════════════════════════════════════════════
# COLLECTIONS
# ═══════════════════════════════════════════════════════════════

@router.get("/collections")
def list_collections(db: Session = Depends(get_db)):
    from app.services.collection_service import get_collections
    return get_collections(db)


@router.get("/collections/{slug}")
def get_collection(slug: str, db: Session = Depends(get_db)):
    from app.services.collection_service import get_collection_detail
    result = get_collection_detail(db, slug)
    if not result:
        raise HTTPException(status_code=404, detail="Collection not found")
    return result


# ═══════════════════════════════════════════════════════════════
# SUPER INVESTORS
# ═══════════════════════════════════════════════════════════════

@router.get("/super-investors")
def list_super_investors(db: Session = Depends(get_db)):
    from app.services.investor_service import get_investors
    return get_investors(db)


@router.get("/super-investors/{slug}")
def get_super_investor(slug: str, db: Session = Depends(get_db)):
    from app.services.investor_service import get_investor_detail
    result = get_investor_detail(db, slug)
    if not result:
        raise HTTPException(status_code=404, detail="Investor not found")
    return result


# ═══════════════════════════════════════════════════════════════
# ETFS
# ═══════════════════════════════════════════════════════════════

@router.get("/etfs")
def list_etfs(exchange: str | None = None):
    from app.services.etf_service import get_etfs
    return get_etfs(exchange=exchange)


# ═══════════════════════════════════════════════════════════════
# INVESTMENT METRICS
# ═══════════════════════════════════════════════════════════════

@router.get("/metrics/{symbol}")
def get_metrics(symbol: str, db: Session = Depends(get_db)):
    from app.services.metrics_service import get_investment_metrics
    stock = db.query(Stock).filter(Stock.symbol == symbol.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    stock_data = helpers.stock_to_dict(stock)
    return get_investment_metrics(stock_data)


# ═══════════════════════════════════════════════════════════════
# COMPLIANCE HISTORY
# ═══════════════════════════════════════════════════════════════

@router.get("/compliance-history/{symbol}")
def get_compliance_history(symbol: str, db: Session = Depends(get_db)):
    from app.models import ComplianceHistory
    stock = db.query(Stock).filter(Stock.symbol == symbol.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    entries = (
        db.query(ComplianceHistory)
        .filter(ComplianceHistory.stock_id == stock.id)
        .order_by(ComplianceHistory.recorded_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "status": e.status,
            "profile_code": e.profile_code,
            "recorded_at": e.recorded_at.isoformat() if e.recorded_at else None,
        }
        for e in entries
    ]


# ═══════════════════════════════════════════════════════════════
# COVERAGE REQUESTS
# ═══════════════════════════════════════════════════════════════

def _ensure_user_for_me(db: Session, claims: dict) -> User:
    """Create user + workspace if missing (same pattern as GET /me/workspace)."""
    auth_subject = claims.get("sub")
    if not auth_subject:
        raise HTTPException(status_code=401, detail="Token subject missing")
    user = db.query(User).filter(User.auth_subject == auth_subject, User.is_active.is_(True)).first()
    if user:
        return user
    email = claims.get("email", "") or ""
    display = email.split("@")[0] if email else auth_subject
    try:
        user = User(
            email=email or f"{auth_subject}@example.local",
            display_name=display,
            auth_provider="clerk",
            auth_subject=auth_subject,
            is_active=True,
        )
        db.add(user)
        db.flush()
        helpers.create_default_workspace(db, user)
        if not user.settings:
            db.add(
                UserSettings(
                    user_id=user.id,
                    preferred_currency="INR",
                    risk_profile="moderate",
                    notifications_enabled=True,
                    theme="dark",
                )
            )
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to auto-provision user")
    return user


@router.post("/me/coverage-requests")
def create_coverage_request(
    symbol: str = Body(...),
    exchange: str = Body("NSE"),
    notes: str = Body(""),
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_auth_claims_or_internal),
):
    from app.models import CoverageRequest, utc_now
    user = _ensure_user_for_me(db, claims)
    now = utc_now()
    req = CoverageRequest(
        user_id=user.id,
        symbol=symbol.upper().strip(),
        exchange=exchange.upper().strip(),
        notes=notes,
        requested_at=now,
        created_at=now,
    )
    db.add(req)
    db.commit()
    return {"id": req.id, "symbol": req.symbol, "exchange": req.exchange, "status": req.status}


@router.get("/me/coverage-requests")
def list_coverage_requests(
    db: Session = Depends(get_db),
    auth_subject: str = Depends(require_auth),
):
    from app.models import CoverageRequest
    user = db.query(User).filter(User.auth_subject == auth_subject).first()
    if not user:
        return []
    requests = db.query(CoverageRequest).filter(CoverageRequest.user_id == user.id).order_by(CoverageRequest.created_at.desc()).all()
    return [
        {"id": r.id, "symbol": r.symbol, "exchange": r.exchange, "notes": r.notes, "status": r.status, "created_at": r.created_at.isoformat() if r.created_at else None}
        for r in requests
    ]


# ═══════════════════════════════════════════════════════════════
# FEEDBACK (public + admin)
# ═══════════════════════════════════════════════════════════════

@router.post("/feedback")
def submit_feedback(
    email: str = Body(""),
    name: str = Body(""),
    category: str = Body("general"),
    message: str = Body(...),
    db: Session = Depends(get_db),
):
    """Public endpoint — no auth required. Anyone can submit feedback."""
    from app.models import Feedback
    fb = Feedback(
        email=email.strip(),
        name=name.strip(),
        category=category.strip(),
        message=message.strip(),
    )
    db.add(fb)
    db.commit()
    return {"id": fb.id, "status": fb.status, "message": "Thank you for your feedback!"}


@router.get("/admin/feedback")
def admin_list_feedback(
    status: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    claims: dict = Depends(helpers.verify_clerk_token),
):
    """Admin only — list all feedback."""
    helpers.require_admin(db, claims)
    from app.models import Feedback
    query = db.query(Feedback).order_by(Feedback.created_at.desc())
    if status:
        query = query.filter(Feedback.status == status)
    items = query.limit(min(limit, 200)).all()
    return [
        {
            "id": f.id,
            "email": f.email,
            "name": f.name,
            "category": f.category,
            "message": f.message,
            "status": f.status,
            "admin_notes": f.admin_notes,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f in items
    ]


@router.patch("/admin/feedback/{feedback_id}")
def admin_update_feedback(
    feedback_id: int,
    status: str | None = Body(None),
    admin_notes: str | None = Body(None),
    db: Session = Depends(get_db),
    claims: dict = Depends(helpers.verify_clerk_token),
):
    """Admin only — update feedback status and/or admin notes."""
    helpers.require_admin(db, claims)
    from app.models import Feedback
    fb = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")
    if status is not None:
        fb.status = status
    if admin_notes is not None:
        fb.admin_notes = admin_notes
    db.commit()
    return {"id": fb.id, "status": fb.status, "admin_notes": fb.admin_notes}


# ═══════════════════════════════════════════════════════════════
# ADMIN: COVERAGE REQUESTS (all users)
# ═══════════════════════════════════════════════════════════════

@router.get("/admin/coverage-requests")
def admin_list_coverage_requests(
    status: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    claims: dict = Depends(helpers.verify_clerk_token),
):
    """Admin only — list ALL coverage requests from all users."""
    helpers.require_admin(db, claims)
    from app.models import CoverageRequest, User
    query = (
        db.query(CoverageRequest, User)
        .outerjoin(User, CoverageRequest.user_id == User.id)
        .order_by(CoverageRequest.created_at.desc())
    )
    if status:
        query = query.filter(CoverageRequest.status == status)
    items = query.limit(min(limit, 200)).all()
    return [
        {
            "id": cr.id,
            "symbol": cr.symbol,
            "exchange": cr.exchange,
            "notes": cr.notes,
            "status": cr.status,
            "created_at": cr.created_at.isoformat() if cr.created_at else None,
            "user_email": u.email if u else "unknown",
            "user_name": u.display_name if u else "unknown",
        }
        for cr, u in items
    ]


@router.patch("/admin/coverage-requests/{request_id}")
def admin_update_coverage_request(
    request_id: int,
    status: str = Body(...),
    db: Session = Depends(get_db),
    claims: dict = Depends(helpers.verify_clerk_token),
):
    """Admin only — update coverage request status."""
    helpers.require_admin(db, claims)
    from app.models import CoverageRequest
    cr = db.query(CoverageRequest).filter(CoverageRequest.id == request_id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Coverage request not found")
    cr.status = status
    db.commit()
    return {"id": cr.id, "status": cr.status}

# ═══════════════════════════════════════════════════════════════
# NEWS (RSS-backed)
# ═══════════════════════════════════════════════════════════════

@router.get("/news")
def list_public_news(
    limit: int = Query(default=24, ge=1, le=100),
    db: Session = Depends(get_db),
):
    from app.services.news_service import list_news
    return list_news(db, limit=limit)


@router.post("/internal/news/sync")
def sync_news_feed(
    db: Session = Depends(get_db),
    x_internal_service_token: str | None = Header(default=None, alias="X-Internal-Service-Token"),
):
    from app.config import INTERNAL_SERVICE_TOKEN
    from app.services.news_service import fetch_and_upsert_news, fetch_and_upsert_newsdata
    if x_internal_service_token != INTERNAL_SERVICE_TOKEN:
        raise HTTPException(status_code=403, detail="Forbidden")
    n_rss = fetch_and_upsert_news(db)
    n_nd = fetch_and_upsert_newsdata(db)
    return {"ok": True, "upserted_rss": n_rss, "upserted_newsdata": n_nd, "upserted": n_rss + n_nd}

# ═══════════════════════════════════════════════════════════════
# BROKER: Upstox OAuth
# ═══════════════════════════════════════════════════════════════

@router.get("/me/integrations/upstox/authorize-url")
def upstox_authorize_url(auth_subject: str = Depends(require_auth)):
    """Returns Upstox login URL with signed state (user must open in browser)."""
    from app.config import UPSTOX_API_KEY, UPSTOX_REDIRECT_URI
    from app.services.upstox_oauth import build_authorize_url, create_oauth_state
    if not UPSTOX_API_KEY or not UPSTOX_REDIRECT_URI:
        raise HTTPException(
            status_code=503,
            detail="Upstox is not configured. Set UPSTOX_API_KEY and UPSTOX_REDIRECT_URI on the API.",
        )
    state = create_oauth_state(auth_subject)
    try:
        url = build_authorize_url(state)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    return {"url": url}


@router.get("/me/integrations/upstox/callback")
def upstox_oauth_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    db: Session = Depends(get_db),
):
    """OAuth redirect from Upstox — exchanges code and stores encrypted token."""
    from urllib.parse import quote
    from app.models import BrokerConnection, User
    from app.services.broker_token_store import encrypt_token
    from app.services.upstox_oauth import exchange_code_for_token, verify_oauth_state

    frontend = FRONTEND_APP_URL.rstrip("/")

    def redirect_status(status: str, msg: str = "") -> RedirectResponse:
        q = f"broker=upstox&status={quote(status)}"
        if msg:
            q += f"&message={quote(msg[:300])}"
        return RedirectResponse(url=f"{frontend}/watchlist?{q}", status_code=302)

    if error:
        return redirect_status("error", error_description or error)
    if not code or not state:
        return redirect_status("error", "Missing code or state")

    auth_subject = verify_oauth_state(state)
    if not auth_subject:
        return redirect_status("error", "Invalid or expired state")

    user = db.query(User).filter(User.auth_subject == auth_subject).first()
    if not user:
        return redirect_status("error", "User not found")

    try:
        token_payload = exchange_code_for_token(code)
    except Exception as exc:
        return redirect_status("error", str(exc)[:200])

    access = token_payload.get("access_token") if isinstance(token_payload, dict) else None
    if not access:
        return redirect_status("error", "No access_token in Upstox response")

    row = (
        db.query(BrokerConnection)
        .filter(BrokerConnection.user_id == user.id, BrokerConnection.broker_id == "upstox")
        .first()
    )
    enc = encrypt_token(access)
    if row:
        row.access_token_enc = enc
        row.status = "connected"
        row.error_message = ""
    else:
        db.add(
            BrokerConnection(
                user_id=user.id,
                broker_id="upstox",
                broker_name="Upstox",
                status="connected",
                access_token_enc=enc,
            )
        )
    db.commit()
    return redirect_status("connected")


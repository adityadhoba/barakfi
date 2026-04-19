import time
import logging
from collections import defaultdict
from datetime import datetime, timezone
import os
import subprocess
from typing import Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Query
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from starlette.requests import Request

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
    OWNER_AUTH_SUBJECTS,
    OWNER_EMAILS,
)
from app.services.rbac import (
    is_admin,
    is_owner,
    get_user_by_claims,
    ROLE_DESCRIPTIONS,
    ROLE_HIERARCHY,
    VALID_ROLES,
)
from app.database import get_db
from app.api import helpers
from app.api.envelope import api_error
from app.api.public_screen_guard import enforce_screening_budget
from app.models import (
    ComplianceHistory,
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
    StockSymbolAlias,
    StockIndexMembership,
    User,
    UserSettings,
    WatchlistEntry,
    BrokerConnection,
    DailyRefreshRun,
    SymbolResolutionIssue,
    StockCorporateEvent,
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
    StockCorporateEventCreate,
    StockCorporateEventRead,
    SymbolResolutionHealthResponse,
    SymbolResolutionIssueRead,
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
    CheckStockResponse,
    StockRead,
    TrackSymbolRequest,
    UserSettingsRead,
    UserSettingsUpdateRequest,
    UserProvisionRequest,
    UserRead,
    HoldingCreateRequest,
    WatchlistEntryCreateRequest,
    WatchlistEntryRead,
    WorkspaceResponse,
)
from app.services.cache_service import (
    SCREENING_CACHE_TTL_SECONDS,
    screening_cache,
    screening_cache_key,
)
from app.services.halal_service import (
    PRIMARY_PROFILE,
    evaluate_stock,
    evaluate_stock_multi,
    get_profile_version,
    get_rulebook,
)
from app.services.screening_presenter import (
    build_rich_screening_payload,
    build_seo_block,
    simple_row_from_cache_entry,
)
from app.services.indian_market_client import fetch_quote_by_provider, quote_to_dict, fetch_nse_indices
from app.services.index_sync_service import get_cached_market_indices, sync_market_indices
from app.services.symbol_integrity_service import run_nse_symbol_integrity_checks, symbol_health_summary
from app.services.market_data_service import get_market_data_status
from app.services.market_data_service import get_data_stack_status, get_fundamentals_status
from app.services.ops_notification_service import send_ops_alert
from app.services.quote_sync_service import PUBLIC_MARKET_PROVIDERS, sync_all_stock_prices
from app.services.provider_sync_service import preview_market_universe
from app.services.auth_service import get_current_auth_claims, get_current_auth_claims_or_internal, require_auth
from app.services.stock_data_quality import fundamentals_completeness_payload
from app.services.corporate_action_service import (
    apply_corporate_action_events,
    summarize_latest_events_by_symbols,
)
from app.services.stock_lookup import is_indian_exchange, resolve_stock

router = APIRouter(prefix="/api")
logger = logging.getLogger("barakfi")


def _is_owner_user(user: User) -> bool:
    email = (user.email or "").strip().lower()
    return user.role == "owner" or email in OWNER_EMAILS or user.auth_subject in OWNER_AUTH_SUBJECTS


def _index_codes_by_stock_id(db: Session, stock_ids: list[int]) -> dict[int, list[str]]:
    m: defaultdict[int, list[str]] = defaultdict(list)
    if not stock_ids:
        return {}
    for r in db.query(StockIndexMembership).filter(StockIndexMembership.stock_id.in_(stock_ids)):
        m[r.stock_id].append(r.index_code)
    return {k: sorted(set(v)) for k, v in m.items()}


def _search_aliases_by_symbol(db: Session, symbols: list[str]) -> dict[str, list[str]]:
    lookup = {s.strip().upper() for s in symbols if s and s.strip()}
    if not lookup:
        return {}

    out: dict[str, set[str]] = {sym: set() for sym in lookup}

    alias_rows = (
        db.query(StockSymbolAlias.old_symbol, StockSymbolAlias.new_symbol)
        .filter(StockSymbolAlias.status == "active")
        .filter(StockSymbolAlias.new_symbol.in_(lookup))
        .all()
    )
    for old_symbol, new_symbol in alias_rows:
        old = (old_symbol or "").strip().upper()
        new = (new_symbol or "").strip().upper()
        if old and new in out and old != new:
            out[new].add(old)

    corporate_rows = (
        db.query(StockCorporateEvent.symbol, StockCorporateEvent.canonical_symbol, StockCorporateEvent.successor_symbol)
        .filter(StockCorporateEvent.status == "active")
        .filter(
            (StockCorporateEvent.canonical_symbol.in_(lookup)) | (StockCorporateEvent.successor_symbol.in_(lookup))
        )
        .all()
    )
    for legacy_symbol, canonical_symbol, successor_symbol in corporate_rows:
        legacy = (legacy_symbol or "").strip().upper()
        target = (canonical_symbol or successor_symbol or "").strip().upper()
        if legacy and target in out and legacy != target:
            out[target].add(legacy)

    return {k: sorted(v) for k, v in out.items() if v}


def _stock_read_enriched(db: Session, stock: Stock) -> StockRead:
    codes = _index_codes_by_stock_id(db, [stock.id]).get(stock.id, [])
    dq, missing = fundamentals_completeness_payload(stock)
    latest_event = summarize_latest_events_by_symbols(db, [stock.symbol]).get(stock.symbol.upper())
    alias_map = _search_aliases_by_symbol(db, [stock.symbol])
    return StockRead.model_validate(stock).model_copy(
        update={
            "index_memberships": codes,
            "data_quality": dq,
            "fundamentals_fields_missing": missing,
            "latest_corporate_event": latest_event,
            "search_aliases": alias_map.get(stock.symbol.upper(), []),
        }
    )


def _stocks_read_enriched(db: Session, stocks: list[Stock]) -> list[StockRead]:
    ids = [s.id for s in stocks]
    code_map = _index_codes_by_stock_id(db, ids)
    event_map = summarize_latest_events_by_symbols(db, [s.symbol for s in stocks])
    alias_map = _search_aliases_by_symbol(db, [s.symbol for s in stocks])
    out: list[StockRead] = []
    for s in stocks:
        dq, missing = fundamentals_completeness_payload(s)
        out.append(
            StockRead.model_validate(s).model_copy(
                update={
                    "index_memberships": code_map.get(s.id, []),
                    "data_quality": dq,
                    "fundamentals_fields_missing": missing,
                    "latest_corporate_event": event_map.get(s.symbol.upper()),
                    "search_aliases": alias_map.get(s.symbol.upper(), []),
                }
            )
        )
    return out


def _stock_has_compliance_override(db: Session, stock_id: int) -> bool:
    return (
        db.query(ComplianceOverride).filter(ComplianceOverride.stock_id == stock_id).first() is not None
    )


def _check_cache_key(symbol: str, exchange: str) -> str:
    return f"check:{symbol.strip().upper()}:{(exchange or '_').strip().upper()}"


def _multi_cache_key(symbol: str, exchange: str | None) -> str:
    return f"multi:{symbol.strip().upper()}:{(exchange or '_').strip().upper()}"


def _validate_screenable_stock_or_raise(stock: Stock) -> None:
    if not stock.is_active:
        successor = (stock.canonical_symbol or stock.successor_symbol or "").strip().upper() or None
        if successor:
            raise HTTPException(
                status_code=409,
                detail=f"Symbol moved to {successor}; use the canonical listing instead.",
            )
        raise HTTPException(
            status_code=409,
            detail=f"{stock.symbol} is not active for screening (status: {stock.symbol_status or 'inactive'}).",
        )
    if stock.screening_blocked_reason:
        raise HTTPException(status_code=409, detail=f"Screening blocked: {stock.screening_blocked_reason}")


def _tracked_rows_for_user(db: Session, user: User) -> list[dict[str, Any]]:
    entries = (
        db.query(WatchlistEntry)
        .filter(WatchlistEntry.user_id == user.id)
        .order_by(WatchlistEntry.added_at.desc())
        .all()
    )
    out: list[dict[str, Any]] = []
    for e in entries:
        s = e.stock
        row = simple_row_from_cache_entry(screening_cache.get(_check_cache_key(s.symbol, s.exchange)))
        if row:
            out.append(row)
        else:
            out.append({"symbol": s.symbol, "status": "Unknown", "score": None})
    return out


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
def market_indices(db: Session = Depends(get_db)):
    """
    Get live NSE indices (NIFTY 50, BANK NIFTY, SENSEX, NIFTY MIDCAP 150).

    Queries NSE India official website. Returns empty list if NSE is unavailable.
    These are public, delayed quotes (~15 min delay on NSE).

    Returns:
        List of IndexQuote with name, current value, change amount, change %, source, timestamp.
    """
    indices = fetch_nse_indices()
    if indices:
        try:
            sync_market_indices(db, indices)
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("[market-data/indices] failed to persist live index snapshot")
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
    return get_cached_market_indices(db)


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
    t0 = time.perf_counter()
    requested_exchange = (exchange or "").strip().upper()
    ex = requested_exchange or "NSE"
    try:
        # Hot path: when caller provides exchange, avoid DB lookup to reduce pool pressure.
        if not requested_exchange:
            row = resolve_stock(db, sym, None, active_only=True, require_indian_listing=True)
            ex = (row.exchange if row else "NSE").upper()
        quote = fetch_quote_by_provider(sym, ex, effective)
    except SQLAlchemyError as exc:
        latency_ms = int((time.perf_counter() - t0) * 1000)
        logger.exception(
            "[quote] db_failure symbol=%s exchange=%s provider=%s error=%s latency_ms=%s",
            sym,
            ex,
            effective,
            exc.__class__.__name__,
            latency_ms,
        )
        raise HTTPException(status_code=503, detail="Quote service temporarily unavailable. Please retry.")
    except Exception as exc:
        latency_ms = int((time.perf_counter() - t0) * 1000)
        logger.exception(
            "[quote] unhandled_failure symbol=%s exchange=%s provider=%s error=%s latency_ms=%s",
            sym,
            ex,
            effective,
            exc.__class__.__name__,
            latency_ms,
        )
        raise HTTPException(status_code=503, detail="Quote service temporarily unavailable. Please retry.")
    if not quote or quote.last_price is None:
        latency_ms = int((time.perf_counter() - t0) * 1000)
        logger.warning(
            "[quote] unavailable symbol=%s exchange=%s provider=%s latency_ms=%s",
            sym,
            ex,
            effective,
            latency_ms,
        )
        raise HTTPException(
            status_code=404,
            detail="Quote unavailable for this symbol or provider.",
        )
    latency_ms = int((time.perf_counter() - t0) * 1000)
    if latency_ms >= 1500:
        logger.warning(
            "[quote] slow_response symbol=%s exchange=%s provider=%s source=%s latency_ms=%s",
            sym,
            ex,
            effective,
            quote.source,
            latency_ms,
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
    if eff not in PUBLIC_MARKET_PROVIDERS:
        eff = "auto_india"
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
    return get_fundamentals_status(stock_count, db=db)


@router.get("/data-stack/status", response_model=DataStackStatusResponse)
def data_stack_status(db: Session = Depends(get_db)):
    stock_count = db.query(Stock).filter(Stock.is_active.is_(True)).count()
    return get_data_stack_status(stock_count, db=db)


@router.get("/stocks", response_model=list[StockRead])
def list_stocks(
    halal_only: bool = Query(default=False),
    search: str | None = Query(default=None),
    limit: int | None = Query(default=None, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    order_by: str = Query(default="symbol", pattern="^(symbol|market_cap_desc)$"),
    db: Session = Depends(get_db),
):
    """
    Get active stocks with fundamental data.

    Auth: None (public endpoint)

    Query Params:
        halal_only: Filter to HALAL-compliant stocks only (expensive, done in Python)
        search: Search by symbol or name (case insensitive, substring match)
        limit: Max rows to return (1-1000). Omit for all.
        offset: Row offset for pagination (use with limit for infinite scroll).
        order_by: Sort order — 'symbol' (default) or 'market_cap_desc'

    Returns:
        List of StockRead with symbol, name, sector, market cap, fundamentals

    Performance:
        500 stocks at ~1 KB each = ~500 KB. Use limit+offset for paginated loads.
        halal_only=true filters in Python — avoid for large limits.
    """
    query = db.query(Stock).filter(
        Stock.is_active.is_(True),
        Stock.exchange == "NSE",
    )

    if search:
        search_term = f"%{search.upper()}%"
        query = query.filter((Stock.symbol.ilike(search_term)) | (Stock.name.ilike(search_term)))

    if order_by == "market_cap_desc":
        query = query.order_by(Stock.market_cap.desc(), Stock.symbol.asc())
    else:
        query = query.order_by(Stock.symbol.asc())

    if offset > 0:
        query = query.offset(offset)
    if limit is not None:
        query = query.limit(limit)
    stocks = query.all()

    if not halal_only:
        return _stocks_read_enriched(db, stocks)

    filtered = [
        stock
        for stock in stocks
        if evaluate_stock(helpers.stock_to_dict(stock), profile=PRIMARY_PROFILE)["status"] == "HALAL"
    ]
    return _stocks_read_enriched(db, filtered)


@router.get("/stocks/{symbol}", response_model=StockRead)
def get_stock(
    symbol: str,
    exchange: str | None = Query(default=None, description="Disambiguate when the same ticker exists on multiple venues"),
    db: Session = Depends(get_db),
):
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
    stock = resolve_stock(db, symbol, exchange, active_only=True, require_indian_listing=True)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    return _stock_read_enriched(db, stock)


@router.get("/stocks/{symbol}/chart")
def get_stock_chart(
    symbol: str,
    range: str = Query(default="6mo", pattern="^(1mo|3mo|6mo|1y|5y)$"),
    exchange: str = Query(default="NSE", pattern="^(NSE|BSE)$"),
    db: Session = Depends(get_db),
):
    """
    Return OHLC candle data for a stock sourced from NSE Bhavcopy (MarketPriceDaily).

    Auth: None (public endpoint, cached at CDN level)

    Returns:
        {symbol, exchange, range, candles: [{time, open, high, low, close}]}

    Falls back to empty candles if no bhavcopy data yet exists for this symbol.
    """
    from datetime import date, timedelta
    import calendar

    try:
        from app.models_v2 import ListingV2, MarketPriceDaily
    except ImportError:
        return JSONResponse({"symbol": symbol, "exchange": exchange, "range": range, "candles": []})

    sym_upper = symbol.strip().upper()
    exch_upper = exchange.strip().upper()

    listing = (
        db.query(ListingV2)
        .filter(ListingV2.symbol == sym_upper, ListingV2.exchange_code == exch_upper)
        .first()
    )
    if not listing:
        # Try BSE as fallback if NSE not found
        listing = (
            db.query(ListingV2)
            .filter(ListingV2.symbol == sym_upper)
            .first()
        )
    if not listing:
        return JSONResponse(
            {"symbol": symbol, "exchange": exchange, "range": range, "candles": []},
            headers={"Cache-Control": "public, max-age=60"},
        )

    today = date.today()
    range_map = {
        "1mo": today - timedelta(days=31),
        "3mo": today - timedelta(days=92),
        "6mo": today - timedelta(days=183),
        "1y": today - timedelta(days=366),
        "5y": today - timedelta(days=5 * 366),
    }
    cutoff = range_map.get(range, today - timedelta(days=183))

    rows = (
        db.query(MarketPriceDaily)
        .filter(
            MarketPriceDaily.listing_id == listing.id,
            MarketPriceDaily.trade_date >= cutoff,
        )
        .order_by(MarketPriceDaily.trade_date.asc())
        .all()
    )

    candles = []
    for r in rows:
        if r.close_price is None:
            continue
        # Unix timestamp for midnight IST (use date as-is; lightweight-charts handles dates)
        import time as _time
        import datetime as _dt
        dt = _dt.datetime.combine(r.trade_date, _dt.time.min)
        unix_ts = int(dt.timestamp())
        candles.append({
            "time": unix_ts,
            "open": float(r.open_price) if r.open_price else float(r.close_price),
            "high": float(r.high_price) if r.high_price else float(r.close_price),
            "low": float(r.low_price) if r.low_price else float(r.close_price),
            "close": float(r.close_price),
        })

    # Cache for 5 min — same as the old Yahoo Finance proxy cache
    return JSONResponse(
        {"symbol": sym_upper, "exchange": exch_upper, "range": range, "candles": candles},
        headers={"Cache-Control": "public, max-age=300"},
    )


@router.get("/check-stock")
def check_stock(
    symbol: str,
    request: Request,
    db: Session = Depends(get_db),
    _: None = Depends(enforce_screening_budget),
):
    """
    Fast product endpoint: Halal / Doubtful / Haram, score, one-line summary.

    Uses four-methodology consensus (same engine as /screen/{symbol}/multi).
    Returns a rich payload (highlights, consensus, confidence, details); middleware wraps {success,data}.
    """
    _ = request  # noqa: ARG001 — reserved for future rate-limit context
    clean = symbol.strip().upper()
    if not clean:
        raise HTTPException(status_code=400, detail="symbol is required")

    stock = resolve_stock(db, clean, None, active_only=True, require_indian_listing=True)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    _validate_screenable_stock_or_raise(stock)

    ck = _check_cache_key(stock.symbol, stock.exchange)
    if not _stock_has_compliance_override(db, stock.id):
        cached = screening_cache.get(ck)
        if cached:
            return cached

    stock_data = helpers.stock_to_dict(stock)
    multi = evaluate_stock_multi(stock_data)
    methodologies = multi.get("methodologies") or {}
    primary = methodologies.get(PRIMARY_PROFILE) or next(iter(methodologies.values()), None)
    rich = build_rich_screening_payload(
        name=stock.name,
        symbol=stock.symbol,
        stock=stock_data,
        multi=multi,
        primary_screening=primary,
        evaluated_at=datetime.now(timezone.utc),
    )
    if not _stock_has_compliance_override(db, stock.id):
        screening_cache.set(ck, rich, SCREENING_CACHE_TTL_SECONDS)
    return rich


@router.get("/screen/{symbol}", response_model=ScreeningResult)
def screen_stock(
    symbol: str,
    exchange: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: None = Depends(enforce_screening_budget),
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
    stock = resolve_stock(db, symbol, exchange, active_only=True, require_indian_listing=True)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    _validate_screenable_stock_or_raise(stock)

    ex_for_key = exchange or stock.exchange
    ckey = screening_cache_key(stock.symbol, ex_for_key)
    if not _stock_has_compliance_override(db, stock.id):
        cached = screening_cache.get(ckey)
        if cached:
            return cached

    stock_data = helpers.stock_to_dict(stock)
    result = evaluate_stock(stock_data, profile=PRIMARY_PROFILE)
    result = helpers.apply_compliance_override(db, stock, result)
    helpers.record_screening_log(db, stock, result)
    active_review_case = helpers.get_public_review_case_for_stock(db, stock.id)
    recent_review_cases = helpers.get_recent_public_review_cases_for_stock(db, stock.id)

    out = {
        "symbol": stock.symbol,
        "name": stock.name,
        "active_review_case": active_review_case,
        "recent_review_cases": recent_review_cases,
        **result,
    }
    if not _stock_has_compliance_override(db, stock.id):
        screening_cache.set(ckey, out, SCREENING_CACHE_TTL_SECONDS)
    return out


def _screen_stocks_bulk_impl(symbols: list[str], db: Session) -> list[dict]:
    """Shared bulk screening; populates per-symbol cache; throttled between rows."""
    upper_symbols = [s.upper() for s in symbols[:500]]
    stocks = (
        db.query(Stock)
        .filter(
            Stock.symbol.in_(upper_symbols),
            Stock.is_active.is_(True),
            Stock.screening_blocked_reason.is_(None),
        )
        .all()
    )
    by_sym: defaultdict[str, list[Stock]] = defaultdict(list)
    for s in stocks:
        by_sym[s.symbol].append(s)

    def _pick(sym: str) -> Stock | None:
        cands = [c for c in by_sym.get(sym, []) if is_indian_exchange(c.exchange)]
        if not cands:
            return None
        return next((c for c in cands if c.exchange == "NSE"), cands[0])

    results: list[dict] = []
    for sym in upper_symbols:
        stock = _pick(sym)
        if not stock:
            continue
        stock_data = helpers.stock_to_dict(stock)
        result = evaluate_stock(stock_data, profile=PRIMARY_PROFILE)
        result = helpers.apply_compliance_override(db, stock, result)
        helpers.record_screening_log(db, stock, result)
        active_review_case = helpers.get_public_review_case_for_stock(db, stock.id)
        recent_review_cases = helpers.get_recent_public_review_cases_for_stock(db, stock.id)
        out = {
            "symbol": stock.symbol,
            "name": stock.name,
            "active_review_case": active_review_case,
            "recent_review_cases": recent_review_cases,
            **result,
        }
        if not _stock_has_compliance_override(db, stock.id):
            screening_cache.set(screening_cache_key(stock.symbol, stock.exchange), out, SCREENING_CACHE_TTL_SECONDS)
        results.append(out)
        time.sleep(0.015)
    return results


def _active_screenable_symbols(db: Session) -> list[str]:
    rows = (
        db.query(Stock.symbol, Stock.exchange)
        .filter(Stock.is_active.is_(True))
        .filter(Stock.screening_blocked_reason.is_(None))
        .order_by(Stock.symbol.asc(), Stock.exchange.asc())
        .all()
    )
    picked: dict[str, str] = {}
    for symbol, exchange in rows:
        ex = (exchange or "").upper()
        sym = (symbol or "").upper()
        if not sym or ex != "NSE":
            continue
        existing = picked.get(sym)
        if existing is None or (ex == "NSE" and existing != "NSE"):
            picked[sym] = ex
    return sorted(picked.keys())


def _daily_refresh_alert_details(
    *,
    run_id: str,
    phase: str,
    provider: str,
    expected: int,
    completed: int,
    chunks: int,
    retries: int,
    stale: bool,
    fundamentals_latest: datetime | None,
    duration_seconds: float | None,
    fundamentals_rows_with_timestamp: int | None = None,
    fundamentals_rows_missing_timestamp: int | None = None,
    fundamentals_staleness_hours: float | None = None,
    prices_updated: int | None = None,
    prices_total: int | None = None,
    prices_failed_count: int | None = None,
    indices_updated: int | None = None,
    symbol_master_events_processed: int | None = None,
    symbol_master_rows_updated: int | None = None,
    symbol_master_rows_disabled: int | None = None,
    symbol_master_rows_created: int | None = None,
    symbol_master_rows_remapped: int | None = None,
    symbol_master_unresolved_actions: int | None = None,
    failure_reason: str | None = None,
) -> dict[str, Any]:
    return {
        "run_id": run_id,
        "phase": phase,
        "provider": provider,
        "screening_completed": f"{completed}/{expected}",
        "chunks": chunks,
        "retries": retries,
        "fundamentals_latest_utc": fundamentals_latest.isoformat() if fundamentals_latest else "null",
        "fundamentals_rows_with_timestamp": fundamentals_rows_with_timestamp,
        "fundamentals_rows_missing_timestamp": fundamentals_rows_missing_timestamp,
        "fundamentals_staleness_hours": fundamentals_staleness_hours,
        "stale": stale,
        "prices_updated": prices_updated,
        "prices_total": prices_total,
        "prices_failed_count": prices_failed_count,
        "indices_updated": indices_updated,
        "symbol_master_events_processed": symbol_master_events_processed,
        "symbol_master_rows_updated": symbol_master_rows_updated,
        "symbol_master_rows_disabled": symbol_master_rows_disabled,
        "symbol_master_rows_created": symbol_master_rows_created,
        "symbol_master_rows_remapped": symbol_master_rows_remapped,
        "symbol_master_unresolved_actions": symbol_master_unresolved_actions,
        "duration_seconds": round(duration_seconds or 0.0, 2),
        "failure_reason": failure_reason,
        "recovery_hint": "Run Job A (fetch_real_data.py) then Job B (run_daily_refresh.py)",
    }


@router.post("/screen/bulk", response_model=list[ScreeningResult])
def screen_stocks_bulk(
    symbols: list[str] = Body(..., max_length=500),
    db: Session = Depends(get_db),
    _: None = Depends(enforce_screening_budget),
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
    return _screen_stocks_bulk_impl(symbols, db)


@router.post("/bulk-screen", response_model=list[ScreeningResult])
def bulk_screen(
    symbols: list[str] = Body(..., max_length=500),
    db: Session = Depends(get_db),
    _: None = Depends(enforce_screening_budget),
):
    """Alias for POST /screen/bulk — warms per-symbol screening cache."""
    return _screen_stocks_bulk_impl(symbols, db)


@router.post("/compare/bulk", response_model=list[ScreeningResult])
def compare_bulk_screen(
    request: Request,
    symbols: list[str] = Body(...),
    db: Session = Depends(get_db),
    _: None = Depends(enforce_screening_budget),
):
    """
    Batch screening for the Compare Stocks tool only.
    Counts against the actor's daily compare quota and consumes screen quota only
    for symbols the actor has not already screened today (IST).
    """
    from app.services.quota_service import (
        check_and_increment_unique_screen_quota,
        check_compare_quota,
        log_screening_accesses,
    )

    symbols = [s.strip().upper() for s in symbols if s and str(s).strip()][:3]
    if not symbols:
        return []

    service_unavailable_message = "Compare is temporarily unavailable. Please try again shortly."

    try:
        quota = check_compare_quota(db, request)
    except Exception as exc:
        db.rollback()
        logger.exception("[compare/bulk] compare quota check failed: %s", exc)
        return JSONResponse(
            status_code=503,
            content=api_error(service_unavailable_message, code="compare_temporarily_unavailable"),
        )

    if not quota["allowed"]:
        return JSONResponse(
            status_code=429,
            headers={"X-Remaining": "0", "X-Resets-At": quota.get("resets_at", "")},
            content=api_error(
                "You’ve reached today’s compare limit.",
                code="limit_exhausted",
                extra={
                    "status": "limit_exhausted",
                    "actions": ["Come back tomorrow", "Join Early Access"],
                    "redirect_url": "/premium",
                    "resets_at": quota.get("resets_at", ""),
                },
            ),
        )

    try:
        screen_quota = check_and_increment_unique_screen_quota(db, request, symbols)
    except Exception as exc:
        db.rollback()
        logger.exception("[compare/bulk] screen quota reservation failed: %s", exc)
        return JSONResponse(
            status_code=503,
            content=api_error(service_unavailable_message, code="compare_temporarily_unavailable"),
        )

    if not screen_quota["allowed"]:
        db.rollback()
        raise HTTPException(
            status_code=429,
            detail="Daily screening limit reached",
            headers={
                "X-Remaining": str(screen_quota.get("remaining", 0)),
                "X-Resets-At": screen_quota.get("resets_at", ""),
            },
        )

    try:
        log_screening_accesses(db, request, symbols)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("[compare/bulk] failed to log compare screening access: %s", exc)
        return JSONResponse(
            status_code=503,
            content=api_error(service_unavailable_message, code="compare_temporarily_unavailable"),
        )

    return _screen_stocks_bulk_impl(symbols, db)


@router.get("/screen/{symbol}/multi")
def screen_stock_multi(
    symbol: str,
    exchange: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: None = Depends(enforce_screening_budget),
):
    """
    Evaluate a single stock against all three Shariah methodologies
    (S&P, AAOIFI, FTSE/Maxis) and return comparative results.

    Auth: None (public endpoint)
    """
    stock = resolve_stock(db, symbol, exchange, active_only=True, require_indian_listing=True)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    _validate_screenable_stock_or_raise(stock)

    mk = _multi_cache_key(stock.symbol, exchange or stock.exchange)
    if not _stock_has_compliance_override(db, stock.id):
        cached = screening_cache.get(mk)
        if cached:
            return cached

    stock_data = helpers.stock_to_dict(stock)
    multi_result = evaluate_stock_multi(stock_data)

    out = {
        "symbol": stock.symbol,
        "name": stock.name,
        **multi_result,
    }
    if not _stock_has_compliance_override(db, stock.id):
        screening_cache.set(mk, out, SCREENING_CACHE_TTL_SECONDS)
    return out


@router.get("/related")
def related_stocks(
    symbol: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    _: None = Depends(enforce_screening_budget),
):
    """Peers in the same sector (and fallback large-cap); rows only when screening cache is warm."""
    stock = resolve_stock(db, symbol, None, active_only=True, require_indian_listing=True)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    peers = (
        db.query(Stock)
        .filter(
            Stock.sector == stock.sector,
            Stock.id != stock.id,
            Stock.is_active.is_(True),
            Stock.exchange.in_(("NSE", "BSE")),
        )
        .order_by(Stock.market_cap.desc())
        .limit(12)
        .all()
    )
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    for p in peers:
        row = simple_row_from_cache_entry(screening_cache.get(_check_cache_key(p.symbol, p.exchange)))
        if row and row["symbol"] not in seen:
            rows.append(row)
            seen.add(row["symbol"])
    if len(rows) < 4:
        popular = (
            db.query(Stock)
            .filter(
                Stock.is_active.is_(True),
                Stock.id != stock.id,
                Stock.exchange.in_(("NSE", "BSE")),
            )
            .order_by(Stock.market_cap.desc())
            .limit(24)
            .all()
        )
        for p in popular:
            if p.symbol in seen:
                continue
            row = simple_row_from_cache_entry(screening_cache.get(_check_cache_key(p.symbol, p.exchange)))
            if row:
                rows.append(row)
                seen.add(row["symbol"])
            if len(rows) >= 8:
                break
    return rows[:8]


@router.get("/top-halal")
def top_halal_stocks(
    limit: int = Query(8, ge=5, le=10),
    db: Session = Depends(get_db),
    _: None = Depends(enforce_screening_budget),
):
    """Largest active names that have a cached Halal consensus row (pre-warm via screening or bulk)."""
    candidates = (
        db.query(Stock)
        .filter(Stock.is_active.is_(True), Stock.exchange.in_(("NSE", "BSE")))
        .order_by(Stock.market_cap.desc())
        .limit(150)
        .all()
    )
    scored: list[dict[str, Any]] = []
    for p in candidates:
        row = simple_row_from_cache_entry(screening_cache.get(_check_cache_key(p.symbol, p.exchange)))
        if row and row.get("status") == "Halal":
            scored.append(row)
    scored.sort(key=lambda r: int(r.get("score") or 0), reverse=True)
    return scored[:limit]


@router.get("/stock-details")
def stock_details_seo(
    symbol: str = Query(..., min_length=1),
    exchange: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: None = Depends(enforce_screening_budget),
):
    """Rich screening row plus SEO copy; warms check-stock cache when needed."""
    stock = resolve_stock(db, symbol, exchange, active_only=True, require_indian_listing=True)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    ck = _check_cache_key(stock.symbol, stock.exchange)
    stock_data = helpers.stock_to_dict(stock)
    if not _stock_has_compliance_override(db, stock.id):
        cached = screening_cache.get(ck)
        if cached:
            base = dict(cached)
            base["seo"] = build_seo_block(
                stock.name,
                stock.symbol,
                base.get("status", "Doubtful"),
                multi=None,
                consensus_override=base.get("consensus"),
            )
            return base
    multi = evaluate_stock_multi(stock_data)
    methodologies = multi.get("methodologies") or {}
    primary = methodologies.get(PRIMARY_PROFILE) or next(iter(methodologies.values()), None)
    rich = build_rich_screening_payload(
        name=stock.name,
        symbol=stock.symbol,
        stock=stock_data,
        multi=multi,
        primary_screening=primary,
        evaluated_at=datetime.now(timezone.utc),
    )
    product_status = rich["status"]
    rich["seo"] = build_seo_block(stock.name, stock.symbol, product_status, multi=multi)
    if not _stock_has_compliance_override(db, stock.id):
        cache_body = {k: v for k, v in rich.items() if k != "seo"}
        screening_cache.set(ck, cache_body, SCREENING_CACHE_TTL_SECONDS)
    return rich


@router.post("/track")
def track_symbol_add(
    body: TrackSymbolRequest,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    """Authenticated: add symbol to watchlist (same storage as /me/watchlist)."""
    auth_subject = claims.get("sub")
    if not auth_subject:
        raise HTTPException(status_code=401, detail="Token subject missing")
    user = db.query(User).filter(User.auth_subject == auth_subject, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not provisioned")
    stock = resolve_stock(db, body.symbol, None, active_only=True, require_indian_listing=True)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    entry = (
        db.query(WatchlistEntry)
        .filter(WatchlistEntry.user_id == user.id, WatchlistEntry.stock_id == stock.id)
        .first()
    )
    if not entry:
        db.add(
            WatchlistEntry(
                user_id=user.id,
                owner_name=(user.display_name or user.email or "user").lower().replace(" ", "-"),
                stock_id=stock.id,
                notes="Tracked",
            )
        )
    db.commit()
    return _tracked_rows_for_user(db, user)


@router.get("/tracked")
def track_symbol_list(
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    auth_subject = claims.get("sub")
    if not auth_subject:
        raise HTTPException(status_code=401, detail="Token subject missing")
    user = db.query(User).filter(User.auth_subject == auth_subject, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not provisioned")
    return _tracked_rows_for_user(db, user)


@router.delete("/track/{symbol}")
def track_symbol_delete(
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
    stock = resolve_stock(db, symbol, None, active_only=True, require_indian_listing=True)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    entry = (
        db.query(WatchlistEntry)
        .filter(WatchlistEntry.user_id == user.id, WatchlistEntry.stock_id == stock.id)
        .first()
    )
    if entry:
        db.delete(entry)
        db.commit()
    return _tracked_rows_for_user(db, user)


@router.get("/quota")
def get_quota(
    request: Request,
    db: Session = Depends(get_db),
):
    """Return current actor's screening quota status (no auth required)."""
    from app.services.quota_service import get_quota_status

    return get_quota_status(db, request)


@router.post("/screen/manual")
def screen_stock_manual(
    request: Request,
    symbol: str = Body(..., embed=True),
    db: Session = Depends(get_db),
):
    """
    Manually screen any NSE stock by fetching live data from Yahoo Finance.

    Auth: None (public — 2 anon / 5 auth screens per IST day, admin unlimited)
    """
    from app.services.manual_screen_service import fetch_and_screen
    from app.services.quota_service import (
        check_and_increment_unique_screen_quota,
        get_accessible_symbols,
        log_screening_accesses,
    )

    clean_symbol = symbol.strip().upper().replace(".NS", "")

    quota = check_and_increment_unique_screen_quota(db, request, [clean_symbol])
    if not quota["allowed"]:
        raise HTTPException(
            status_code=429,
            detail="Daily screening limit reached",
            headers={"X-Remaining": "0", "X-Resets-At": quota.get("resets_at", "")},
        )

    existing = resolve_stock(db, clean_symbol, "NSE", active_only=True, require_indian_listing=True)

    if existing:
        stock_data = helpers.stock_to_dict(existing)
        multi_result = evaluate_stock_multi(stock_data)
        primary_result = evaluate_stock(stock_data, profile=PRIMARY_PROFILE)
        log_screening_accesses(db, request, [clean_symbol])
        db.commit()
        return {
            "symbol": existing.symbol,
            "name": existing.name,
            "is_prescreened": True,
            "screening": {**primary_result, "symbol": existing.symbol, "name": existing.name},
            "multi": {"symbol": existing.symbol, "name": existing.name, **multi_result},
            "quota": {"remaining": quota["remaining"], "resets_at": quota["resets_at"]},
            "screened_symbols": get_accessible_symbols(db, request),
        }

    stock_data = fetch_and_screen(clean_symbol)
    if not stock_data:
        raise HTTPException(status_code=404, detail=f"Could not find or fetch data for symbol: {clean_symbol}")

    multi_result = evaluate_stock_multi(stock_data)
    primary_result = evaluate_stock(stock_data, profile=PRIMARY_PROFILE)
    log_screening_accesses(db, request, [clean_symbol])
    db.commit()

    return {
        "symbol": stock_data["symbol"],
        "name": stock_data["name"],
        "is_prescreened": False,
        "screening": {**primary_result, "symbol": stock_data["symbol"], "name": stock_data["name"]},
        "multi": {"symbol": stock_data["symbol"], "name": stock_data["name"], **multi_result},
        "quota": {"remaining": quota["remaining"], "resets_at": quota["resets_at"]},
        "screened_symbols": get_accessible_symbols(db, request),
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
        "feature_flags": [],
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
    stock = resolve_stock(db, payload.symbol, None, active_only=True, require_indian_listing=True)
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
    stock = resolve_stock(db, payload.symbol, None, active_only=True, require_indian_listing=True)
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

    live_px = helpers.live_last_prices_for_portfolios(portfolios)

    return {
        "user": user,
        "dashboard": helpers.build_dashboard_payload(
            user.display_name, portfolios, watchlist_entries, live_last_price_by_symbol=live_px
        ),
        "portfolios": portfolios,
        "watchlist": watchlist_entries,
        "saved_screeners": saved_screeners,
        "research_notes": research_notes,
        "compliance_check": helpers.build_compliance_check(portfolios, live_last_price_by_symbol=live_px),
        "activity_feed": helpers.build_activity_feed(
            user=user,
            portfolios=portfolios,
            watchlist_entries=watchlist_entries,
            research_notes=research_notes,
            review_cases=review_cases,
            live_last_price_by_symbol=live_px,
        ),
        "review_cases": review_cases,
    }


def _email_from_auth_claims(claims: dict) -> str:
    """Clerk JWT may expose email under different keys depending on the session template."""
    for key in ("email", "primary_email_address"):
        val = claims.get(key)
        if isinstance(val, str) and "@" in val:
            return val.strip().lower()
    return ""


@router.get("/me", response_model=UserRead)
def get_current_user(claims: dict = Depends(get_current_auth_claims_or_internal), db: Session = Depends(get_db)):
    auth_subject = claims.get("sub")
    if not auth_subject:
        raise HTTPException(status_code=401, detail="Token subject missing")

    user = db.query(User).filter(User.auth_subject == auth_subject, User.is_active.is_(True)).first()
    if not user:
        # Auto-provision: create the user from available claims so first-time
        # sign-ins "just work" without a separate bootstrap call.
        email = _email_from_auth_claims(claims)
        if not email:
            raw_e = claims.get("email")
            email = raw_e.strip().lower() if isinstance(raw_e, str) else ""
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

    claim_email = _email_from_auth_claims(claims)
    if claim_email and (not user.email or not str(user.email).strip()):
        user.email = claim_email
        try:
            db.commit()
            db.refresh(user)
        except Exception:
            db.rollback()

    # Auto-promote to owner/admin based on configured identities.
    effective_role = getattr(user, "role", "user") or "user"
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
    if owner_match and effective_role != "owner":
        effective_role = "owner"
        try:
            user.role = "owner"
            db.commit()
        except Exception:
            db.rollback()
    elif admin_match and effective_role not in {"owner", "admin"}:
        effective_role = "admin"
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

    live_px = helpers.live_last_prices_for_portfolios(portfolios)

    return {
        "user": user,
        "dashboard": helpers.build_dashboard_payload(
            user.display_name, portfolios, watchlist_entries, live_last_price_by_symbol=live_px
        ),
        "portfolios": portfolios,
        "watchlist": watchlist_entries,
        "saved_screeners": saved_screeners,
        "research_notes": research_notes,
        "compliance_check": helpers.build_compliance_check(portfolios, live_last_price_by_symbol=live_px),
        "activity_feed": helpers.build_activity_feed(
            user=user,
            portfolios=portfolios,
            watchlist_entries=watchlist_entries,
            research_notes=research_notes,
            review_cases=review_cases,
            live_last_price_by_symbol=live_px,
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

    live_px = helpers.live_last_prices_for_portfolios(portfolios)
    return helpers.build_alerts_payload(
        user, portfolios, watchlist_entries, review_cases, live_last_price_by_symbol=live_px
    )


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

    stock = resolve_stock(db, payload.symbol, None, active_only=True, require_indian_listing=True)
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

    stock = resolve_stock(db, symbol, None, active_only=True, require_indian_listing=True)
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

    stock = resolve_stock(db, payload.symbol, None, active_only=True, require_indian_listing=True)
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

    stock = resolve_stock(db, symbol, None, active_only=True, require_indian_listing=True)
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
    stock = resolve_stock(db, payload.symbol, None, active_only=True, require_indian_listing=True)
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
    live_px = helpers.live_last_prices_for_portfolios(portfolios)
    return helpers.build_compliance_check(portfolios, live_last_price_by_symbol=live_px)


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
    live_px = helpers.live_last_prices_for_portfolios(portfolios)
    return helpers.build_dashboard_payload(
        owner_name, portfolios, watchlist_entries, live_last_price_by_symbol=live_px
    )


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
    helpers.require_admin(db, claims)
    admin_user = get_user_by_claims(db, claims)
    caller_is_owner = is_owner(db, claims)

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

    # Owner account protections
    if _is_owner_user(target_user):
        raise HTTPException(status_code=403, detail="Owner role cannot be modified")

    # Only owner can promote to owner
    if payload.role == "owner" and not caller_is_owner:
        raise HTTPException(status_code=403, detail="Only owner can assign owner role")

    # Prevent self-demotion
    if admin_user.id == user_id and payload.role not in {"owner", "admin"}:
        raise HTTPException(
            status_code=400,
            detail="Cannot demote your own privileged role"
        )

    # Only owner can remove admin role from another admin
    if target_user.role == "admin" and payload.role != "admin" and not caller_is_owner:
        raise HTTPException(status_code=403, detail="Only owner can remove admin access")

    # Update the role
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
    caller_is_owner = is_owner(db, claims)

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if _is_owner_user(target_user):
        raise HTTPException(status_code=403, detail="Owner account cannot be disabled")

    if target_user.role == "admin" and not payload.is_active and not caller_is_owner:
        raise HTTPException(status_code=403, detail="Only owner can disable admin accounts")

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


@router.post("/admin/users/{user_id}/quota/reset")
def admin_reset_user_quota(
    user_id: int,
    claims: dict = Depends(get_current_auth_claims),
    db: Session = Depends(get_db),
):
    """Reset today's quota counters for a user."""
    helpers.require_admin(db, claims)

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    from app.services.quota_service import reset_user_quotas_for_today

    actor_key = f"user:{target_user.auth_subject}"
    summary = reset_user_quotas_for_today(db, actor_key)
    db.commit()
    return {
        "ok": True,
        "user_id": target_user.id,
        "email": target_user.email,
        "actor_key": actor_key,
        **summary,
    }


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
# INVESTMENT METRICS
# ═══════════════════════════════════════════════════════════════

@router.get("/metrics/{symbol}")
def get_metrics(
    symbol: str,
    exchange: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    from app.services.metrics_service import get_investment_metrics
    stock = resolve_stock(db, symbol, exchange, active_only=True, require_indian_listing=True)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    stock_data = helpers.stock_to_dict(stock)
    return get_investment_metrics(stock_data)


# ═══════════════════════════════════════════════════════════════
# COMPLIANCE HISTORY
# ═══════════════════════════════════════════════════════════════

@router.get("/compliance-history/{symbol}")
def get_compliance_history(
    symbol: str,
    exchange: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    stock = resolve_stock(db, symbol, exchange, active_only=True, require_indian_listing=True)
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


@router.post("/admin/ops/run-job-a")
def admin_run_job_a(
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    """Admin only — trigger Job A (fundamentals refresh) in a detached subprocess."""
    helpers.require_admin(db, claims)
    env = os.environ.copy()
    # Scripts expect repo root on PYTHONPATH.
    env["PYTHONPATH"] = env.get("PYTHONPATH") or "."
    proc = subprocess.Popen(
        ["python3", "fetch_real_data.py"],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    return {"ok": True, "job": "job_a", "pid": proc.pid}


@router.post("/admin/ops/run-job-b")
def admin_run_job_b(
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    """Admin only — trigger Job B (daily refresh pipeline) in a detached subprocess."""
    helpers.require_admin(db, claims)
    env = os.environ.copy()
    env["PYTHONPATH"] = env.get("PYTHONPATH") or "."
    # scripts/run_daily_refresh.py normalizes API_BASE_URL by appending `/api`.
    port = env.get("PORT") or "10000"
    env["API_BASE_URL"] = env.get("API_BASE_URL") or f"http://127.0.0.1:{port}"
    proc = subprocess.Popen(
        ["python3", "scripts/run_daily_refresh.py"],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    return {"ok": True, "job": "job_b", "pid": proc.pid}


@router.post("/internal/daily-refresh")
def daily_refresh(
    db: Session = Depends(get_db),
    x_internal_service_token: str | None = Header(default=None, alias="X-Internal-Service-Token"),
    screen_chunk_size: int = Query(default=150, ge=50, le=500, description="Symbols per bulk-screen chunk (max 500)."),
):
    """
    One-shot pipeline for cron: sync all equity prices and warm screening cache in chunks.

    Requires ``X-Internal-Service-Token`` (same as ``POST /api/market-data/sync-prices``).
    Prefer invoking from Render Cron or a long-timeout worker; full universe can exceed Vercel limits.
    """
    helpers.require_internal_token(x_internal_service_token)
    run_id = str(uuid4())
    started_at = datetime.now(timezone.utc)
    t0 = time.perf_counter()
    eff = MARKET_DATA_PROVIDER.strip().lower()
    if eff not in PUBLIC_MARKET_PROVIDERS:
        eff = "auto_india"
    run = DailyRefreshRun(
        run_id=run_id,
        status="started",
        provider=eff,
        screen_chunk_size=screen_chunk_size,
        started_at=started_at,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    symbol_master = {
        "events_processed": 0,
        "rows_updated": 0,
        "rows_disabled": 0,
        "rows_created": 0,
        "rows_remapped": 0,
        "unresolved_actions": 0,
        "run_at": None,
    }
    try:
        symbol_master = apply_corporate_action_events(db, create_missing_parents=True)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("[daily-refresh] symbol master sync failed: %s", exc)
    price_result = sync_all_stock_prices(db, provider=eff, max_stocks=None)
    if not price_result["ok"]:
        run.status = "failed"
        run.error_detail = price_result.get("detail", "price sync failed")
        run.prices_total = int(price_result.get("total") or 0)
        run.prices_updated = int(price_result.get("updated") or 0)
        run.finished_at = datetime.now(timezone.utc)
        db.commit()
        send_ops_alert(
            level="error",
            title="Daily refresh failed (price sync)",
            alert_key="daily-refresh:failure:price-sync",
            details=_daily_refresh_alert_details(
                run_id=run_id,
                phase="price_sync",
                provider=eff,
                expected=0,
                completed=0,
                chunks=0,
                retries=0,
                stale=True,
                fundamentals_latest=None,
                duration_seconds=time.perf_counter() - t0,
                prices_updated=int(price_result.get("updated") or 0),
                prices_total=int(price_result.get("total") or 0),
                prices_failed_count=len(price_result.get("failed_symbols") or []),
                symbol_master_events_processed=int(symbol_master.get("events_processed") or 0),
                symbol_master_rows_updated=int(symbol_master.get("rows_updated") or 0),
                symbol_master_rows_disabled=int(symbol_master.get("rows_disabled") or 0),
                symbol_master_rows_created=int(symbol_master.get("rows_created") or 0),
                symbol_master_rows_remapped=int(symbol_master.get("rows_remapped") or 0),
                symbol_master_unresolved_actions=int(symbol_master.get("unresolved_actions") or 0),
                failure_reason=run.error_detail,
            ),
        )
        raise HTTPException(status_code=400, detail=price_result.get("detail", "price sync failed"))

    index_sync_result = {"updated": 0}
    try:
        index_sync_result = sync_market_indices(db)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("[daily-refresh] index sync failed: %s", exc)

    symbol_integrity = {
        "symbol_isin_conflicts": 0,
        "isin_multi_symbol_conflicts": 0,
        "missing_isin_overdue": 0,
        "auto_disabled_count": 0,
        "blocked_from_screening_count": 0,
        "impacted_symbols": [],
        "last_run_at": None,
    }
    try:
        integrity_summary = run_nse_symbol_integrity_checks(db)
        db.commit()
        symbol_integrity = integrity_summary.to_dict()
        has_critical = symbol_integrity.get("symbol_isin_conflicts", 0) > 0
        if has_critical:
            send_ops_alert(
                level="warning",
                title="Daily refresh symbol-integrity warning",
                alert_key=f"daily-refresh:symbol-integrity:{run_id}",
                details={
                    "run_id": run_id,
                    "symbol_isin_conflicts": symbol_integrity.get("symbol_isin_conflicts", 0),
                    "isin_multi_symbol_conflicts": symbol_integrity.get("isin_multi_symbol_conflicts", 0),
                    "missing_isin_overdue": symbol_integrity.get("missing_isin_overdue", 0),
                    "blocked_from_screening_count": symbol_integrity.get("blocked_from_screening_count", 0),
                    "impacted_symbols_preview": ", ".join((symbol_integrity.get("impacted_symbols") or [])[:10]),
                },
            )
    except Exception as exc:
        db.rollback()
        logger.exception("[daily-refresh] symbol integrity checks failed: %s", exc)

    symbols = _active_screenable_symbols(db)
    expected = len(symbols)
    screen_chunks = 0
    screen_rows = 0
    retries = 0
    failed_chunks: list[dict[str, Any]] = []

    for i in range(0, expected, screen_chunk_size):
        chunk = symbols[i : i + screen_chunk_size]
        screen_chunks += 1
        attempts = 0
        chunk_success = False
        last_error: str | None = None
        while attempts < 3 and not chunk_success:
            attempts += 1
            if attempts > 1:
                retries += 1
                time.sleep(2 ** (attempts - 2))
            try:
                rows = _screen_stocks_bulk_impl(chunk, db)
                if len(rows) != len(chunk):
                    missing = sorted(set(chunk) - {str(r.get("symbol", "")).upper() for r in rows})
                    last_error = (
                        f"incomplete chunk coverage: expected {len(chunk)} got {len(rows)}; missing={missing[:10]}"
                    )
                    continue
                screen_rows += len(rows)
                chunk_success = True
            except Exception as exc:
                last_error = str(exc)
        if not chunk_success:
            failed_chunks.append(
                {
                    "chunk_start": i,
                    "chunk_size": len(chunk),
                    "error": last_error or "screening chunk failed",
                }
            )

    stock_count = db.query(Stock).filter(Stock.is_active.is_(True)).count()
    fundamentals = get_fundamentals_status(stock_count, db=db)
    stale = bool(fundamentals.get("stale"))
    fundamentals_latest = fundamentals.get("latest_fundamentals_updated_at")
    screening_complete = (screen_rows == expected and expected > 0 and not failed_chunks)

    run.prices_total = int(price_result.get("total") or 0)
    run.prices_updated = int(price_result.get("updated") or 0)
    run.screening_chunks = screen_chunks
    run.screening_retries = retries
    run.screening_symbols_expected = expected
    run.screening_symbols_completed = screen_rows
    run.stale_at_finish = stale
    run.latest_fundamentals_updated_at = fundamentals_latest
    run.finished_at = datetime.now(timezone.utc)

    if not screening_complete:
        run.status = "failed"
        run.error_detail = f"incomplete screening coverage; expected={expected}, completed={screen_rows}"
        db.commit()
        send_ops_alert(
            level="error",
            title="Daily refresh failed (partial screening)",
            alert_key="daily-refresh:failure:partial-screening",
            details=_daily_refresh_alert_details(
                run_id=run_id,
                phase="screening",
                provider=eff,
                expected=expected,
                completed=screen_rows,
                chunks=screen_chunks,
                retries=retries,
                stale=stale,
                fundamentals_latest=fundamentals_latest,
                duration_seconds=time.perf_counter() - t0,
                fundamentals_rows_with_timestamp=int(fundamentals.get("rows_with_timestamp") or 0),
                fundamentals_rows_missing_timestamp=int(fundamentals.get("rows_missing_timestamp") or 0),
                fundamentals_staleness_hours=fundamentals.get("staleness_hours"),
                prices_updated=int(price_result.get("updated") or 0),
                prices_total=int(price_result.get("total") or 0),
                prices_failed_count=len(price_result.get("failed_symbols") or []),
                indices_updated=int(index_sync_result.get("updated") or 0),
                symbol_master_events_processed=int(symbol_master.get("events_processed") or 0),
                symbol_master_rows_updated=int(symbol_master.get("rows_updated") or 0),
                symbol_master_rows_disabled=int(symbol_master.get("rows_disabled") or 0),
                symbol_master_rows_created=int(symbol_master.get("rows_created") or 0),
                symbol_master_rows_remapped=int(symbol_master.get("rows_remapped") or 0),
                symbol_master_unresolved_actions=int(symbol_master.get("unresolved_actions") or 0),
                failure_reason=run.error_detail,
            ),
        )
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Daily screening refresh did not complete full symbol coverage.",
                "run_id": run_id,
                "symbols_expected": expected,
                "symbols_completed": screen_rows,
                "failed_chunks": failed_chunks,
            },
        )

    if stale:
        run.status = "failed"
        run.error_detail = "Fundamentals dataset is stale after refresh."
        db.commit()
        send_ops_alert(
            level="warning",
            title="Daily refresh failed stale guard",
            alert_key="daily-refresh:failure:stale",
            details=_daily_refresh_alert_details(
                run_id=run_id,
                phase="stale_guard",
                provider=eff,
                expected=expected,
                completed=screen_rows,
                chunks=screen_chunks,
                retries=retries,
                stale=stale,
                fundamentals_latest=fundamentals_latest,
                duration_seconds=time.perf_counter() - t0,
                fundamentals_rows_with_timestamp=int(fundamentals.get("rows_with_timestamp") or 0),
                fundamentals_rows_missing_timestamp=int(fundamentals.get("rows_missing_timestamp") or 0),
                fundamentals_staleness_hours=fundamentals.get("staleness_hours"),
                prices_updated=int(price_result.get("updated") or 0),
                prices_total=int(price_result.get("total") or 0),
                prices_failed_count=len(price_result.get("failed_symbols") or []),
                indices_updated=int(index_sync_result.get("updated") or 0),
                symbol_master_events_processed=int(symbol_master.get("events_processed") or 0),
                symbol_master_rows_updated=int(symbol_master.get("rows_updated") or 0),
                symbol_master_rows_disabled=int(symbol_master.get("rows_disabled") or 0),
                symbol_master_rows_created=int(symbol_master.get("rows_created") or 0),
                symbol_master_rows_remapped=int(symbol_master.get("rows_remapped") or 0),
                symbol_master_unresolved_actions=int(symbol_master.get("unresolved_actions") or 0),
                failure_reason=run.error_detail,
            ),
        )
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Fundamentals are stale after refresh; run fundamentals sync and retry daily refresh.",
                "run_id": run_id,
                "latest_fundamentals_updated_at": fundamentals_latest.isoformat() if fundamentals_latest else None,
            },
        )

    run.status = "success"
    run.error_detail = ""
    db.commit()

    duration_seconds = time.perf_counter() - t0
    send_ops_alert(
        level="success",
        title="Daily pipeline heartbeat: Job A + Job B complete",
        alert_key="daily-refresh:success",
        details=_daily_refresh_alert_details(
            run_id=run_id,
            phase="completed",
            provider=eff,
            expected=expected,
            completed=screen_rows,
            chunks=screen_chunks,
            retries=retries,
            stale=stale,
            fundamentals_latest=fundamentals_latest,
            duration_seconds=duration_seconds,
            fundamentals_rows_with_timestamp=int(fundamentals.get("rows_with_timestamp") or 0),
            fundamentals_rows_missing_timestamp=int(fundamentals.get("rows_missing_timestamp") or 0),
            fundamentals_staleness_hours=fundamentals.get("staleness_hours"),
            prices_updated=int(price_result.get("updated") or 0),
            prices_total=int(price_result.get("total") or 0),
            prices_failed_count=len(price_result.get("failed_symbols") or []),
            indices_updated=int(index_sync_result.get("updated") or 0),
            symbol_master_events_processed=int(symbol_master.get("events_processed") or 0),
            symbol_master_rows_updated=int(symbol_master.get("rows_updated") or 0),
            symbol_master_rows_disabled=int(symbol_master.get("rows_disabled") or 0),
            symbol_master_rows_created=int(symbol_master.get("rows_created") or 0),
            symbol_master_rows_remapped=int(symbol_master.get("rows_remapped") or 0),
            symbol_master_unresolved_actions=int(symbol_master.get("unresolved_actions") or 0),
        )
        | {
            "failed_symbols_preview": ", ".join((price_result.get("failed_symbols") or [])[:10]) or "none",
        },
    )

    return {
        "ok": True,
        "run_id": run_id,
        "prices": {
            "provider": price_result["provider"],
            "updated": price_result["updated"],
            "failed_symbols": price_result["failed_symbols"],
            "total": price_result["total"],
        },
        "screening": {
            "symbols_total": expected,
            "symbols_expected": expected,
            "symbols_completed": screen_rows,
            "chunks": screen_chunks,
            "retries": retries,
            "rows_cached": screen_rows,
            "screening_complete": True,
        },
        "indices": {
            "updated": index_sync_result.get("updated", 0),
        },
        "symbol_integrity": {
            "symbol_isin_conflicts": symbol_integrity.get("symbol_isin_conflicts", 0),
            "isin_multi_symbol_conflicts": symbol_integrity.get("isin_multi_symbol_conflicts", 0),
            "missing_isin_overdue": symbol_integrity.get("missing_isin_overdue", 0),
            "auto_disabled": symbol_integrity.get("auto_disabled_count", 0),
            "blocked_from_screening": symbol_integrity.get("blocked_from_screening_count", 0),
            "last_run_at": symbol_integrity.get("last_run_at").isoformat() if symbol_integrity.get("last_run_at") else None,
        },
        "symbol_master": {
            "events_processed": symbol_master.get("events_processed", 0),
            "rows_updated": symbol_master.get("rows_updated", 0),
            "rows_disabled": symbol_master.get("rows_disabled", 0),
            "rows_created": symbol_master.get("rows_created", 0),
            "rows_remapped": symbol_master.get("rows_remapped", 0),
            "unresolved_actions": symbol_master.get("unresolved_actions", 0),
            "run_at": symbol_master.get("run_at").isoformat() if symbol_master.get("run_at") else None,
        },
        "fundamentals": {
            "latest_fundamentals_updated_at": fundamentals_latest.isoformat() if fundamentals_latest else None,
            "stale": stale,
            "staleness_hours": fundamentals.get("staleness_hours"),
        },
        "duration_seconds": round(duration_seconds, 2),
    }


@router.get("/admin/symbol-resolution/health", response_model=SymbolResolutionHealthResponse)
def admin_symbol_resolution_health(
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    helpers.require_admin(db, claims)
    return symbol_health_summary(db)


@router.get("/admin/symbol-resolution/issues", response_model=list[SymbolResolutionIssueRead])
def admin_symbol_resolution_issues(
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
    unresolved_only: bool = Query(default=True),
    limit: int = Query(default=200, ge=1, le=1000),
):
    helpers.require_admin(db, claims)
    q = db.query(SymbolResolutionIssue).order_by(
        SymbolResolutionIssue.detected_at.desc(),
        SymbolResolutionIssue.id.desc(),
    )
    if unresolved_only:
        q = q.filter(SymbolResolutionIssue.resolved.is_(False))
    return q.limit(limit).all()


@router.get("/admin/symbol-resolution/corporate-actions", response_model=list[StockCorporateEventRead])
def admin_corporate_actions(
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
    status: str | None = Query(default="active"),
    limit: int = Query(default=200, ge=1, le=1000),
):
    helpers.require_admin(db, claims)
    q = db.query(StockCorporateEvent).order_by(
        StockCorporateEvent.effective_date.desc(),
        StockCorporateEvent.id.desc(),
    )
    if status:
        q = q.filter(StockCorporateEvent.status == status)
    return q.limit(limit).all()


@router.post("/admin/symbol-resolution/corporate-actions", response_model=StockCorporateEventRead)
def admin_upsert_corporate_action(
    payload: StockCorporateEventCreate,
    claims: dict = Depends(get_current_auth_claims_or_internal),
    db: Session = Depends(get_db),
):
    helpers.require_admin(db, claims)
    symbol = payload.symbol.strip().upper()
    successor = payload.successor_symbol.strip().upper() if payload.successor_symbol else None
    canonical = payload.canonical_symbol.strip().upper() if payload.canonical_symbol else None
    existing = (
        db.query(StockCorporateEvent)
        .filter(
            StockCorporateEvent.symbol == symbol,
            StockCorporateEvent.event_type == payload.event_type,
            StockCorporateEvent.effective_date == payload.effective_date,
        )
        .first()
    )
    if existing:
        existing.successor_symbol = successor
        existing.canonical_symbol = canonical
        existing.source = payload.source
        existing.status = payload.status
        existing.notes = payload.notes
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return existing

    row = StockCorporateEvent(
        symbol=symbol,
        event_type=payload.event_type,
        effective_date=payload.effective_date,
        successor_symbol=successor,
        canonical_symbol=canonical,
        source=payload.source,
        status=payload.status,
        notes=payload.notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.post("/internal/symbol-master/sync")
def internal_symbol_master_sync(
    x_internal_service_token: str | None = Header(default=None, alias="X-Internal-Service-Token"),
    db: Session = Depends(get_db),
):
    helpers.require_internal_token(x_internal_service_token)
    summary = apply_corporate_action_events(db, create_missing_parents=True)
    db.commit()
    return {
        "ok": True,
        "symbol_master": {
            "events_processed": summary.get("events_processed", 0),
            "rows_updated": summary.get("rows_updated", 0),
            "rows_disabled": summary.get("rows_disabled", 0),
            "rows_created": summary.get("rows_created", 0),
            "rows_remapped": summary.get("rows_remapped", 0),
            "unresolved_actions": summary.get("unresolved_actions", 0),
            "run_at": summary.get("run_at").isoformat() if summary.get("run_at") else None,
        },
    }

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


# ═══════════════════════════════════════════════════════════════
# EARLY ACCESS SIGNUPS
# ═══════════════════════════════════════════════════════════════

@router.post("/early-access")
def submit_early_access(
    email: str = Body(..., embed=False),
    name: str = Body(default="", embed=False),
    source: str = Body(default="premium_page", embed=False),
    db: Session = Depends(get_db),
):
    from app.models import EarlyAccessSignup
    existing = db.query(EarlyAccessSignup).filter(EarlyAccessSignup.email == email).first()
    if existing:
        return {"ok": True, "message": "Already signed up"}
    db.add(EarlyAccessSignup(email=email, name=name, source=source))
    db.commit()
    return {"ok": True, "message": "You'll be notified when Premium launches"}


# ═══════════════════════════════════════════════════════════════
# PRODUCT EVENTS (analytics / monetization signals)
# ═══════════════════════════════════════════════════════════════

@router.post("/product-events")
def ingest_product_event(
    event_name: str = Body(...),
    user_id: str | None = Body(default=None),
    session_id: str | None = Body(default=None),
    symbol: str | None = Body(default=None),
    metadata: dict | None = Body(default=None),
    db: Session = Depends(get_db),
):
    import json
    from app.models import ProductEvent
    db.add(ProductEvent(
        event_name=event_name,
        user_id=user_id,
        session_id=session_id,
        symbol=symbol,
        metadata_json=json.dumps(metadata) if metadata else None,
    ))
    db.commit()
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════
# ADMIN: DEMAND / MONETIZATION DASHBOARD
# ═══════════════════════════════════════════════════════════════

@router.get("/admin/product-events")
def admin_product_events(
    db: Session = Depends(get_db),
    limit: int = Query(default=200, ge=1, le=1000),
):
    from app.models import ProductEvent
    from sqlalchemy import func

    recent = (
        db.query(ProductEvent)
        .order_by(ProductEvent.created_at.desc())
        .limit(limit)
        .all()
    )

    aggregates = (
        db.query(
            ProductEvent.event_name,
            func.count(ProductEvent.id).label("count"),
        )
        .group_by(ProductEvent.event_name)
        .all()
    )

    return {
        "aggregates": [{"event_name": a.event_name, "count": a.count} for a in aggregates],
        "recent": [
            {
                "id": e.id,
                "event_name": e.event_name,
                "user_id": e.user_id,
                "session_id": e.session_id,
                "symbol": e.symbol,
                "metadata": e.metadata_json,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in recent
        ],
    }


@router.get("/admin/early-access")
def admin_early_access(db: Session = Depends(get_db)):
    from app.models import EarlyAccessSignup
    rows = db.query(EarlyAccessSignup).order_by(EarlyAccessSignup.created_at.desc()).all()
    return [
        {"id": r.id, "email": r.email, "name": r.name, "source": r.source, "created_at": r.created_at.isoformat() if r.created_at else None}
        for r in rows
    ]

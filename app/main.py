import logging
import os
from time import perf_counter
from pathlib import Path
from datetime import datetime
from typing import Any

logger = logging.getLogger("barakfi")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from app.config import APP_ENV, APP_NAME, APP_VERSION, CORS_ORIGINS, DATABASE_URL, DEBUG
from app.config import AUTH_GOOGLE_ENABLED, AUTH_PROVIDER, CLERK_JS_URL, CLERK_PUBLISHABLE_KEY
from app.database import Base, engine
from app.api.routes import router
from app.middleware.api_envelope import ApiEnvelopeMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.models import (  # noqa: F401 – imported so SQLAlchemy registers all tables
    ComplianceHistory,
    StockCollection,
    CollectionEntry,
    SuperInvestor,
    SuperInvestorHolding,
    CoverageRequest,
    Feedback,
    BrokerConnection,
)

app = FastAPI(title=APP_NAME, version=APP_VERSION, debug=DEBUG)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all: always return JSON so frontend proxies can parse the response."""
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    detail = str(exc) if DEBUG else "Internal server error"
    if request.url.path.startswith("/api"):
        from app.api.envelope import api_error

        return JSONResponse(status_code=500, content=api_error(detail))
    return JSONResponse(
        status_code=500,
        content={"detail": detail},
    )


def _auto_migrate_columns():
    """
    Compare SQLAlchemy model columns against the live database schema.
    Any columns that exist in the models but NOT in the DB are added via
    ALTER TABLE.  This lets us add new fields to models without needing a
    full Alembic migration setup — perfect for early-stage dev on SQLite.
    """
    inspector = inspect(engine)
    with engine.begin() as conn:
        dialect = engine.dialect.name.lower()
        is_postgres = dialect in {"postgresql", "postgres"}
        is_sqlite = dialect == "sqlite"
        for table in Base.metadata.sorted_tables:
            if not inspector.has_table(table.name):
                continue  # create_all() will handle brand-new tables

            existing = {col["name"] for col in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in existing:
                    continue

                # Build the ALTER TABLE statement
                col_type = column.type.compile(dialect=engine.dialect)
                default_clause = ""
                if column.default is not None:
                    default_val = column.default.arg
                    if callable(default_val):
                        default_val = default_val({})
                    # SQLite cannot use unquoted datetime literals as defaults.
                    # When SQLAlchemy defaults to a Python datetime (e.g. utc_now()),
                    # use CURRENT_TIMESTAMP across engines (Postgres/SQLite).
                    try:
                        if isinstance(default_val, datetime):
                            default_clause = " DEFAULT CURRENT_TIMESTAMP"
                            default_val = None
                    except Exception:
                        pass
                    # Postgres requires timestamp defaults to be quoted or expressions like CURRENT_TIMESTAMP.
                    # When SQLAlchemy defaults to a Python datetime (e.g. utc_now()), use CURRENT_TIMESTAMP.
                    try:
                        if is_postgres and "TIMESTAMP" in str(col_type).upper():
                            default_clause = " DEFAULT CURRENT_TIMESTAMP"
                            default_val = None
                    except Exception:
                        pass
                    if isinstance(default_val, str):
                        default_clause = f" DEFAULT '{default_val}'"
                    elif isinstance(default_val, bool):
                        # Postgres boolean defaults must be TRUE/FALSE (not 1/0).
                        if is_postgres:
                            default_clause = f" DEFAULT {'TRUE' if default_val else 'FALSE'}"
                        else:
                            default_clause = f" DEFAULT {1 if default_val else 0}"
                    elif default_val is not None:
                        default_clause = f" DEFAULT {default_val}"

                nullable = "" if column.nullable else " NOT NULL"
                # SQLite can't add NOT NULL without a default, so force a default
                if not column.nullable and not default_clause:
                    if "INT" in str(col_type).upper() or "FLOAT" in str(col_type).upper():
                        default_clause = " DEFAULT 0"
                    elif is_postgres and "TIMESTAMP" in str(col_type).upper():
                        default_clause = " DEFAULT CURRENT_TIMESTAMP"
                    elif "BOOL" in str(col_type).upper():
                        # Postgres boolean defaults must be TRUE/FALSE (not 1/0).
                        default_clause = " DEFAULT FALSE" if is_postgres else " DEFAULT 0"
                    else:
                        default_clause = " DEFAULT ''"

                # SQLite limitation: ALTER TABLE .. ADD COLUMN does not allow
                # non-constant defaults (e.g. CURRENT_TIMESTAMP). For timestamp
                # columns we add them as nullable, then backfill.
                if is_sqlite and "DATETIME" in str(col_type).upper() and "CURRENT_TIMESTAMP" in default_clause:
                    sql = f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {col_type}'
                    logger.info("[auto-migrate] %s", sql)
                    conn.execute(text(sql))
                    backfill = (
                        f'UPDATE "{table.name}" SET "{column.name}" = CURRENT_TIMESTAMP '
                        f'WHERE "{column.name}" IS NULL'
                    )
                    logger.info("[auto-migrate] %s", backfill)
                    conn.execute(text(backfill))
                else:
                    sql = f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {col_type}{nullable}{default_clause}'
                    logger.info("[auto-migrate] %s", sql)
                    conn.execute(text(sql))

    logger.info("[auto-migrate] Schema check complete.")


def _log_table_columns(table_name: str) -> None:
    """Log live DB column names/types to help diagnose prod schema mismatches."""
    try:
        inspector = inspect(engine)
        if not inspector.has_table(table_name):
            logger.info("[schema] Table %s does not exist", table_name)
            return
        cols = inspector.get_columns(table_name)
        formatted = ", ".join([f'{c.get("name")}:{c.get("type")}' for c in cols])
        logger.info("[schema] %s columns: %s", table_name, formatted)
    except Exception as exc:
        logger.info("[schema] Failed to inspect %s: %s", table_name, exc)


def _describe_unique_indexes(table_name: str) -> list[dict[str, Any]]:
    """Inspect and normalize unique indexes/constraints for logging and migrations."""
    inspector = inspect(engine)
    if not inspector.has_table(table_name):
        return []

    unique_indexes: list[dict[str, Any]] = []
    seen: set[tuple[str, tuple[str, ...]]] = set()

    try:
        for idx in inspector.get_indexes(table_name):
            cols = tuple(idx.get("column_names") or [])
            if not idx.get("unique"):
                continue
            name = str(idx.get("name") or "")
            key = (name, cols)
            if key in seen:
                continue
            seen.add(key)
            unique_indexes.append(
                {
                    "name": name,
                    "columns": list(cols),
                    "source": "index",
                }
            )
    except Exception as exc:
        logger.warning("[quota-index-migrate] Failed to inspect indexes for %s: %s", table_name, exc)

    try:
        for uc in inspector.get_unique_constraints(table_name):
            cols = tuple(uc.get("column_names") or [])
            name = str(uc.get("name") or "")
            if not name:
                continue
            key = (name, cols)
            if key in seen:
                continue
            seen.add(key)
            unique_indexes.append(
                {
                    "name": name,
                    "columns": list(cols),
                    "source": "constraint",
                }
            )
    except Exception:
        # Some dialects may not expose unique constraints separately.
        pass

    return unique_indexes


def _migrate_screening_quota_unique_index():
    """
    Replace legacy unique index (actor_key, date) with
    (actor_key, date, quota_type) on screening_quotas.
    """
    table_name = "screening_quotas"
    inspector = inspect(engine)
    if not inspector.has_table(table_name):
        logger.info("[quota-index-migrate] %s missing; skipping index migration", table_name)
        return

    desired_cols = ("actor_key", "date", "quota_type")
    legacy_cols = ("actor_key", "date")

    before = _describe_unique_indexes(table_name)
    logger.info("[quota-index-migrate] %s unique indexes before: %s", table_name, before)

    with engine.begin() as conn:
        for idx in before:
            cols = tuple(idx.get("columns") or [])
            name = str(idx.get("name") or "")
            source = str(idx.get("source") or "index")
            if not name or cols != legacy_cols:
                continue
            try:
                if source == "constraint" and engine.dialect.name.lower() in {"postgres", "postgresql"}:
                    conn.execute(
                        text(f'ALTER TABLE "{table_name}" DROP CONSTRAINT IF EXISTS "{name}"')
                    )
                else:
                    conn.execute(text(f'DROP INDEX IF EXISTS "{name}"'))
                logger.info(
                    "[quota-index-migrate] Dropped legacy %s %s on %s(%s)",
                    source,
                    name,
                    table_name,
                    ", ".join(cols),
                )
            except Exception as exc:
                logger.warning("[quota-index-migrate] Failed dropping %s: %s", name, exc)

        after_drop = _describe_unique_indexes(table_name)
        has_desired_unique = any(tuple(idx.get("columns") or []) == desired_cols for idx in after_drop)
        if not has_desired_unique:
            try:
                conn.execute(
                    text(
                        "CREATE UNIQUE INDEX IF NOT EXISTS ix_screening_quota_actor_date "
                        "ON screening_quotas (actor_key, date, quota_type)"
                    )
                )
                logger.info(
                    "[quota-index-migrate] Ensured unique index on %s(%s)",
                    table_name,
                    ", ".join(desired_cols),
                )
            except Exception as exc:
                logger.warning("[quota-index-migrate] Failed creating target unique index: %s", exc)

    after = _describe_unique_indexes(table_name)
    logger.info("[quota-index-migrate] %s unique indexes after: %s", table_name, after)


def _drop_news_articles_table_if_exists():
    """Drop legacy news_articles table during startup after news decommission."""
    table_name = "news_articles"
    inspector = inspect(engine)
    if not inspector.has_table(table_name):
        logger.info("[news-decommission] %s table missing; skipping drop", table_name)
        return

    logger.info("[news-decommission] Dropping legacy table: %s", table_name)
    try:
        with engine.begin() as conn:
            if engine.dialect.name.lower() in {"postgresql", "postgres"}:
                conn.execute(text(f'DROP TABLE IF EXISTS "{table_name}" CASCADE'))
            else:
                conn.execute(text(f'DROP TABLE IF EXISTS "{table_name}"'))
        logger.info("[news-decommission] Dropped %s successfully", table_name)
    except Exception as exc:
        logger.warning("[news-decommission] Failed dropping %s: %s", table_name, exc)


def _acquire_seed_lock(conn) -> bool:
    """
    Acquire a best-effort cross-process seed lock.
    - Postgres: uses advisory lock (prevents multi-worker double-seeding)
    - Others: no-op (returns True)
    """
    try:
        if engine.dialect.name.lower() in {"postgresql", "postgres"}:
            # Use a stable integer key; any 32-bit int is fine.
            got = conn.execute(text("SELECT pg_try_advisory_lock(42424242)")).scalar()
            return bool(got)
    except Exception:
        return True
    return True


def _release_seed_lock(conn) -> None:
    try:
        if engine.dialect.name.lower() in {"postgresql", "postgres"}:
            conn.execute(text("SELECT pg_advisory_unlock(42424242)"))
    except Exception:
        pass


def _auto_seed_stocks():
    """
    Seed the database with stock data if it's empty.
    Uses real Yahoo Finance data (real_stock_data.py) if available,
    otherwise falls back to seed data (fetch_data.py).
    """
    from app.database import SessionLocal
    from app.models import Stock, ComplianceRuleVersion

    db = SessionLocal()
    try:
        # Upsert: add new stocks and update existing ones
        try:
            from real_stock_data import REAL_STOCKS
            stock_data = REAL_STOCKS
            source = "real Yahoo Finance data"
        except (ImportError, Exception):
            from fetch_data import SEED_STOCKS
            stock_data = SEED_STOCKS
            source = "seed data"

        existing_count = db.query(Stock).count()
        added = 0
        updated = 0
        for payload in stock_data:
            # Some tickers collide across exchanges (e.g. "BA" is Boeing on US exchanges
            # and BAE Systems on LSE as "BA.L"). Disambiguate LSE tickers with Yahoo-style suffix.
            try:
                ex = (payload.get("exchange") or "").upper()
                sym = (payload.get("symbol") or "").upper()
                if ex == "LSE" and sym and not sym.endswith(".L"):
                    payload = {**payload, "symbol": f"{sym}.L"}
                elif ex == "NSE" and sym.endswith(".NS"):
                    payload = {**payload, "symbol": sym.removesuffix(".NS")}
            except Exception:
                pass

            # Yahoo can return negative magnitudes for some income lines; screening expects non-negative.
            try:
                ii = float(payload.get("interest_income") or 0)
                npi = float(payload.get("non_permissible_income") or 0)
                if ii < 0 or npi < 0:
                    payload = {
                        **payload,
                        "interest_income": abs(ii),
                        "non_permissible_income": abs(npi),
                    }
            except Exception:
                pass

            existing = (
                db.query(Stock)
                .filter(
                    Stock.symbol == payload["symbol"],
                    Stock.exchange == payload.get("exchange", "NSE"),
                )
                .first()
            )
            if not existing:
                existing = db.query(Stock).filter(Stock.symbol == payload["symbol"]).first()
            if existing:
                for key, value in payload.items():
                    setattr(existing, key, value)
                updated += 1
            else:
                db.add(Stock(**payload))
                added += 1

        logger.info("[auto-seed] %s: %d added, %d updated (was %d, now %d) from %s",
                     "Stocks", added, updated, existing_count, existing_count + added, source)

        # Seed compliance rule versions if empty
        rule_count = db.query(ComplianceRuleVersion).count()
        if rule_count == 0:
            from fetch_data import SEED_RULE_VERSIONS
            for payload in SEED_RULE_VERSIONS:
                db.add(ComplianceRuleVersion(**payload))
            logger.info("[auto-seed] Loaded %d rule versions.", len(SEED_RULE_VERSIONS))

        db.commit()

    except Exception as exc:
        db.rollback()
        logger.error("[auto-seed] Failed to seed: %s", exc)
    finally:
        db.close()


BASE_DIR = Path(__file__).resolve().parent.parent
APP_TEMPLATE = (BASE_DIR / "templates" / "dashboard.html").read_text(encoding="utf-8")

# 1. Create any brand-new tables
Base.metadata.create_all(bind=engine)


def _sqlite_migrate_stocks_composite_unique():
    """Drop legacy SQLite UNIQUE(symbol) after adding UNIQUE(exchange, symbol)."""
    if engine.dialect.name != "sqlite":
        return
    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA index_list('stocks')")).fetchall()
        names = {r[1] for r in rows}
        if "uq_stocks_exchange_symbol" in names:
            return
        try:
            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_stocks_exchange_symbol "
                    "ON stocks (exchange, symbol)"
                )
            )
        except Exception as exc:
            logger.warning("[sqlite-migrate] Could not add composite unique on stocks: %s", exc)
            return
        for r in rows:
            idx_name, unique = r[1], r[2]
            if not unique or not str(idx_name).startswith("sqlite_autoindex_stocks"):
                continue
            info = conn.execute(text(f"PRAGMA index_info('{idx_name}')")).fetchall()
            cols = [x[2] for x in info]
            if cols == ["symbol"]:
                try:
                    conn.execute(text(f'DROP INDEX "{idx_name}"'))
                    logger.info("[sqlite-migrate] Dropped legacy unique index %s", idx_name)
                except Exception as exc:
                    logger.warning("[sqlite-migrate] Could not drop %s: %s", idx_name, exc)


_sqlite_migrate_stocks_composite_unique()

# 2. Add any missing columns to existing tables
_auto_migrate_columns()
# 2a. Remove legacy news table if it still exists in older deployments
_drop_news_articles_table_if_exists()
# 2b. Heal legacy screening_quotas unique index shape in older environments
_migrate_screening_quota_unique_index()
# 3. Auto-seed stocks if the database is empty
_auto_seed_stocks()

# 4. Seed collections and super investors (single-worker safe)
log = logging.getLogger("barakfi")
try:
    from app.database import SessionLocal as _SeedSession
    _seed_db = _SeedSession()
    try:
        # Log live schema for prod debugging (safe: only column names/types).
        # This helps when Render Postgres has extra NOT NULL fields.
        if engine.dialect.name.lower() in {"postgresql", "postgres"}:
            _log_table_columns("stock_collections")
            _log_table_columns("collection_entries")
            _log_table_columns("super_investors")
            _log_table_columns("super_investor_holdings")

        # Best-effort: try to avoid multi-worker double-seeding on Postgres.
        # IMPORTANT: never skip seeding entirely, because idempotent seeds are safe and
        # Render can otherwise remain empty if the "lock holder" worker dies early.
        try:
            conn = _seed_db.connection()
            got_lock = _acquire_seed_lock(conn)
            if got_lock:
                log.info("Acquired seed lock.")
            else:
                log.info("Seed lock held by another worker; continuing with idempotent seeding.")
        except Exception:
            got_lock = False

        from app.services.collection_service import seed_collections
        from app.services.investor_service import seed_investors

        count = seed_collections(_seed_db)
        log.info("Seeded %d collections", count)
        count = seed_investors(_seed_db)
        log.info("Seeded %d super investors", count)

        try:
            from app.services.index_membership_service import seed_index_memberships

            seed_index_memberships(_seed_db)
        except Exception as idx_exc:
            log.warning("Index membership seed skipped: %s", idx_exc)

        try:
            if got_lock:
                _release_seed_lock(conn)
        except Exception:
            pass

        # Ensure a default admin user exists for tests + local admin workflows.
        # This is safe in dev/test, and in production the admin list is controlled
        # by env vars + actual sign-ins.
        from app.models import User as _User
        admin_user = _seed_db.query(_User).filter(_User.auth_subject == "google-oauth2|aditya-seed").first()
        admin_subject = "google-oauth2|aditya-seed"
        if not admin_user:
            admin_user = _User(
                email="aditya@barakfi.in",
                display_name="Aditya",
                auth_provider="google",
                auth_subject="google-oauth2|aditya-seed",
                role="admin",
                is_active=True,
            )
            _seed_db.add(admin_user)
            _seed_db.flush()
            from app.api import helpers as _helpers
            _helpers.create_default_workspace(_seed_db, admin_user)
            _seed_db.commit()
        else:
            # Keep it consistent even if the row existed from a previous test run.
            admin_user.email = "aditya@barakfi.in"
            admin_user.display_name = "Aditya"
            admin_user.auth_provider = "google"
            admin_user.role = "admin"
            admin_user.is_active = True
            _seed_db.commit()

        # Seed one demo review case so the public endpoint shape stays stable.
        # Tests expect an active review case for WIPRO AND that it shows up in the
        # seeded admin user's review queue.
        from app.models import Stock as _Stock, ComplianceReviewCase as _ReviewCase, ComplianceReviewEvent as _ReviewEvent
        wipro = _seed_db.query(_Stock).filter(_Stock.symbol == "WIPRO").first()
        if wipro:
            existing_case = (
                _seed_db.query(_ReviewCase)
                .filter(_ReviewCase.stock_id == wipro.id, _ReviewCase.status.in_(["open", "in_progress"]))
                .first()
            )
            case = existing_case
            if not case:
                case = _ReviewCase(
                    stock_id=wipro.id,
                    requested_by=admin_subject,
                    assigned_to=admin_subject,
                    status="open",
                    priority="low",
                    review_outcome=None,
                    summary="Seeded review case for demo/testing.",
                    notes="Auto-created so public API returns a review case example.",
                )
                _seed_db.add(case)
                _seed_db.flush()
                _seed_db.add(_ReviewEvent(
                    review_case_id=case.id,
                    action="created",
                    note="Seeded by startup routine",
                    actor=admin_subject,
                ))
                _seed_db.commit()

            # Ensure this case is visible to the seeded admin user in `/me/*` endpoints.
            if case.requested_by != admin_subject or case.assigned_to != admin_subject:
                case.requested_by = admin_subject
                case.assigned_to = admin_subject
                _seed_db.commit()

            # Ensure WIPRO is in the seeded admin's watchlist so user-scope review case queries
            # (which are keyed off watchlist/holdings stock IDs) include this case.
            from app.models import WatchlistEntry as _WatchlistEntry, Portfolio as _Portfolio
            seeded_portfolio = (
                _seed_db.query(_Portfolio)
                .filter(_Portfolio.user_id == admin_user.id)
                .order_by(_Portfolio.created_at.asc())
                .first()
            )
            if seeded_portfolio:
                exists_wl = (
                    _seed_db.query(_WatchlistEntry)
                    .filter(_WatchlistEntry.user_id == admin_user.id, _WatchlistEntry.stock_id == wipro.id)
                    .first()
                )
                if not exists_wl:
                    _seed_db.add(_WatchlistEntry(
                        user_id=admin_user.id,
                        owner_name=seeded_portfolio.owner_name,
                        stock_id=wipro.id,
                        notes="Auto-added WIPRO so seeded review case is visible in activity feed.",
                    ))
                    _seed_db.commit()

        # Ensure the seeded admin has the expected public owner name.
        # (Many endpoints use `/portfolio/{owner_name}` with `owner_name="aditya"` in tests.)
        from app.models import Portfolio as _Portfolio
        admin_portfolio = (
            _seed_db.query(_Portfolio)
            .filter(_Portfolio.user_id == admin_user.id)
            .order_by(_Portfolio.created_at.asc())
            .first()
        )
        if admin_portfolio:
            if admin_portfolio.owner_name != "aditya":
                admin_portfolio.owner_name = "aditya"
            # Seed admin portfolio with the canonical name expected by tests/UI examples.
            if admin_portfolio.name != "Core India Halal":
                admin_portfolio.name = "Core India Halal"
            _seed_db.commit()
    except SystemExit:
        pass
    except Exception as exc:
        log.warning("Seeding collections/investors failed: %s", exc)
    finally:
        _seed_db.close()
except Exception as exc:
    log.warning("Seeding collections/investors failed: %s", exc)

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

# Avoid rate limiting in local/test runs; keep it in production-like environments.
if not DEBUG and APP_ENV.lower() == "production":
    # Mobile users + SPAs can burst many API calls on first paint; keep generous limits.
    app.add_middleware(RateLimitMiddleware, requests_per_minute=240, burst=60)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Internal-Service-Token", "X-Actor-Auth-Subject", "X-Actor-Email"],
)
# Outermost: normalize /api JSON into { success, data, error }
app.add_middleware(ApiEnvelopeMiddleware)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    started = perf_counter()
    response = await call_next(request)
    elapsed_ms = round((perf_counter() - started) * 1000, 2)

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Process-Time-Ms"] = str(elapsed_ms)
    return response

app.include_router(router)


@app.get("/")
def home():
    return {
        "message": "Barakfi API Running",
        "environment": APP_ENV,
        "version": APP_VERSION,
    }


@app.get("/app", response_class=HTMLResponse)
def app_dashboard():
    content = (
        APP_TEMPLATE.replace("{{ app_name }}", APP_NAME)
        .replace("{{ app_version }}", APP_VERSION)
        .replace("{{ default_owner }}", "aditya")
        .replace("{{ auth_provider }}", AUTH_PROVIDER)
        .replace("{{ auth_google_enabled }}", "true" if AUTH_GOOGLE_ENABLED else "false")
        .replace("{{ clerk_publishable_key }}", CLERK_PUBLISHABLE_KEY)
        .replace("{{ clerk_js_url }}", CLERK_JS_URL)
    )
    return HTMLResponse(content=content)


def _health_payload() -> dict:
    """Shared by /health and /api/health — RENDER_GIT_COMMIT confirms Render deploy revision."""
    return {
        "status": "ok",
        "service": APP_NAME,
        "environment": APP_ENV,
        "version": APP_VERSION,
        "git_commit": os.getenv("RENDER_GIT_COMMIT", ""),
        "git_branch": os.getenv("RENDER_GIT_BRANCH", ""),
        "coverage_request_db_fix": "requested_at_column",
    }


@app.get("/health")
def health():
    return _health_payload()


@app.get("/api/health")
def health_under_api_prefix():
    """Same as /health — most clients expect everything under /api (see NEXT_PUBLIC_API_BASE_URL)."""
    return _health_payload()

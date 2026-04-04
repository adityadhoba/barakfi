import logging
from time import perf_counter
from pathlib import Path

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
from app.middleware.rate_limit import RateLimitMiddleware
from app.models import (  # noqa: F401 – imported so SQLAlchemy registers all tables
    ComplianceHistory,
    StockCollection,
    CollectionEntry,
    SuperInvestor,
    SuperInvestorHolding,
    CoverageRequest,
)

app = FastAPI(title=APP_NAME, version=APP_VERSION, debug=DEBUG)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all: always return JSON so frontend proxies can parse the response."""
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    detail = str(exc) if DEBUG else "Internal server error"
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
                    if isinstance(default_val, str):
                        default_clause = f" DEFAULT '{default_val}'"
                    elif isinstance(default_val, bool):
                        default_clause = f" DEFAULT {1 if default_val else 0}"
                    elif default_val is not None:
                        default_clause = f" DEFAULT {default_val}"

                nullable = "" if column.nullable else " NOT NULL"
                # SQLite can't add NOT NULL without a default, so force a default
                if not column.nullable and not default_clause:
                    if "INT" in str(col_type).upper() or "FLOAT" in str(col_type).upper():
                        default_clause = " DEFAULT 0"
                    elif "BOOL" in str(col_type).upper():
                        default_clause = " DEFAULT 0"
                    else:
                        default_clause = " DEFAULT ''"

                sql = f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {col_type}{nullable}{default_clause}'
                logger.info("[auto-migrate] %s", sql)
                conn.execute(text(sql))

    logger.info("[auto-migrate] Schema check complete.")


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
# 2. Add any missing columns to existing tables
_auto_migrate_columns()
# 3. Auto-seed stocks if the database is empty
_auto_seed_stocks()

# 4. Seed collections and super investors
log = logging.getLogger("barakfi")
try:
    from app.database import SessionLocal as _SeedSession
    _seed_db = _SeedSession()
    try:
        from app.services.collection_service import seed_collections
        from app.services.investor_service import seed_investors
        count = seed_collections(_seed_db)
        if count > 0:
            log.info("Seeded %d collections", count)
        count = seed_investors(_seed_db)
        if count > 0:
            log.info("Seeded %d super investors", count)
    except Exception as exc:
        log.warning("Seeding collections/investors failed: %s", exc)
    finally:
        _seed_db.close()
except Exception as exc:
    log.warning("Seeding collections/investors failed: %s", exc)

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

if not DEBUG:
    app.add_middleware(RateLimitMiddleware, requests_per_minute=120, burst=30)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Internal-Service-Token", "X-Actor-Auth-Subject", "X-Actor-Email"],
)


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


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": APP_NAME,
        "environment": APP_ENV,
        "version": APP_VERSION,
    }

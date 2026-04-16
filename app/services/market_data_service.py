from dataclasses import dataclass
from datetime import datetime, timezone
import logging
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import (
    FUNDAMENTALS_STALE_THRESHOLD_HOURS,
    FUNDAMENTALS_PROVIDER,
    GROWW_ACCESS_TOKEN,
    GROWW_API_KEY,
    KITE_ACCESS_TOKEN,
    KITE_API_KEY,
    MARKET_DATA_PROVIDER,
    SIGNALX_API_KEY,
    UPSTOX_ACCESS_TOKEN,
    XARO_API_KEY,
)
from app.models import DailyRefreshRun, Stock


logger = logging.getLogger("barakfi.market-data-status")
_LAST_STALE_WARNING_AT: datetime | None = None


@dataclass(frozen=True)
class ProviderDefinition:
    code: str
    label: str
    capabilities: tuple[str, ...]
    credential_names: tuple[str, ...]
    is_live_provider: bool


MARKET_DATA_PROVIDERS = {
    "seed": ProviderDefinition(
        code="seed",
        label="Seed dataset",
        capabilities=("demo universe", "local quote data"),
        credential_names=(),
        is_live_provider=False,
    ),
    "nse_public": ProviderDefinition(
        code="nse_public",
        label="NSE India (public JSON)",
        capabilities=("delayed NSE last price", "day range", "52w range via NSE or Yahoo fallback"),
        credential_names=(),
        is_live_provider=True,
    ),
    "yahoo_india": ProviderDefinition(
        code="yahoo_india",
        label="Yahoo Finance chart (NSE/BSE suffix)",
        capabilities=("delayed quotes", "volume", "day & 52w range"),
        credential_names=(),
        is_live_provider=True,
    ),
    "auto_india": ProviderDefinition(
        code="auto_india",
        label="Auto: NSE JSON then Yahoo fallback",
        capabilities=("best-effort Indian quotes", "NSE-first for NSE symbols"),
        credential_names=(),
        is_live_provider=True,
    ),
    "groww": ProviderDefinition(
        code="groww",
        label="Groww Trading API",
        capabilities=("instrument universe", "live quotes", "historical candles"),
        credential_names=("GROWW_API_KEY", "GROWW_ACCESS_TOKEN"),
        is_live_provider=True,
    ),
    "kite": ProviderDefinition(
        code="kite",
        label="Kite Connect",
        capabilities=("instrument universe", "live quotes", "historical candles"),
        credential_names=("KITE_API_KEY", "KITE_ACCESS_TOKEN"),
        is_live_provider=True,
    ),
    "upstox": ProviderDefinition(
        code="upstox",
        label="Upstox API",
        capabilities=("instrument universe", "live quotes", "historical candles"),
        credential_names=("UPSTOX_ACCESS_TOKEN",),
        is_live_provider=True,
    ),
}

FUNDAMENTALS_PROVIDERS = {
    "seed": ProviderDefinition(
        code="seed",
        label="Seed fundamentals",
        capabilities=("demo balance-sheet fields", "demo income fields"),
        credential_names=(),
        is_live_provider=False,
    ),
    "signalx": ProviderDefinition(
        code="signalx",
        label="SignalX statements feed",
        capabilities=("financial statements", "balance sheet", "profit and loss", "cash flow"),
        credential_names=("SIGNALX_API_KEY",),
        is_live_provider=True,
    ),
    "xaro": ProviderDefinition(
        code="xaro",
        label="Xaro filings feed",
        capabilities=("filings search", "annual reports", "quarterly results"),
        credential_names=("XARO_API_KEY",),
        is_live_provider=True,
    ),
}

_CREDENTIAL_VALUES = {
    "GROWW_API_KEY": GROWW_API_KEY,
    "GROWW_ACCESS_TOKEN": GROWW_ACCESS_TOKEN,
    "KITE_API_KEY": KITE_API_KEY,
    "KITE_ACCESS_TOKEN": KITE_ACCESS_TOKEN,
    "UPSTOX_ACCESS_TOKEN": UPSTOX_ACCESS_TOKEN,
    "SIGNALX_API_KEY": SIGNALX_API_KEY,
    "XARO_API_KEY": XARO_API_KEY,
}


def _resolve_provider(
    provider_code: str,
    registry: dict[str, ProviderDefinition],
    fallback_code: str = "seed",
) -> ProviderDefinition:
    return registry.get(provider_code, registry[fallback_code])


def _provider_configured(definition: ProviderDefinition) -> bool:
    return all(bool(_CREDENTIAL_VALUES.get(name)) for name in definition.credential_names)


def _missing_credentials(definition: ProviderDefinition) -> list[str]:
    return [name for name in definition.credential_names if not _CREDENTIAL_VALUES.get(name)]


def _build_market_notes(definition: ProviderDefinition, configured: bool) -> tuple[list[str], list[str]]:
    notes: list[str] = []
    blockers: list[str] = []

    if definition.code == "seed":
        notes.append("The app is still serving a seeded local stock universe.")
        notes.append("Quotes and symbols are limited to demo records in the database.")
        blockers.append(
            "Switch to nse_public, yahoo_india, auto_india for public delayed quotes, "
            "or Groww/Kite/Upstox when you have API credentials."
        )
        return notes, blockers

    if definition.code in ("nse_public", "yahoo_india", "auto_india"):
        notes.append(
            f"{definition.label} pulls delayed-style prices from public endpoints (not a redistribution licence)."
        )
        notes.append("Use POST /api/market-data/sync-prices with X-Internal-Service-Token to refresh DB prices.")
        notes.append("GET /api/market-data/quote/{symbol} returns a live snapshot without writing the database.")
        blockers.append(
            "For Tickertape-scale production, plan a licensed vendor; public feeds can break or rate-limit."
        )
        return notes, blockers

    notes.append(f"{definition.label} is selected for live market coverage.")
    notes.append("This provider should own the stock universe, quotes, and later tradability checks.")

    if configured:
        notes.append("Credentials are present, so the app is ready for live sync implementation.")
    else:
        missing = ", ".join(_missing_credentials(definition))
        blockers.append(f"Missing credentials: {missing}.")
        blockers.append("Live quotes are not active until those credentials are configured.")

    if definition.code == "groww":
        notes.append("Groww is a good low-cost first provider for Indian market data and later broker connectivity.")

    return notes, blockers


def _build_fundamentals_notes(definition: ProviderDefinition, configured: bool) -> tuple[list[str], list[str]]:
    notes: list[str] = []
    blockers: list[str] = []

    if definition.code == "seed":
        notes.append("The app is still using seeded financial statement inputs for screening.")
        notes.append("This is enough for product development, but not enough for production-scale Shariah screening.")
        blockers.append("Add a filings or statements provider to support wider financial coverage.")
        blockers.append("Broker APIs alone will not provide the debt, receivables, and income detail needed for screening.")
        return notes, blockers

    notes.append(f"{definition.label} is selected for financial statement coverage.")
    notes.append("This provider should supply balance-sheet and income data to the screening engine.")

    if configured:
        notes.append("Credentials are present, so the app is ready for fundamentals ingestion work.")
    else:
        missing = ", ".join(_missing_credentials(definition))
        blockers.append(f"Missing credentials: {missing}.")
        blockers.append("Compliance ratios remain dependent on seed data until fundamentals access is configured.")

    return notes, blockers


def summarize_fundamentals_freshness(
    *,
    stock_count: int,
    latest_fundamentals_updated_at: datetime | None,
    rows_with_timestamp: int,
    stale_threshold_hours: int = FUNDAMENTALS_STALE_THRESHOLD_HOURS,
    now_utc: datetime | None = None,
) -> dict[str, Any]:
    now = now_utc or datetime.now(timezone.utc)
    rows_with = max(int(rows_with_timestamp or 0), 0)
    rows_missing = max(int(stock_count or 0) - rows_with, 0)

    latest = latest_fundamentals_updated_at
    if latest and latest.tzinfo is None:
        latest = latest.replace(tzinfo=timezone.utc)

    staleness_hours: float | None = None
    if latest:
        delta_hours = max((now - latest).total_seconds() / 3600, 0)
        staleness_hours = round(delta_hours, 2)
    stale = (staleness_hours is None and stock_count > 0) or (
        staleness_hours is not None and staleness_hours > stale_threshold_hours
    )

    return {
        "latest_fundamentals_updated_at": latest,
        "rows_with_timestamp": rows_with,
        "rows_missing_timestamp": rows_missing,
        "stale": stale,
        "staleness_hours": staleness_hours,
        "stale_threshold_hours": stale_threshold_hours,
    }


def _should_emit_stale_warning(now_utc: datetime) -> bool:
    global _LAST_STALE_WARNING_AT
    if _LAST_STALE_WARNING_AT is None:
        _LAST_STALE_WARNING_AT = now_utc
        return True
    if (now_utc - _LAST_STALE_WARNING_AT).total_seconds() >= 3600:
        _LAST_STALE_WARNING_AT = now_utc
        return True
    return False


def _collect_fundamentals_freshness(db: Session | None, stock_count: int) -> dict[str, Any]:
    latest_fundamentals_updated_at: datetime | None = None
    rows_with_timestamp = 0
    if db is not None:
        try:
            rows_with_timestamp = int(
                db.query(func.count(Stock.id))
                .filter(
                    Stock.is_active.is_(True),
                    Stock.fundamentals_updated_at.isnot(None),
                )
                .scalar()
                or 0
            )
            latest_fundamentals_updated_at = db.query(func.max(Stock.fundamentals_updated_at)).filter(
                Stock.is_active.is_(True)
            ).scalar()
        except Exception as exc:
            logger.warning("[fundamentals-status] failed to compute freshness counters: %s", exc)

    now_utc = datetime.now(timezone.utc)
    freshness = summarize_fundamentals_freshness(
        stock_count=stock_count,
        latest_fundamentals_updated_at=latest_fundamentals_updated_at,
        rows_with_timestamp=rows_with_timestamp,
        now_utc=now_utc,
    )

    if freshness["stale"] and _should_emit_stale_warning(now_utc):
        logger.warning(
            "[fundamentals-status] dataset stale (hours=%s, threshold=%s, rows_with_timestamp=%s, rows_missing_timestamp=%s)",
            freshness["staleness_hours"],
            freshness["stale_threshold_hours"],
            freshness["rows_with_timestamp"],
            freshness["rows_missing_timestamp"],
        )
    return freshness


def _collect_latest_screening_refresh(db: Session | None) -> dict[str, Any]:
    defaults = {
        "latest_daily_screening_completed_at": None,
        "screening_symbols_expected": 0,
        "screening_symbols_completed": 0,
        "screening_complete": False,
    }
    if db is None:
        return defaults
    try:
        latest = (
            db.query(DailyRefreshRun)
            .order_by(DailyRefreshRun.started_at.desc(), DailyRefreshRun.id.desc())
            .first()
        )
        if not latest:
            return defaults
        return {
            "latest_daily_screening_completed_at": latest.finished_at,
            "screening_symbols_expected": int(latest.screening_symbols_expected or 0),
            "screening_symbols_completed": int(latest.screening_symbols_completed or 0),
            "screening_complete": (
                latest.status == "success"
                and int(latest.screening_symbols_completed or 0)
                >= int(latest.screening_symbols_expected or 0)
                and int(latest.screening_symbols_expected or 0) > 0
            ),
        }
    except Exception as exc:
        logger.warning("[fundamentals-status] failed to read daily_refresh_runs: %s", exc)
        return defaults


def get_market_data_status(stock_count: int) -> dict:
    definition = _resolve_provider(MARKET_DATA_PROVIDER, MARKET_DATA_PROVIDERS)
    configured = _provider_configured(definition)
    is_live = definition.is_live_provider and configured
    notes, blockers = _build_market_notes(definition, configured)

    return {
        "provider": definition.code,
        "provider_label": definition.label,
        "configured": configured,
        "is_live": is_live,
        "mode": "live" if is_live else "seed",
        "stock_count": stock_count,
        "universe_source": definition.code if is_live else "database",
        "quote_source": definition.code if is_live else "seed_database",
        "capabilities": list(definition.capabilities),
        "blockers": blockers,
        "notes": notes,
    }


def get_fundamentals_status(stock_count: int, db: Session | None = None) -> dict:
    definition = _resolve_provider(FUNDAMENTALS_PROVIDER, FUNDAMENTALS_PROVIDERS)
    configured = _provider_configured(definition)
    is_live = definition.is_live_provider and configured
    notes, blockers = _build_fundamentals_notes(definition, configured)
    freshness = _collect_fundamentals_freshness(db, stock_count)
    screening_refresh = _collect_latest_screening_refresh(db)

    if freshness["rows_missing_timestamp"] > 0:
        notes.append(
            f"{freshness['rows_missing_timestamp']} active symbols do not yet have fundamentals_updated_at."
        )
    if freshness["stale"]:
        blockers.append(
            f"Fundamentals freshness exceeded {freshness['stale_threshold_hours']}h threshold; run fundamentals sync."
        )

    return {
        "provider": definition.code,
        "provider_label": definition.label,
        "configured": configured,
        "is_live": is_live,
        "mode": "live" if is_live else "seed",
        "stock_count": stock_count,
        "statement_source": definition.code if is_live else "seed_database",
        "screening_readiness": "production_ready" if is_live else "limited_seed_readiness",
        "capabilities": list(definition.capabilities),
        "blockers": blockers,
        "notes": notes,
        "latest_fundamentals_updated_at": freshness["latest_fundamentals_updated_at"],
        "rows_with_timestamp": freshness["rows_with_timestamp"],
        "rows_missing_timestamp": freshness["rows_missing_timestamp"],
        "stale": freshness["stale"],
        "staleness_hours": freshness["staleness_hours"],
        "latest_daily_screening_completed_at": screening_refresh["latest_daily_screening_completed_at"],
        "screening_symbols_expected": screening_refresh["screening_symbols_expected"],
        "screening_symbols_completed": screening_refresh["screening_symbols_completed"],
        "screening_complete": screening_refresh["screening_complete"],
    }


def get_data_stack_status(stock_count: int, db: Session | None = None) -> dict:
    market_data = get_market_data_status(stock_count)
    fundamentals = get_fundamentals_status(stock_count, db=db)

    readiness_gaps = []
    if market_data["mode"] != "live":
        readiness_gaps.append("Live market universe is not connected yet.")
    if fundamentals["mode"] != "live":
        readiness_gaps.append("Financial statements are still seeded, so screening scale is limited.")
    if fundamentals["stale"]:
        readiness_gaps.append("Fundamentals dataset is stale or missing timestamps.")
    if not fundamentals.get("screening_complete"):
        readiness_gaps.append("Daily screening refresh is incomplete or has not run yet.")

    fundamentals_freshness = {
        "latest_fundamentals_updated_at": fundamentals["latest_fundamentals_updated_at"],
        "rows_with_timestamp": fundamentals["rows_with_timestamp"],
        "rows_missing_timestamp": fundamentals["rows_missing_timestamp"],
        "stale": fundamentals["stale"],
        "staleness_hours": fundamentals["staleness_hours"],
        "latest_daily_screening_completed_at": fundamentals["latest_daily_screening_completed_at"],
        "screening_symbols_expected": fundamentals["screening_symbols_expected"],
        "screening_symbols_completed": fundamentals["screening_symbols_completed"],
        "screening_complete": fundamentals["screening_complete"],
    }

    return {
        "market_data": market_data,
        "fundamentals": fundamentals,
        "fundamentals_freshness": fundamentals_freshness,
        "ready_for_scaled_screening": market_data["is_live"] and fundamentals["is_live"],
        "readiness_gaps": readiness_gaps,
    }

from dataclasses import dataclass

from app.config import (
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


def get_fundamentals_status(stock_count: int) -> dict:
    definition = _resolve_provider(FUNDAMENTALS_PROVIDER, FUNDAMENTALS_PROVIDERS)
    configured = _provider_configured(definition)
    is_live = definition.is_live_provider and configured
    notes, blockers = _build_fundamentals_notes(definition, configured)

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
    }


def get_data_stack_status(stock_count: int) -> dict:
    market_data = get_market_data_status(stock_count)
    fundamentals = get_fundamentals_status(stock_count)

    readiness_gaps = []
    if market_data["mode"] != "live":
        readiness_gaps.append("Live market universe is not connected yet.")
    if fundamentals["mode"] != "live":
        readiness_gaps.append("Financial statements are still seeded, so screening scale is limited.")

    return {
        "market_data": market_data,
        "fundamentals": fundamentals,
        "ready_for_scaled_screening": market_data["is_live"] and fundamentals["is_live"],
        "readiness_gaps": readiness_gaps,
    }

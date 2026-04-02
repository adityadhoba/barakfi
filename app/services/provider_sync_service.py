from app.services.market_data_service import MARKET_DATA_PROVIDERS, _resolve_provider, get_market_data_status


FIXTURE_INSTRUMENTS = {
    "groww": [
        {
            "symbol": "RELIANCE",
            "name": "Reliance Industries",
            "exchange": "NSE",
            "sector": "Energy",
            "instrument_type": "EQ",
            "provider_key": "groww_nse_reliance_eq",
            "currency": "INR",
            "price_hint": 2960.0,
        },
        {
            "symbol": "TCS",
            "name": "Tata Consultancy Services",
            "exchange": "NSE",
            "sector": "Information Technology",
            "instrument_type": "EQ",
            "provider_key": "groww_nse_tcs_eq",
            "currency": "INR",
            "price_hint": 3900.0,
        },
        {
            "symbol": "INFY",
            "name": "Infosys",
            "exchange": "NSE",
            "sector": "Information Technology",
            "instrument_type": "EQ",
            "provider_key": "groww_nse_infy_eq",
            "currency": "INR",
            "price_hint": 1500.0,
        },
        {
            "symbol": "HINDUNILVR",
            "name": "Hindustan Unilever",
            "exchange": "NSE",
            "sector": "Consumer Staples",
            "instrument_type": "EQ",
            "provider_key": "groww_nse_hindunilvr_eq",
            "currency": "INR",
            "price_hint": 2420.0,
        },
        {
            "symbol": "ASIANPAINT",
            "name": "Asian Paints",
            "exchange": "NSE",
            "sector": "Consumer Discretionary",
            "instrument_type": "EQ",
            "provider_key": "groww_nse_asianpaints_eq",
            "currency": "INR",
            "price_hint": 2865.0,
        },
        {
            "symbol": "BAJFINANCE",
            "name": "Bajaj Finance",
            "exchange": "NSE",
            "sector": "Financial Services",
            "instrument_type": "EQ",
            "provider_key": "groww_nse_bajfinance_eq",
            "currency": "INR",
            "price_hint": 7210.0,
        },
    ],
    "kite": [
        {
            "symbol": "SBIN",
            "name": "State Bank of India",
            "exchange": "NSE",
            "sector": "Financial Services",
            "instrument_type": "EQ",
            "provider_key": "kite_nse_sbin_eq",
            "currency": "INR",
            "price_hint": 812.0,
        }
    ],
    "upstox": [
        {
            "symbol": "LT",
            "name": "Larsen & Toubro",
            "exchange": "NSE",
            "sector": "Industrials",
            "instrument_type": "EQ",
            "provider_key": "upstox_nse_lt_eq",
            "currency": "INR",
            "price_hint": 3665.0,
        }
    ],
    "seed": [],
}


def preview_market_universe(provider_code: str | None = None, limit: int = 8, stock_count: int = 0) -> dict:
    target_code = (provider_code or "").strip().lower() or "groww"
    definition = _resolve_provider(target_code, MARKET_DATA_PROVIDERS, fallback_code="seed")
    provider_status = get_market_data_status(stock_count)
    configured = definition.code == provider_status["provider"] and provider_status["configured"]
    preview_rows = FIXTURE_INSTRUMENTS.get(definition.code, FIXTURE_INSTRUMENTS["seed"])[:limit]

    notes = [
        f"This is a dry-run universe preview for {definition.label}.",
        "The app is normalizing provider instruments before any database write path is introduced.",
    ]
    blockers = []

    if not preview_rows:
        notes.append("No fixture preview is defined for this provider yet.")

    if definition.code == "groww":
        notes.append("Groww is the preferred first market-data provider for the low-cost launch path.")

    if configured:
        notes.append("Credentials are present, so the next step is live fetch + persistence.")
        source_type = "configured_preview"
    else:
        blockers.append("Provider credentials are missing, so the preview is using a local normalized fixture.")
        source_type = "fixture_preview"

    instruments = [
        {
            **row,
            "data_source": f"{definition.code}_{source_type}",
            "import_readiness": "candidate",
        }
        for row in preview_rows
    ]

    return {
        "provider": definition.code,
        "provider_label": definition.label,
        "configured": configured,
        "source_type": source_type,
        "dry_run_only": True,
        "total_candidates": len(instruments),
        "import_candidates": len(instruments),
        "blockers": blockers,
        "notes": notes,
        "instruments": instruments,
    }

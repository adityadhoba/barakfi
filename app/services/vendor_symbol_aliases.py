"""
BarakFi internal symbols vs NSE / Yahoo Finance vendor tickers.

Keep aligned with frontend/src/lib/yahoo-symbol-aliases.ts where applicable.
"""

from __future__ import annotations

# BarakFi symbol -> list of full Yahoo tickers to try (e.g. GRSE.NS before GARDENREACH.NS)
TICKER_ALTERNATES: dict[str, list[str]] = {
    "TATAMOTORS": ["TATAMOTORS.NS"],
    "MCDOWELL-N": ["MCDOWELL-N.NS", "UNITDSPR.NS"],
    "PEL": ["PEL.NS"],
    "ZOMATO": ["ETERNAL.NS", "ZOMATO.NS", "ZOMATO.BO"],
    "ADANITRANS": ["ADANIENSOL.NS", "ADANITRANS.NS"],
    "INDIANHOTELS": ["INDHOTEL.NS", "INDIANHOTELS.NS"],
    "MAZAGON": ["MAZDOCK.NS", "MAZAGON.NS"],
    "GARDENREACH": ["GRSE.NS", "GARDENREACH.NS"],
    "ZENSAR": ["ZENSARTECH.NS", "ZENSAR.NS"],
    "TV18BRDCST": ["NETWORK18.NS", "TV18BRDCST.NS"],
    "CENTURYTEX": ["CENTURYTEX.NS", "ABREL.NS"],
}

# BarakFi symbol -> Yahoo base (no suffix) used for primary .NS ticker
CANONICAL_NSE_SYMBOLS: dict[str, str] = {
    "ZOMATO": "ETERNAL",
    "ADANITRANS": "ADANIENSOL",
    "INDIANHOTELS": "INDHOTEL",
    "MAZAGON": "MAZDOCK",
    "GARDENREACH": "GRSE",
    "ZENSAR": "ZENSARTECH",
    "TV18BRDCST": "NETWORK18",
}


def _strip_yahoo_suffix(ticker: str) -> str:
    u = ticker.upper().strip()
    for suf in (".NS", ".BO", ".BSE"):
        if u.endswith(suf):
            return u[: -len(suf)]
    return u


def nse_equity_symbol_candidates(barcode: str) -> list[str]:
    """
    NSE quote-equity API uses native symbols (e.g. GRSE), not BarakFi display names.
    """
    u = barcode.upper().strip()
    mapped = CANONICAL_NSE_SYMBOLS.get(u)
    out: list[str] = []
    if mapped:
        out.append(mapped)
    if u not in out:
        out.append(u)
    # Dedupe preserving order
    seen: set[str] = set()
    return [x for x in out if not (x in seen or seen.add(x))]


def yahoo_base_symbol_candidates(barcode: str) -> list[str]:
    """
    Ordered Yahoo base symbols (no .NS/.BO) for chart and quote fallbacks.
    """
    u = barcode.upper().strip()
    alts = TICKER_ALTERNATES.get(u)
    bases: list[str] = []
    if alts:
        for full in alts:
            bases.append(_strip_yahoo_suffix(full))
    else:
        mapped = CANONICAL_NSE_SYMBOLS.get(u)
        if mapped:
            bases.append(mapped)
        bases.append(u)
    seen: set[str] = set()
    out: list[str] = []
    for b in bases:
        if b and b not in seen:
            seen.add(b)
            out.append(b)
    return out

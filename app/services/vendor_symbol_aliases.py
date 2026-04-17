"""
BarakFi `Stock.symbol` values vs symbols used by public market APIs (NSE website,
Yahoo Finance). Keep aligned with `frontend/src/lib/yahoo-symbol-aliases.ts`.
"""

from __future__ import annotations

# Canonical NSE trading symbols for renamed / alternate listings.
CANONICAL_NSE_SYMBOLS: dict[str, str] = {
    "ZOMATO": "ETERNAL",
    "ADANITRANS": "ADANIENSOL",
    "INDIANHOTELS": "INDHOTEL",
    "MAZAGON": "MAZDOCK",
    "GARDENREACH": "GRSE",
    "ZENSAR": "ZENSARTECH",
    "TV18BRDCST": "NETWORK18",
}

# Yahoo Finance tickers to try (primary first). Values use .NS / .BO suffixes.
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


def _strip_yahoo_suffix(ticker: str) -> str:
    u = ticker.upper().strip()
    for suf in (".NS", ".BO", ".BSE"):
        if u.endswith(suf):
            return u[: -len(suf)]
    return u


def nse_equity_symbol_candidates(barcode: str) -> list[str]:
    """Ordered NSE `quote-equity` symbols to try for a BarakFi listing code."""
    u = barcode.upper().strip()
    out: list[str] = []
    mapped = CANONICAL_NSE_SYMBOLS.get(u)
    if mapped:
        out.append(mapped)
    out.append(u)
    seen: set[str] = set()
    deduped: list[str] = []
    for s in out:
        if s not in seen:
            seen.add(s)
            deduped.append(s)
    return deduped


def yahoo_base_symbol_candidates(barcode: str) -> list[str]:
    """
    Ordered Yahoo *base* symbols (no .NS/.BO) for chart/quote lookups.
    """
    u = barcode.upper().strip()
    bases: list[str] = []
    alts = TICKER_ALTERNATES.get(u)
    if alts:
        for full in alts:
            bases.append(_strip_yahoo_suffix(full))
    else:
        mapped = CANONICAL_NSE_SYMBOLS.get(u)
        if mapped:
            bases.append(mapped)
        bases.append(u)
    seen: set[str] = set()
    deduped: list[str] = []
    for b in bases:
        if b not in seen:
            seen.add(b)
            deduped.append(b)
    return deduped

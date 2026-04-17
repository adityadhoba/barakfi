/**
 * BarakFi screening symbols vs Yahoo Finance base symbols (no .NS/.BO).
 * Keep aligned with `app/services/vendor_symbol_aliases.py`.
 */

const TICKER_ALTERNATES: Record<string, string[]> = {
  TATAMOTORS: ["TATAMOTORS.NS"],
  "MCDOWELL-N": ["MCDOWELL-N.NS", "UNITDSPR.NS"],
  PEL: ["PEL.NS"],
  ZOMATO: ["ETERNAL.NS", "ZOMATO.NS", "ZOMATO.BO"],
  ADANITRANS: ["ADANIENSOL.NS", "ADANITRANS.NS"],
  INDIANHOTELS: ["INDHOTEL.NS", "INDIANHOTELS.NS"],
  MAZAGON: ["MAZDOCK.NS", "MAZAGON.NS"],
  GARDENREACH: ["GRSE.NS", "GARDENREACH.NS"],
  ZENSAR: ["ZENSARTECH.NS", "ZENSAR.NS"],
  TV18BRDCST: ["NETWORK18.NS", "TV18BRDCST.NS"],
  CENTURYTEX: ["CENTURYTEX.NS", "ABREL.NS"],
};

const CANONICAL_NSE_SYMBOLS: Record<string, string> = {
  ZOMATO: "ETERNAL",
  ADANITRANS: "ADANIENSOL",
  INDIANHOTELS: "INDHOTEL",
  MAZAGON: "MAZDOCK",
  GARDENREACH: "GRSE",
  ZENSAR: "ZENSARTECH",
  TV18BRDCST: "NETWORK18",
};

function stripYahooSuffix(ticker: string): string {
  const u = ticker.toUpperCase().trim();
  for (const suf of [".NS", ".BO", ".BSE"] as const) {
    if (u.endsWith(suf)) return u.slice(0, -suf.length);
  }
  return u;
}

/** Ordered Yahoo base symbols (no suffix) for chart / logo ticker lookups. */
export function yahooFinanceBaseCandidates(barcode: string): string[] {
  const u = barcode.toUpperCase().trim();
  const alts = TICKER_ALTERNATES[u];
  const bases: string[] = [];
  if (alts) {
    for (const full of alts) bases.push(stripYahooSuffix(full));
  } else {
    const mapped = CANONICAL_NSE_SYMBOLS[u];
    if (mapped) bases.push(mapped);
    bases.push(u);
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const b of bases) {
    if (!seen.has(b)) {
      seen.add(b);
      out.push(b);
    }
  }
  return out;
}

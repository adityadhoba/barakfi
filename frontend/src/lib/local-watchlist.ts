const KEY = "barakfi_local_watchlist";
const MAX = 50;

export type LocalWatchlistEntry = {
  symbol: string;
  addedAt: string;
  name?: string;
  score?: number;
  status?: string;
};

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

/** Dedupe by uppercase symbol; normalize stored symbols (legacy data may vary in case). */
function dedupeAndNormalize(entries: LocalWatchlistEntry[]): LocalWatchlistEntry[] {
  const seen = new Set<string>();
  const out: LocalWatchlistEntry[] = [];
  for (const e of entries) {
    const sym = normalizeSymbol(e.symbol);
    if (!sym || seen.has(sym)) continue;
    seen.add(sym);
    out.push({
      ...e,
      symbol: sym,
    });
  }
  return out;
}

export function getLocalWatchlist(): LocalWatchlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    const rows = parsed.filter(
      (e): e is LocalWatchlistEntry =>
        e != null && typeof e === "object" && typeof (e as LocalWatchlistEntry).symbol === "string",
    );
    const normalized = dedupeAndNormalize(rows);
    if (normalized.length !== rows.length || rows.some((r, i) => normalizeSymbol(r.symbol) !== normalized[i]?.symbol)) {
      try {
        localStorage.setItem(KEY, JSON.stringify(normalized.slice(0, MAX)));
      } catch {
        /* ignore */
      }
    }
    return normalized;
  } catch {
    return [];
  }
}

export type AddLocalWatchlistInput = {
  symbol: string;
  name?: string;
  score?: number;
  status?: string;
};

/**
 * Saves to localStorage. Same symbol (case-insensitive) replaces the existing row and moves to top — no duplicates.
 */
export function addLocalWatchlist(symbolOrInput: string | AddLocalWatchlistInput): boolean {
  const input: AddLocalWatchlistInput =
    typeof symbolOrInput === "string" ? { symbol: symbolOrInput } : symbolOrInput;
  const sym = normalizeSymbol(input.symbol);
  if (!sym) return false;
  try {
    const list = getLocalWatchlist().filter((e) => normalizeSymbol(e.symbol) !== sym);
    const entry: LocalWatchlistEntry = {
      symbol: sym,
      addedAt: new Date().toISOString(),
    };
    if (input.name?.trim()) entry.name = input.name.trim();
    if (typeof input.score === "number" && Number.isFinite(input.score)) {
      entry.score = Math.max(0, Math.min(100, Math.round(input.score)));
    }
    if (input.status?.trim()) entry.status = input.status.trim();
    list.unshift(entry);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    return true;
  } catch {
    return false;
  }
}

export function isInLocalWatchlist(symbol: string): boolean {
  const sym = normalizeSymbol(symbol);
  if (!sym) return false;
  return getLocalWatchlist().some((e) => normalizeSymbol(e.symbol) === sym);
}

export function removeLocalWatchlist(symbol: string): void {
  const sym = normalizeSymbol(symbol);
  try {
    const list = getLocalWatchlist().filter((e) => normalizeSymbol(e.symbol) !== sym);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* silent */
  }
}

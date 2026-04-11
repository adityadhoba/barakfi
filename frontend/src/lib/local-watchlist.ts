const KEY = "barakfi_local_watchlist";
const MAX = 50;

export type LocalWatchlistEntry = {
  symbol: string;
  addedAt: string;
  name?: string;
  score?: number;
  status?: string;
};

export function getLocalWatchlist(): LocalWatchlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is LocalWatchlistEntry => e != null && typeof e === "object" && typeof (e as LocalWatchlistEntry).symbol === "string");
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

export function addLocalWatchlist(symbolOrInput: string | AddLocalWatchlistInput): boolean {
  const input: AddLocalWatchlistInput =
    typeof symbolOrInput === "string"
      ? { symbol: symbolOrInput }
      : symbolOrInput;
  const sym = input.symbol.trim().toUpperCase();
  if (!sym) return false;
  try {
    const list = getLocalWatchlist().filter((e) => e.symbol !== sym);
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

export function removeLocalWatchlist(symbol: string): void {
  const sym = symbol.trim().toUpperCase();
  try {
    const list = getLocalWatchlist().filter((e) => e.symbol !== sym);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch { /* silent */ }
}

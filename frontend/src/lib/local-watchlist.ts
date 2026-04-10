const KEY = "barakfi_local_watchlist";
const MAX = 50;

export type LocalWatchlistEntry = { symbol: string; addedAt: string };

export function getLocalWatchlist(): LocalWatchlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalWatchlistEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addLocalWatchlist(symbol: string): boolean {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return false;
  try {
    const list = getLocalWatchlist().filter((e) => e.symbol !== sym);
    list.unshift({ symbol: sym, addedAt: new Date().toISOString() });
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

const KEY = "barakfi_local_watchlist";
const MAX = 50;

export type LocalWatchlistEntry = {
  symbol: string;
  name?: string;
  score?: number;
  status?: string;
  addedAt: string;
};

export type AddLocalWatchlistInput = {
  symbol: string;
  name: string;
  score: number;
  status: string;
};

function normalizeEntry(raw: unknown): LocalWatchlistEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const sym = typeof o.symbol === "string" ? o.symbol.trim().toUpperCase() : "";
  if (!sym) return null;
  const addedAt = typeof o.addedAt === "string" ? o.addedAt : new Date().toISOString();
  let score: number | undefined;
  if (typeof o.score === "number" && Number.isFinite(o.score)) score = o.score;
  else if (typeof o.score === "string") {
    const n = Number(o.score);
    if (Number.isFinite(n)) score = n;
  }
  return {
    symbol: sym,
    name: typeof o.name === "string" && o.name.trim() ? o.name.trim() : undefined,
    score,
    status: typeof o.status === "string" && o.status.trim() ? o.status.trim() : undefined,
    addedAt,
  };
}

export function getLocalWatchlist(): LocalWatchlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeEntry).filter((e): e is LocalWatchlistEntry => e != null);
  } catch {
    return [];
  }
}

export function addLocalWatchlist(input: AddLocalWatchlistInput): boolean {
  const sym = input.symbol.trim().toUpperCase();
  if (!sym || !input.name?.trim()) return false;
  try {
    const list = getLocalWatchlist().filter((e) => e.symbol !== sym);
    list.unshift({
      symbol: sym,
      name: input.name.trim(),
      score: Math.max(0, Math.min(100, Math.round(Number(input.score)))),
      status: input.status.trim(),
      addedAt: new Date().toISOString(),
    });
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
  } catch {
    /* silent */
  }
}

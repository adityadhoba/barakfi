const KEY = "barakfi_local_watchlist";
const MAX = 50;

export type LocalWatchlistEntry = {
  symbol: string;
  addedAt: string;
  name?: string;
  score?: number;
  status?: string;
};

type AddInput =
  | string
  | {
      symbol: string;
      name?: string;
      score?: number;
      status?: string;
    };

function normalizeEntry(raw: unknown): LocalWatchlistEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const sym = typeof o.symbol === "string" ? o.symbol.trim().toUpperCase() : "";
  if (!sym) return null;
  const addedAt = typeof o.addedAt === "string" ? o.addedAt : new Date().toISOString();
  const name = typeof o.name === "string" ? o.name : undefined;
  const score = typeof o.score === "number" && Number.isFinite(o.score) ? o.score : undefined;
  const status = typeof o.status === "string" ? o.status : undefined;
  return { symbol: sym, addedAt, name, score, status };
}

export function getLocalWatchlist(): LocalWatchlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: LocalWatchlistEntry[] = [];
    for (const item of parsed) {
      const e = normalizeEntry(item);
      if (e) out.push(e);
    }
    return out;
  } catch {
    return [];
  }
}

export function addLocalWatchlist(input: AddInput): boolean {
  let symbol: string;
  let name: string | undefined;
  let score: number | undefined;
  let status: string | undefined;
  if (typeof input === "string") {
    symbol = input.trim().toUpperCase();
  } else {
    symbol = input.symbol.trim().toUpperCase();
    name = input.name;
    score = input.score;
    status = input.status;
  }
  if (!symbol) return false;
  try {
    const list = getLocalWatchlist().filter((e) => e.symbol !== symbol);
    list.unshift({
      symbol,
      addedAt: new Date().toISOString(),
      ...(name != null && name !== "" ? { name } : {}),
      ...(score != null ? { score } : {}),
      ...(status != null && status !== "" ? { status } : {}),
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

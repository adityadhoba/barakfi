import { getPublicApiBaseUrl, unwrapBackendEnvelope } from "@/lib/api-base";
import type { ScreeningResult, Stock } from "@/lib/api";

export type CheckDiscoveryPick = {
  symbol: string;
  name: string;
  score: number;
  status: "Halal" | "Doubtful" | "Haram";
};

const CACHE_KEY = "barakfi_check_discovery_pool_v1";
const TTL_MS = 5 * 60 * 1000;
const BULK_SYMBOL_CAP = 80;

/** Shown when API is unavailable or returns sparse halal rows */
export const MOCK_CHECK_DISCOVERY: CheckDiscoveryPick[] = [
  { symbol: "INFY", name: "Infosys Ltd", score: 92, status: "Halal" },
  { symbol: "TCS", name: "Tata Consultancy Services", score: 91, status: "Halal" },
  { symbol: "RELIANCE", name: "Reliance Industries", score: 88, status: "Halal" },
  { symbol: "HDFCBANK", name: "HDFC Bank", score: 87, status: "Halal" },
  { symbol: "WIPRO", name: "Wipro Ltd", score: 90, status: "Halal" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", score: 89, status: "Halal" },
];

function productStatus(engine: string): CheckDiscoveryPick["status"] {
  if (engine === "HALAL") return "Halal";
  if (engine === "NON_COMPLIANT") return "Haram";
  return "Doubtful";
}

type CacheShape = { t: number; picks: CheckDiscoveryPick[] };

function readPoolCache(): CheckDiscoveryPick[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { t, picks } = JSON.parse(raw) as CacheShape;
    if (!Array.isArray(picks) || typeof t !== "number") return null;
    if (Date.now() - t > TTL_MS) return null;
    return picks;
  } catch {
    return null;
  }
}

function writePoolCache(picks: CheckDiscoveryPick[]): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), picks } satisfies CacheShape));
  } catch {
    /* quota / private mode */
  }
}

async function fetchStocksBrowser(): Promise<Stock[]> {
  const res = await fetch("/api/stocks", { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as Stock[];
  return Array.isArray(data) ? data : [];
}

async function bulkScreenBrowser(symbols: string[]): Promise<ScreeningResult[]> {
  if (symbols.length === 0) return [];
  const base = getPublicApiBaseUrl();
  const res = await fetch(`${base}/screen/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(symbols),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = unwrapBackendEnvelope<ScreeningResult[]>(await res.json());
  return Array.isArray(data) ? data : [];
}

/**
 * Load a pool of halal picks (cached in sessionStorage ~5m).
 * Uses POST /screen/bulk when possible; does not recompute screening client-side.
 */
export async function loadCheckDiscoveryPool(): Promise<CheckDiscoveryPick[]> {
  const cached = readPoolCache();
  if (cached && cached.length > 0) return cached;

  const stocks = await fetchStocksBrowser();
  const symbols = stocks.map((s) => s.symbol).slice(0, BULK_SYMBOL_CAP);
  const nameBySymbol = new Map(stocks.map((s) => [s.symbol.toUpperCase(), s.name]));

  const screened = symbols.length > 0 ? await bulkScreenBrowser(symbols) : [];
  const halal = screened
    .filter((r) => r.status === "HALAL")
    .map((r) => ({
      symbol: r.symbol,
      name: nameBySymbol.get(r.symbol.toUpperCase()) ?? r.name ?? r.symbol,
      score: r.screening_score,
      status: productStatus(r.status),
    }))
    .sort((a, b) => b.score - a.score);

  const pool = halal.length >= 3 ? halal : MOCK_CHECK_DISCOVERY;
  writePoolCache(pool);
  return pool;
}

/** 3–5 picks for the check page, excluding the symbol being viewed; pads with mock if needed */
export function selectCheckDiscoveryPicks(
  pool: CheckDiscoveryPick[],
  excludeSymbol: string,
  opts?: { min?: number; max?: number },
): CheckDiscoveryPick[] {
  const min = opts?.min ?? 3;
  const max = opts?.max ?? 5;
  const ex = excludeSymbol.trim().toUpperCase();

  const seen = new Set<string>();
  const out: CheckDiscoveryPick[] = [];

  for (const p of pool) {
    const sym = p.symbol.toUpperCase();
    if (sym === ex || seen.has(sym)) continue;
    seen.add(sym);
    out.push(p);
    if (out.length >= max) break;
  }

  for (const m of MOCK_CHECK_DISCOVERY) {
    if (out.length >= min) break;
    const sym = m.symbol.toUpperCase();
    if (sym === ex || seen.has(sym)) continue;
    seen.add(sym);
    out.push(m);
  }

  return out.slice(0, max);
}

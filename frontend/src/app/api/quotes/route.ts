import { NextRequest, NextResponse } from "next/server";
import { getPublicApiBaseUrl, unwrapBackendEnvelope } from "@/lib/api-base";

/**
 * Batch quotes — optional exchange per symbol via pairs=SYM:EXC,SYM2:EXC2
 */

const API_BASE = getPublicApiBaseUrl();
const LIVE_QUOTES_ENABLED = process.env.LIVE_QUOTES_ENABLED === "true";

type QuoteResult = {
  symbol: string;
  last_price: number | null;
  change: number | null;
  change_percent: number | null;
};

type QuoteCacheEntry = {
  expiresAt: number;
  value: QuoteResult;
};

const QUOTE_CACHE_TTL_MS = 120_000;
const quoteCache = new Map<string, QuoteCacheEntry>();

function pruneQuoteCache(now: number) {
  if (quoteCache.size < 1200) return;
  for (const [k, v] of quoteCache.entries()) {
    if (v.expiresAt <= now) quoteCache.delete(k);
  }
  if (quoteCache.size > 2000) {
    quoteCache.clear();
  }
}

function providerForExchange(ex: string): string {
  const u = ex.toUpperCase();
  if (u === "US" || u === "NYSE" || u === "NASDAQ") return "yahoo_global";
  if (u === "LSE" || u === "LON") return "yahoo_global";
  // Avoid hammering NSE public endpoints for routine UI refreshes.
  // Use Yahoo for Indian quotes by default; NSE can still be requested explicitly
  // by backend/admin jobs when needed.
  return "yahoo_india";
}

export async function GET(request: NextRequest) {
  if (!LIVE_QUOTES_ENABLED) {
    return NextResponse.json(
      { quotes: [] },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  }

  const sp = request.nextUrl.searchParams;
  const pairsParam = sp.get("pairs") || "";
  const symbolsParam = sp.get("symbols") || "";

  type Item = { symbol: string; exchange: string };
  let items: Item[] = [];

  if (pairsParam) {
    items = pairsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20)
      .map((pair) => {
        const idx = pair.indexOf(":");
        if (idx === -1) return { symbol: pair.toUpperCase(), exchange: "NSE" };
        return {
          symbol: pair.slice(0, idx).trim().toUpperCase(),
          exchange: pair.slice(idx + 1).trim() || "NSE",
        };
      });
  } else {
    items = symbolsParam
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 20)
      .map((symbol) => ({ symbol, exchange: "NSE" }));
  }

  if (items.length === 0) {
    return NextResponse.json({ quotes: [] });
  }

  const quotes: QuoteResult[] = [];
  const CONCURRENCY = 4;

async function loadOne(symbol: string, exchange: string): Promise<QuoteResult> {
    const cacheKey = `${symbol}:${exchange.toUpperCase()}`;
    const now = Date.now();
    pruneQuoteCache(now);
    const cached = quoteCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const provider = providerForExchange(exchange);
    try {
      const res = await fetch(
        `${API_BASE}/market-data/quote/${encodeURIComponent(symbol)}?provider=${provider}&exchange=${encodeURIComponent(exchange)}`,
        // Keep short provider cache to reduce upstream fan-out under repeated UI refreshes.
        { next: { revalidate: 60 } },
      );
      if (!res.ok) return { symbol, last_price: null, change: null, change_percent: null };
      const data = unwrapBackendEnvelope<{
        last_price?: number | null;
        change?: number | null;
        change_percent?: number | null;
      }>(await res.json());
      const value = {
        symbol,
        last_price: data.last_price ?? null,
        change: data.change ?? null,
        change_percent: data.change_percent ?? null,
      };
      quoteCache.set(cacheKey, { value, expiresAt: now + QUOTE_CACHE_TTL_MS });
      return value;
    } catch {
      return { symbol, last_price: null, change: null, change_percent: null };
    }
  }

  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      const item = items[idx];
      quotes.push(await loadOne(item.symbol, item.exchange));
    }
  });

  await Promise.allSettled(workers);

  return NextResponse.json(
    { quotes },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}

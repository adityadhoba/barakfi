import { NextRequest, NextResponse } from "next/server";

/**
 * Batch quotes — optional exchange per symbol via pairs=SYM:EXC,SYM2:EXC2
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8001/api";

type QuoteResult = {
  symbol: string;
  last_price: number | null;
  change: number | null;
  change_percent: number | null;
};

function providerForExchange(ex: string): string {
  const u = ex.toUpperCase();
  if (u === "US" || u === "NYSE" || u === "NASDAQ") return "yahoo_global";
  if (u === "LSE" || u === "LON") return "yahoo_global";
  return "auto_india";
}

export async function GET(request: NextRequest) {
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

  const results = await Promise.allSettled(
    items.map(async ({ symbol, exchange }) => {
      const provider = providerForExchange(exchange);
      try {
        const res = await fetch(
          `${API_BASE}/market-data/quote/${encodeURIComponent(symbol)}?provider=${provider}&exchange=${encodeURIComponent(exchange)}`,
          { next: { revalidate: 120 } },
        );
        if (!res.ok) return { symbol, last_price: null, change: null, change_percent: null };
        const data = await res.json();
        return {
          symbol,
          last_price: data.last_price ?? null,
          change: data.change ?? null,
          change_percent: data.change_percent ?? null,
        };
      } catch {
        return { symbol, last_price: null, change: null, change_percent: null };
      }
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      quotes.push(result.value);
    }
  }

  return NextResponse.json(
    { quotes },
    {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    },
  );
}

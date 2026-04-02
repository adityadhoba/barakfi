import { NextRequest, NextResponse } from "next/server";

/**
 * Batch quote endpoint — returns price changes for multiple symbols at once.
 * Used by the screener to show price change indicators without N+1 API calls.
 *
 * GET /api/quotes?symbols=RELIANCE,TCS,INFY&provider=auto_india
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8001/api";

type QuoteResult = {
  symbol: string;
  last_price: number | null;
  change: number | null;
  change_percent: number | null;
};

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get("symbols") || "";
  const provider = request.nextUrl.searchParams.get("provider") || "auto_india";

  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 20); // Limit to 20 symbols per request

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: [] });
  }

  const quotes: QuoteResult[] = [];

  // Fetch quotes in parallel (max 20)
  const results = await Promise.allSettled(
    symbols.map(async (symbol) => {
      try {
        const res = await fetch(
          `${API_BASE}/market-data/quote/${encodeURIComponent(symbol)}?provider=${provider}`,
          { next: { revalidate: 120 } }, // Cache 2 minutes
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

  return NextResponse.json({ quotes }, {
    headers: {
      "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
    },
  });
}

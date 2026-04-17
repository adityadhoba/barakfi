import { NextRequest, NextResponse } from "next/server";
import { yahooFinanceBaseCandidates } from "@/lib/yahoo-symbol-aliases";

/**
 * Proxy for Yahoo Finance chart data.
 * Returns OHLC candle data for lightweight-charts.
 *
 * GET /api/chart/RELIANCE?range=6mo&interval=1d
 */

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; Barakfi/1.0)",
};

type YahooResult = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }>;
  };
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const searchParams = request.nextUrl.searchParams;
  const range = searchParams.get("range") || "6mo";
  const interval = searchParams.get("interval") || "1d";
  const exchange = (searchParams.get("exchange") || "").toUpperCase();

  const suffixes: string[] = (() => {
    // If the DB already stores Yahoo-style suffixes (e.g. "AZN.L"), allow direct usage.
    if (symbol.includes(".")) return [""];

    if (exchange === "US" || exchange === "NYSE" || exchange === "NASDAQ") return [""];
    if (exchange === "LSE") return [".L"];
    if (exchange === "BSE") return [".BO"];
    if (exchange === "NSE") return [".NS"];

    // Fallback: India first, then global suffixes.
    return [".NS", ".BO", ".L", ""];
  })();

  const yahooSlugs: string[] = (() => {
    if (symbol.includes(".")) return [symbol];
    const bases =
      exchange === "US" || exchange === "NYSE" || exchange === "NASDAQ" || exchange === "LSE"
        ? [symbol]
        : yahooFinanceBaseCandidates(symbol);
    const out: string[] = [];
    for (const suffix of suffixes) {
      for (const base of bases) {
        out.push(`${base}${suffix}`);
      }
    }
    return out;
  })();

  for (const yslug of yahooSlugs) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yslug)}?range=${range}&interval=${interval}&includePrePost=false`;
      const res = await fetch(url, {
        headers: YAHOO_HEADERS,
        next: { revalidate: 300 }, // Cache 5 min
      });

      if (!res.ok) continue;

      const data = (await res.json()) as YahooResult;
      const result = data?.chart?.result?.[0];
      if (!result?.timestamp) continue;

      const timestamps = result.timestamp;
      const quote = result.indicators?.quote?.[0];
      if (!quote) continue;

      // Build candle array for lightweight-charts
      const candles = [];
      for (let i = 0; i < timestamps.length; i++) {
        const o = quote.open?.[i];
        const h = quote.high?.[i];
        const l = quote.low?.[i];
        const c = quote.close?.[i];
        if (o == null || h == null || l == null || c == null) continue;
        candles.push({
          time: timestamps[i], // Unix timestamp
          open: Math.round(o * 100) / 100,
          high: Math.round(h * 100) / 100,
          low: Math.round(l * 100) / 100,
          close: Math.round(c * 100) / 100,
        });
      }

      if (candles.length === 0) continue;

      const inferredEx =
        exchange ||
        (yslug.endsWith(".NS") ? "NSE" : yslug.endsWith(".BO") ? "BSE" : yslug.endsWith(".L") ? "LSE" : "US");

      return NextResponse.json({
        symbol,
        exchange: inferredEx,
        range,
        interval,
        candles,
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ symbol, candles: [] }, { status: 200 });
}

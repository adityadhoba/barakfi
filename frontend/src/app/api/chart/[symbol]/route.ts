import { NextRequest, NextResponse } from "next/server";
import { yahooFinanceBaseCandidates } from "@/lib/yahoo-symbol-aliases";

/**
 * Chart data proxy.
 *
 * Primary source: NSE Bhavcopy via backend GET /stocks/{symbol}/chart
 *   — official data, no ToS concerns for commercial use.
 *
 * Fallback: Yahoo Finance proxy (for symbols not yet ingested via bhavcopy,
 *   e.g. stocks newly seeded but with no price history yet).
 *
 * GET /api/chart/RELIANCE?range=6mo&interval=1d
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:8000";

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; Barakfi/1.0)",
};

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type BackendChartResponse = {
  symbol: string;
  exchange: string;
  range: string;
  candles: Candle[];
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

async function fetchFromBackend(
  symbol: string,
  exchange: string,
  range: string,
): Promise<Candle[] | null> {
  try {
    const exch = exchange || "NSE";
    const url = `${API_BASE}/stocks/${encodeURIComponent(symbol)}/chart?range=${range}&exchange=${exch}`;
    const res = await fetch(url, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as BackendChartResponse;
    if (!data.candles || data.candles.length === 0) return null;
    return data.candles;
  } catch {
    return null;
  }
}

async function fetchFromYahoo(
  symbol: string,
  exchange: string,
  range: string,
  interval: string,
): Promise<{ candles: Candle[]; inferredExchange: string } | null> {
  const suffixes: string[] = (() => {
    if (symbol.includes(".")) return [""];
    if (exchange === "US" || exchange === "NYSE" || exchange === "NASDAQ") return [""];
    if (exchange === "LSE") return [".L"];
    if (exchange === "BSE") return [".BO"];
    if (exchange === "NSE") return [".NS"];
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
        next: { revalidate: 300 },
      });
      if (!res.ok) continue;

      const data = (await res.json()) as YahooResult;
      const result = data?.chart?.result?.[0];
      if (!result?.timestamp) continue;

      const timestamps = result.timestamp;
      const quote = result.indicators?.quote?.[0];
      if (!quote) continue;

      const candles: Candle[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        const o = quote.open?.[i];
        const h = quote.high?.[i];
        const l = quote.low?.[i];
        const c = quote.close?.[i];
        if (o == null || h == null || l == null || c == null) continue;
        candles.push({
          time: timestamps[i],
          open: Math.round(o * 100) / 100,
          high: Math.round(h * 100) / 100,
          low: Math.round(l * 100) / 100,
          close: Math.round(c * 100) / 100,
        });
      }

      if (candles.length === 0) continue;

      const inferredExchange =
        exchange ||
        (yslug.endsWith(".NS") ? "NSE" : yslug.endsWith(".BO") ? "BSE" : yslug.endsWith(".L") ? "LSE" : "US");

      return { candles, inferredExchange };
    } catch {
      continue;
    }
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const searchParams = request.nextUrl.searchParams;
  const range = searchParams.get("range") || "6mo";
  const interval = searchParams.get("interval") || "1d";
  const exchange = (searchParams.get("exchange") || "NSE").toUpperCase();

  // 1. Try NSE Bhavcopy data from backend (primary, commercial-safe)
  const backendCandles = await fetchFromBackend(symbol, exchange, range);
  if (backendCandles && backendCandles.length > 0) {
    return NextResponse.json({
      symbol,
      exchange,
      range,
      interval,
      candles: backendCandles,
      source: "nse_bhavcopy",
    });
  }

  // 2. Fallback to Yahoo Finance for symbols not yet in MarketPriceDaily
  const yahooResult = await fetchFromYahoo(symbol, exchange, range, interval);
  if (yahooResult) {
    return NextResponse.json({
      symbol,
      exchange: yahooResult.inferredExchange,
      range,
      interval,
      candles: yahooResult.candles,
      source: "yahoo_fallback",
    });
  }

  return NextResponse.json({ symbol, candles: [] }, { status: 200 });
}

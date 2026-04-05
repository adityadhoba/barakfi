"use client";

import { useEffect, useState } from "react";

type QuoteMap = Record<string, {
  last_price: number | null;
  change: number | null;
  change_percent: number | null;
}>;

/**
 * Batch quotes for symbols. Pass optional exchange per symbol (NSE, US, LSE, …) for correct FX.
 */
export function useBatchQuotes(symbols: string[], exchangeBySymbol?: Record<string, string>): QuoteMap {
  const [quotes, setQuotes] = useState<QuoteMap>({});

  useEffect(() => {
    if (symbols.length === 0) return;

    let cancelled = false;

    async function fetchBatch() {
      const batches: string[][] = [];
      for (let i = 0; i < symbols.length; i += 20) {
        batches.push(symbols.slice(i, i + 20));
      }

      const allQuotes: QuoteMap = {};

      for (const batch of batches) {
        if (cancelled) break;
        try {
          const pairs = batch
            .map((sym) => {
              const ex = exchangeBySymbol?.[sym] || "NSE";
              return `${sym}:${ex}`;
            })
            .join(",");
          const res = await fetch(`/api/quotes?pairs=${encodeURIComponent(pairs)}`);
          if (!res.ok) continue;
          const data = await res.json();
          for (const q of data.quotes || []) {
            allQuotes[q.symbol] = {
              last_price: q.last_price,
              change: q.change,
              change_percent: q.change_percent,
            };
          }
        } catch {
          // Skip failed batches
        }
      }

      if (!cancelled) {
        setQuotes(allQuotes);
      }
    }

    fetchBatch();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(","), exchangeBySymbol ? JSON.stringify(exchangeBySymbol) : ""]);

  return quotes;
}

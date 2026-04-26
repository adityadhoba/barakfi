"use client";

import { useEffect, useRef, useState } from "react";

type QuoteMap = Record<string, {
  last_price: number | null;
  change: number | null;
  change_percent: number | null;
}>;

const DEFAULT_REFRESH_MS = 60_000;
const BATCH_SIZE = 20;
const MAX_PARALLEL_BATCHES = 4;

/**
 * Batch quotes for symbols. Pass optional exchange per symbol (NSE, US, LSE, …) for correct FX.
 * Refreshes on an interval so list prices stay aligned with Yahoo chart snapshots (same source as /api/chart).
 */
export function useBatchQuotes(
  symbols: string[],
  exchangeBySymbol?: Record<string, string>,
  refreshMs: number = DEFAULT_REFRESH_MS,
): QuoteMap {
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const exchangeRef = useRef(exchangeBySymbol);
  exchangeRef.current = exchangeBySymbol;

  useEffect(() => {
    if (symbols.length === 0) return;

    let cancelled = false;

    async function fetchBatch() {
      const batches: string[][] = [];
      for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
        batches.push(symbols.slice(i, i + BATCH_SIZE));
      }

      const allQuotes: QuoteMap = {};

      const fetchOneBatch = async (batch: string[]) => {
        if (cancelled) return;
        try {
          const pairs = batch
            .map((sym) => {
              const ex = exchangeRef.current?.[sym] || "NSE";
              return `${sym}:${ex}`;
            })
            .join(",");
          const res = await fetch(`/api/quotes?pairs=${encodeURIComponent(pairs)}`, { cache: "no-store" });
          if (!res.ok) return;
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
      };

      // Run quote batches in parallel with a small cap to avoid flooding backend/serverless.
      let cursor = 0;
      const workers = Array.from(
        { length: Math.min(MAX_PARALLEL_BATCHES, batches.length) },
        async () => {
          while (!cancelled) {
            const idx = cursor++;
            if (idx >= batches.length) return;
            await fetchOneBatch(batches[idx]);
          }
        },
      );

      await Promise.allSettled(workers);
      if (cancelled) {
        return;
      }

      if (!cancelled && Object.keys(allQuotes).length > 0) {
        setQuotes((prev) => ({ ...prev, ...allQuotes }));
      }
    }

    void fetchBatch();
    const id =
      refreshMs > 0
        ? window.setInterval(() => {
            void fetchBatch();
          }, refreshMs)
        : null;
    return () => {
      cancelled = true;
      if (id != null) window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(","), exchangeBySymbol ? JSON.stringify(exchangeBySymbol) : "", refreshMs]);

  return quotes;
}

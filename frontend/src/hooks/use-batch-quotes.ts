"use client";

import { useEffect, useState } from "react";

type QuoteMap = Record<string, {
  last_price: number | null;
  change: number | null;
  change_percent: number | null;
}>;

/**
 * Fetches batch quotes for a list of symbols.
 * Batches into groups of 20 to avoid overloading.
 */
export function useBatchQuotes(symbols: string[]): QuoteMap {
  const [quotes, setQuotes] = useState<QuoteMap>({});

  useEffect(() => {
    if (symbols.length === 0) return;

    let cancelled = false;

    async function fetchBatch() {
      // Split into batches of 20
      const batches: string[][] = [];
      for (let i = 0; i < symbols.length; i += 20) {
        batches.push(symbols.slice(i, i + 20));
      }

      const allQuotes: QuoteMap = {};

      for (const batch of batches) {
        if (cancelled) break;
        try {
          const res = await fetch(`/api/quotes?symbols=${batch.join(",")}`);
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
    // Only re-fetch when the symbol list changes (by join comparison)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(",")]);

  return quotes;
}

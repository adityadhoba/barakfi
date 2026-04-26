"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ScreeningResult, Stock } from "@/lib/api";
import { StockScreenerTable } from "@/components/stock-screener-table";

type ScreenedStock = Stock & { screening: ScreeningResult };

const PAGE_LIMIT = 100;

interface Props {
  initialStocks: ScreenedStock[];
  totalInitial: number;
}

/**
 * Wraps StockScreenerTable with server-side infinite scroll pagination.
 *
 * - Renders the first batch (initialStocks) immediately.
 * - Uses an IntersectionObserver at the bottom sentinel to detect when the user
 *   has scrolled near the end of the current list, then fetches the next page
 *   of stocks + their screening results from the API.
 * - Continues until no more pages are available.
 */
export function ScreenerInfiniteLoader({ initialStocks, totalInitial }: Props) {
  const [stocks, setStocks] = useState<ScreenedStock[]>(initialStocks);
  const [offset, setOffset] = useState(totalInitial);
  const [hasMore, setHasMore] = useState(totalInitial >= PAGE_LIMIT);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      // Fetch next page of stocks from backend
      const stocksRes = await fetch(
        `/api/stocks-page?offset=${offset}&limit=${PAGE_LIMIT}`,
        { next: { revalidate: 300 } } as RequestInit,
      );
      if (!stocksRes.ok) {
        setHasMore(false);
        return;
      }
      const newStocks: Stock[] = await stocksRes.json();
      if (newStocks.length === 0) {
        setHasMore(false);
        return;
      }

      // Fetch screening results for this batch
      const symbols = newStocks.map((s) => s.symbol);
      const screenRes = await fetch(
        `/api/screen-bulk?symbols=${symbols.join(",")}`,
      );
      const screeningResults: ScreeningResult[] = screenRes.ok
        ? await screenRes.json()
        : [];
      const screenMap = new Map(screeningResults.map((r) => [r.symbol, r]));

      const screened = newStocks
        .map((s) => {
          const screening = screenMap.get(s.symbol);
          if (!screening) return null;
          return { ...s, screening } as ScreenedStock;
        })
        .filter((s): s is ScreenedStock => s != null);

      setStocks((prev) => {
        const existingSymbols = new Set(prev.map((s) => s.symbol));
        const newUnique = screened.filter((s) => !existingSymbols.has(s.symbol));
        return [...prev, ...newUnique];
      });
      setOffset((prev) => prev + newStocks.length);
      if (newStocks.length < PAGE_LIMIT) {
        setHasMore(false);
      }
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, offset]);

  // Observe the sentinel div — when it enters the viewport, load next page
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          void loadMore();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  return (
    <>
      <StockScreenerTable screenedStocks={stocks} />
      {/* Sentinel element — triggers next page load when scrolled into view */}
      <div ref={sentinelRef} style={{ height: 1 }} aria-hidden />
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "16px",
            color: "var(--text-tertiary)",
            fontSize: "0.82rem",
          }}
        >
          Loading more stocks&hellip;
        </div>
      )}
    </>
  );
}

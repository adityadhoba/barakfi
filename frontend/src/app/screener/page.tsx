import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import styles from "@/app/screener.module.css";
import { getScreenerSnapshot, getStocks, getBulkScreeningResults } from "@/lib/api";
import { StockScreenerTable } from "@/components/stock-screener-table";
import { ScreenerSkeleton } from "@/components/screener-skeleton";
import { ScreenerWarmingUp } from "@/components/screener-warming-up";

// ISR: revalidate every 10 minutes. Next.js serves the cached page instantly
// from the CDN edge; a background re-render is triggered after 600 s.
// getScreenerSnapshot() throws on 503 (cold backend), which causes ISR to
// skip caching and retry on the next request instead of persisting stale data.
export const revalidate = 600;

export const metadata: Metadata = {
  title: "Shariah Stock Screener — Barakfi",
  description:
    "Screen NSE-listed Indian equities for Shariah-style compliance: filter by sector and compliance status, sort by market cap and financial ratios, and open any symbol for a full ratio breakdown. Free educational screener with transparent methodology and research context.",
  alternates: { canonical: "/screener" },
  robots: { index: true, follow: true },
};

export default function ScreenerPage() {
  return (
    <main className={styles.screenerPage}>
      <nav className={styles.screenerLearnLinks} aria-label="Learn and lists">
        <Link href="/learn/halal-stocks-india">Halal stocks in India — guide</Link>
        <span aria-hidden="true">·</span>
        <Link href="/learn/what-is-halal-investing">What is halal investing?</Link>
        <span aria-hidden="true">·</span>
        <Link href="/halal-stocks">Curated halal list</Link>
      </nav>
      <Suspense fallback={<ScreenerSkeleton />}>
        <ScreenerDataLayer />
      </Suspense>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Try the fast GET /screener/snapshot (pre-computed, CDN-cacheable).
// If the backend hasn't deployed that endpoint yet (404) or the screening
// cache is cold, fall back to the original two-call approach so users always
// see the screener — never the error page — during backend transitions.
// ---------------------------------------------------------------------------
async function ScreenerDataLayer() {
  const validStocks = await loadScreenerStocks();
  // When backend is cold/unavailable, return the warming-up component instead
  // of throwing. This lets ISR builds succeed and ensures a graceful retry UX.
  if (validStocks.length === 0) {
    return <ScreenerWarmingUp />;
  }
  return <StockScreenerTable screenedStocks={validStocks} />;
}

async function loadScreenerStocks() {
  // ── Fast path: single GET, cached by Next.js Data Cache + CDN ────────────
  try {
    const entries = await getScreenerSnapshot();
    const mapped = entries.map(({ stock, screening }) => ({ ...stock, screening }));
    if (mapped.length > 0) return mapped;
  } catch {
    // Snapshot endpoint not yet deployed or cache cold — fall through to legacy.
  }

  // ── Legacy fallback: GET /stocks + POST /screen/bulk ─────────────────────
  try {
    const stocks = (
      await getStocks({ limit: 1000, orderBy: "market_cap_desc", revalidateSeconds: 600 })
    ).filter((s) => s.exchange === "NSE");

    if (stocks.length === 0) return [];

    const screeningResults = await getBulkScreeningResults(stocks.map((s) => s.symbol));
    const screeningMap = new Map(screeningResults.map((r) => [r.symbol, r]));

    const validStocks = stocks
      .map((stock) => {
        const screening = screeningMap.get(stock.symbol);
        if (!screening) return null;
        return { ...stock, screening };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    return validStocks;
  } catch {
    // Backend unavailable (e.g. cold start or rate-limited during build).
    // Return empty — ScreenerDataLayer will throw to trigger the warming-up UI.
    return [];
  }
}

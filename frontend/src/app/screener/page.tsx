import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import styles from "@/app/screener.module.css";
import { getScreenerSnapshot, getStocks, getBulkScreeningResults } from "@/lib/api";
import { StockScreenerTable } from "@/components/stock-screener-table";
import { ScreenerSkeleton } from "@/components/screener-skeleton";

// Use force-dynamic so Next.js does not attempt to prerender this page at
// build time (the backend /screener/snapshot endpoint may not exist yet when
// the frontend deploys). Data caching is handled by next: { revalidate: 300 }
// inside getScreenerSnapshot(), so each render is still fast (cached fetch).
export const dynamic = "force-dynamic";

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
  return <StockScreenerTable screenedStocks={validStocks} />;
}

async function loadScreenerStocks() {
  // ── Fast path: single GET, cached by CDN ─────────────────────────────────
  try {
    const entries = await getScreenerSnapshot();
    return entries.map(({ stock, screening }) => ({ ...stock, screening }));
  } catch {
    // Snapshot endpoint not yet deployed or cache cold — fall through to legacy.
  }

  // ── Legacy fallback: GET /stocks + POST /screen/bulk ─────────────────────
  const stocks = (
    await getStocks({ limit: 1000, orderBy: "market_cap_desc", revalidateSeconds: 300 })
  ).filter((s) => s.exchange === "NSE");

  if (stocks.length === 0) {
    throw new Error("No stocks returned from backend");
  }

  const screeningResults = await getBulkScreeningResults(stocks.map((s) => s.symbol));
  const screeningMap = new Map(screeningResults.map((r) => [r.symbol, r]));

  const validStocks = stocks
    .map((stock) => {
      const screening = screeningMap.get(stock.symbol);
      if (!screening) return null;
      return { ...stock, screening };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  if (validStocks.length === 0) {
    throw new Error("Screening results empty — backend may be warming up");
  }

  return validStocks;
}

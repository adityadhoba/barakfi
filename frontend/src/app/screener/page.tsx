import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import styles from "@/app/screener.module.css";
import { getStocks, getBulkScreeningResults } from "@/lib/api";
import { ScreenerInfiniteLoader } from "@/components/screener-infinite-loader";
import { ScreenerSkeleton } from "@/components/screener-skeleton";

// ISR: page segment cache — revalidated on-demand by the pipeline via
// POST /api/revalidate-screener, or automatically every 5 minutes.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Shariah Stock Screener — Barakfi",
  description:
    "Screen NSE-listed Indian equities for Shariah-style compliance: filter by sector and compliance status, sort by market cap and financial ratios, and open any symbol for a full ratio breakdown. Free educational screener with transparent methodology and research context.",
  alternates: { canonical: "/screener" },
  robots: { index: true, follow: true },
};

// ---------------------------------------------------------------------------
// Page shell — rendered instantly from ISR CDN edge on every visit.
// ScreenerDataLayer is wrapped in Suspense so the shell (navbar + learn links)
// is sent to the browser immediately while the API calls stream in.
// ---------------------------------------------------------------------------
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
// Data layer — async Server Component that fetches stocks + screening.
// Suspends until both API calls resolve; the skeleton above is shown until
// this streams into the page. Uses Data Cache (revalidateSeconds: 300) so
// the upstream Render API is hit at most once per 5 minutes, not on every
// ISR revalidation or every user visit.
// ---------------------------------------------------------------------------
async function ScreenerDataLayer() {
  const INITIAL_LIMIT = 100;

  const stocks = (
    await getStocks({ limit: INITIAL_LIMIT, orderBy: "market_cap_desc", revalidateSeconds: 300 })
  ).filter((stock) => stock.exchange === "NSE");

  const symbols = stocks.map((s) => s.symbol);
  const screeningResults = await getBulkScreeningResults(symbols);
  const screeningMap = new Map(screeningResults.map((r) => [r.symbol, r]));

  const validStocks = stocks
    .map((stock) => {
      const screening = screeningMap.get(stock.symbol);
      if (!screening) return null;
      return { ...stock, screening };
    })
    .filter((s): s is NonNullable<typeof s> => s != null);

  return (
    <ScreenerInfiniteLoader
      initialStocks={validStocks}
      totalInitial={validStocks.length}
    />
  );
}

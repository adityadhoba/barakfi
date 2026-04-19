import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import styles from "@/app/screener.module.css";
import { getStocks, getBulkScreeningResults } from "@/lib/api";
import { ScreenerInfiniteLoader } from "@/components/screener-infinite-loader";

// Revalidate every 5 minutes so the screener page is not force-dynamic.
// ISR means the first 100 stocks are served from CDN, not re-rendered on
// every request — critical for performance at 500 stocks.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Shariah Stock Screener — Barakfi",
  description:
    "Screen NSE-listed Indian equities for Shariah-style compliance: filter by sector and compliance status, sort by market cap and financial ratios, and open any symbol for a full ratio breakdown. Free educational screener with transparent methodology and research context.",
  alternates: { canonical: "/screener" },
  robots: { index: true, follow: true },
};

const INITIAL_LIMIT = 100;

export default async function ScreenerPage() {
  // Load only the first 100 stocks server-side (ordered by market cap so the
  // most important stocks are visible immediately).  The ScreenerInfiniteLoader
  // will lazily fetch the remaining pages as the user scrolls.
  const stocks = (
    await getStocks({ limit: INITIAL_LIMIT, orderBy: "market_cap_desc" })
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
    <main className={styles.screenerPage}>
      <nav className={styles.screenerLearnLinks} aria-label="Learn and lists">
        <Link href="/learn/halal-stocks-india">Halal stocks in India — guide</Link>
        <span aria-hidden="true">·</span>
        <Link href="/learn/what-is-halal-investing">What is halal investing?</Link>
        <span aria-hidden="true">·</span>
        <Link href="/halal-stocks">Curated halal list</Link>
      </nav>
      <Suspense fallback={<div className={styles.screenerFallback}>Loading screener&hellip;</div>}>
        <ScreenerInfiniteLoader
          initialStocks={validStocks}
          totalInitial={validStocks.length}
        />
      </Suspense>
    </main>
  );
}

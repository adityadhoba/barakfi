import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import styles from "@/app/screener.module.css";
import { getStocks, getBulkScreeningResults } from "@/lib/api";
import { StockScreenerTable } from "@/components/stock-screener-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shariah Stock Screener — Barakfi",
  description:
    "Screen NSE and BSE-listed Indian equities for Shariah-style compliance: filter by sector and halal status, sort by market cap and financial ratios, and open any symbol for a full ratio breakdown. Free educational screener — pair with our learn guides and methodology pages before investing.",
  robots: { index: true, follow: true },
};

export default async function ScreenerPage() {
  const stocks = await getStocks();
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
        <StockScreenerTable screenedStocks={validStocks} />
      </Suspense>
    </main>
  );
}

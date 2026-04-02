import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import styles from "@/app/screener.module.css";
import { getStocks, getBulkScreeningResults } from "@/lib/api";
import { MarketOverview } from "@/components/market-overview";
import { MarketStatus } from "@/components/market-status";
import { StockScreenerTable } from "@/components/stock-screener-table";
import { ScreenerDataNote } from "@/components/screener-data-note";
import { AdUnit } from "@/components/ad-unit";

export const metadata: Metadata = {
  title: "Shariah Stock Screener — Barakfi",
  description:
    "Screen Indian stocks for Shariah compliance. Filter by sector, sort by financial ratios, and find halal investment opportunities in the Indian equity market.",
};

export default async function ScreenerPage() {
  const stocks = await getStocks();

  // Single bulk request instead of N individual calls
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
      <div className={styles.screenerContainer}>
        <header className={styles.screenerHeader}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.pageTitle}>Stock Screener</h1>
              <p className={styles.pageDesc}>
                Screen {validStocks.length} Indian stocks for Shariah compliance. Filter, sort, and research.
                {" · "}
                <Link href="/methodology" className={styles.methodologyLink}>How screening works</Link>
              </p>
            </div>
            <MarketStatus />
          </div>
          <ScreenerDataNote />
        </header>

        <MarketOverview screenedStocks={validStocks} />

        {/* Ad: above screener table */}
        <AdUnit format="banner" />

        <Suspense fallback={<div className={styles.screenerTableFallback}>Loading screener&hellip;</div>}>
          <StockScreenerTable screenedStocks={validStocks} />
        </Suspense>
      </div>
    </main>
  );
}

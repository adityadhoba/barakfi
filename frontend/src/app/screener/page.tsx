import type { Metadata } from "next";
import { Suspense } from "react";
import styles from "@/app/screener.module.css";
import { getStocks, getBulkScreeningResults } from "@/lib/api";
import { StockScreenerTable } from "@/components/stock-screener-table";
import { ManualScreenSearch } from "@/components/manual-screen-search";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shariah Stock Screener — Barakfi",
  description:
    "Screen Indian stocks for Shariah compliance. Filter by sector, sort by financial ratios, and find halal investment opportunities in the Indian equity market.",
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
      <div className={styles.screenerContainer}>
        <div className={styles.manualScreenSection}>
          <h2 className={styles.manualScreenTitle}>Screen Any Stock</h2>
          <p className={styles.manualScreenDesc}>
            Enter any NSE stock symbol to instantly screen it for Shariah compliance using S&amp;P, AAOIFI, and FTSE methodologies.
          </p>
          <ManualScreenSearch />
        </div>
      </div>
      <Suspense fallback={<div className={styles.screenerFallback}>Loading screener&hellip;</div>}>
        <StockScreenerTable screenedStocks={validStocks} />
      </Suspense>
    </main>
  );
}

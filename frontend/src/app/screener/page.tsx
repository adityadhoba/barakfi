import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import styles from "@/app/screener.module.css";
import { getStocks, getBulkScreeningResults } from "@/lib/api";
import { StockScreenerTable } from "@/components/stock-screener-table";

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
      <Suspense fallback={<div className={styles.screenerFallback}>Loading screener&hellip;</div>}>
        <StockScreenerTable screenedStocks={validStocks} />
      </Suspense>
    </main>
  );
}

import type { Metadata } from "next";
import { getStocks, getBulkScreeningResults } from "@/lib/api";
import { CompareTable } from "@/components/compare-table";
import styles from "@/app/screener.module.css";

export const metadata: Metadata = {
  title: "Compare Stocks — Barakfi",
  description:
    "Compare Shariah compliance ratios, financials, and screening status side by side for Indian stocks.",
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ symbols?: string }>;
}) {
  const { symbols: rawSymbols } = await searchParams;
  const stocks = await getStocks();

  const requestedSymbols = rawSymbols
    ? rawSymbols
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 4)
    : [];

  // Fetch screening results in bulk for all requested symbols
  const screeningResults = await getBulkScreeningResults(requestedSymbols);
  const screeningMap = new Map(screeningResults.map((sr) => [sr.symbol, sr]));

  const compareStocks = requestedSymbols
    .map((symbol) => {
      const stock = stocks.find((s) => s.symbol === symbol);
      if (!stock) return null;
      const screening = screeningMap.get(symbol);
      if (!screening) return null;
      return { ...stock, screening };
    })
    .filter((s): s is NonNullable<typeof s> => s != null);

  const validStocks = compareStocks;

  return (
    <main className={styles.screenerPage}>
      <div className={styles.screenerContainer}>
        <header className={styles.screenerHeader}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.pageTitle}>Compare Stocks</h1>
              <p className={styles.pageDesc}>
                Compare Shariah compliance, ratios, and financials side by side. Add up to 4 stocks.
              </p>
            </div>
          </div>
        </header>

        <CompareTable
          compareStocks={validStocks}
          allStocks={stocks}
        />
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { getStocks } from "@/lib/api";
import { CompareTable } from "@/components/compare-table";
import styles from "@/app/screener.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compare Stocks — Barakfi",
  description:
    "Compare Shariah compliance ratios, financials, and screening status side by side for Indian stocks.",
  alternates: { canonical: "/compare" },
  robots: { index: true, follow: true },
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
        .slice(0, 3)
    : [];

  return (
    <main className={`${styles.screenerPage} ${styles.screenerPageFlow}`}>
      <div className={styles.screenerContainer}>
        <header className={styles.screenerHeader}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.pageTitle}>Compare Stocks</h1>
              <p className={styles.pageDesc}>
                Build your comparison first, then run it when you’re ready. Add up to 3 stocks and
                only use your daily compare session after you click Compare.
              </p>
            </div>
          </div>
        </header>

        <CompareTable allStocks={stocks} initialSymbols={requestedSymbols} mode="select" />
      </div>
    </main>
  );
}

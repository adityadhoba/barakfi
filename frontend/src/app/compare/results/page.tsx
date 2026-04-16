import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getStocks } from "@/lib/api";
import { CompareTable } from "@/components/compare-table";
import styles from "@/app/screener.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compare Results — Barakfi",
  description:
    "Review Shariah compliance, financial ratios, and market data side by side for selected Indian stocks.",
};

export default async function CompareResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ symbols?: string }>;
}) {
  const { symbols: rawSymbols } = await searchParams;

  const requestedSymbols = rawSymbols
    ? rawSymbols
        .split(",")
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 3)
    : [];

  const authState = await auth();
  if (requestedSymbols.length > 0 && !authState.userId) {
    const requestedQuery = requestedSymbols.join(",");
    const redirectPath = `/compare/results?symbols=${requestedQuery}`;
    redirect(`/sign-in?redirect_url=${encodeURIComponent(redirectPath)}`);
  }

  const stocks = await getStocks();

  return (
    <main className={`${styles.screenerPage} ${styles.screenerPageFlow}`}>
      <div className={styles.screenerContainer}>
        <header className={styles.screenerHeader}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.pageTitle}>Comparison Results</h1>
              <p className={styles.pageDesc}>
                Side-by-side Shariah screening, ratios, and financial data for your selected
                stocks.
              </p>
            </div>
          </div>
        </header>

        <CompareTable allStocks={stocks} initialSymbols={requestedSymbols} mode="results" />
      </div>
    </main>
  );
}

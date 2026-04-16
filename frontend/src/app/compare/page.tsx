import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getStocks, getCompareScreeningResults } from "@/lib/api";
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

  const { userId } = await auth();
  const user = await currentUser();
  const quotaHeaders = new Headers();
  if (userId) quotaHeaders.set("x-clerk-user-id", userId);
  const actorEmail = user?.primaryEmailAddress?.emailAddress;
  if (actorEmail) quotaHeaders.set("x-actor-email", actorEmail);

  const { results: screeningResults, compareLimitReached } =
    await getCompareScreeningResults(requestedSymbols, quotaHeaders);
  const screeningMap = new Map(screeningResults.map((sr) => [sr.symbol.toUpperCase(), sr]));

  const compareStocks = requestedSymbols
    .map((symbol) => {
      const stock = stocks.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());
      if (!stock) return null;
      const screening = screeningMap.get(symbol.toUpperCase());
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
                Compare Shariah compliance, ratios, and financials side by side. Add up to 3 stocks.
                Daily compare sessions are limited; see your quota on the screening flow.
              </p>
            </div>
          </div>
        </header>

        {compareLimitReached && requestedSymbols.length > 0 ? (
          <div className={styles.compareQuotaAlert} role="alert">
            Daily compare limit reached. Try again after midnight IST, or sign in if you are over the
            anonymous limit.
          </div>
        ) : null}

        <CompareTable
          compareStocks={validStocks}
          allStocks={stocks}
        />
      </div>
    </main>
  );
}

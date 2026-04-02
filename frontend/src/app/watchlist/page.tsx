import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "@/app/screener.module.css";
import {
  getAuthenticatedWatchlist,
  getBulkScreeningResults,
} from "@/lib/api";
import { WatchlistDashboard } from "@/components/watchlist-dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Watchlist — Barakfi",
  description: "Track your Shariah-compliant stock watchlist with live compliance status.",
};

export default async function WatchlistPage() {
  const authState = await auth();
  const clerkUser = await currentUser();
  const token = await authState.getToken();

  if (!clerkUser || !token) {
    redirect("/sign-in");
  }

  const actor = {
    authSubject: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress || null,
  };

  const watchlist = await getAuthenticatedWatchlist(token, actor).catch(() => []);

  // Fetch screening results in bulk for all watchlist stocks
  const symbols = watchlist.map((entry) => entry.stock.symbol);
  const screeningResults = await getBulkScreeningResults(symbols);

  // Create a map for quick lookup
  const screeningMap = new Map(screeningResults.map((sr) => [sr.symbol, sr]));

  // Enrich watchlist entries with screening data
  const enriched = watchlist.map((entry) => ({
    ...entry,
    screening: screeningMap.get(entry.stock.symbol) || null,
  }));

  return (
    <main className={styles.screenerPage}>
      <div className={styles.screenerContainer}>
        {/* Header */}
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/" className={styles.breadcrumbLink}>Home</Link>
          <span className={styles.breadcrumbSep} aria-hidden>/</span>
          <span className={styles.breadcrumbCurrent} aria-current="page">Watchlist</span>
        </nav>

        <header className={styles.screenerHeader}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.pageTitle}>Watchlist</h1>
              <p className={styles.pageDesc}>
                {enriched.length} stock{enriched.length !== 1 ? "s" : ""} you&apos;re tracking.
                Add stocks from the <Link href="/screener" className={styles.methodologyLink}>screener</Link>.
              </p>
            </div>
          </div>
        </header>

        {/* Watchlist Dashboard */}
        {enriched.length > 0 ? (
          <WatchlistDashboard entries={enriched} />
        ) : (
          <div className="emptyStateBlock" style={{ marginTop: 40 }}>
            <div className="emptyStateIcon" aria-hidden="true">&#x2606;</div>
            <p className="emptyStateTitle">Your watchlist is empty</p>
            <p className="emptyStateDesc">
              Add stocks from the screener to track them here and stay on top of compliance changes.
            </p>
            <Link className="emptyStateCta" href="/screener">
              Browse stocks →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

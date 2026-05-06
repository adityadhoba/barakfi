import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DM_Serif_Display } from "next/font/google";
import { unstable_noStore } from "next/cache";
import styles from "@/app/screener-html.module.css";
import { getScreenerSnapshot, getStocks, getBulkScreeningResults } from "@/lib/api";
import { StockScreenerTableHtml } from "@/components/stock-screener-table-html";
import { ScreenerSkeleton } from "@/components/screener-skeleton";
import { ScreenerWarmingUp } from "@/components/screener-warming-up";
import { RouteLocalAuth } from "@/components/route-local-auth";

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-screener-serif",
});

const TICKER_ITEMS = [
  { name: "NIFTY 50", value: "23,842.75", change: "+0.54%", positive: true },
  { name: "SENSEX", value: "78,553.20", change: "+0.54%", positive: true },
  { name: "NIFTY BANK", value: "51,236.80", change: "-0.17%", positive: false },
  { name: "NIFTY IT", value: "33,156.40", change: "+0.75%", positive: true },
  { name: "NIFTY PHARMA", value: "19,872.35", change: "+0.28%", positive: true },
  { name: "NIFTY AUTO", value: "23,145.90", change: "-0.48%", positive: false },
  { name: "NIFTY FMCG", value: "56,234.15", change: "+0.32%", positive: true },
  { name: "INDIA VIX", value: "13.42", change: "-2.75%", positive: false },
] as const;

// ISR: revalidate every 10 minutes. Next.js serves the cached page instantly
// from the CDN edge; a background re-render is triggered after 600 s.
// getScreenerSnapshot() throws on 503 (cold backend), which causes ISR to
// skip caching and retry on the next request instead of persisting stale data.
export const revalidate = 600;

export const metadata: Metadata = {
  title: "Shariah Stock Screener — Barakfi",
  description:
    "Screen NSE-listed Indian equities for Shariah-style compliance: filter by sector and compliance status, sort by market cap and financial ratios, and open any symbol for a full ratio breakdown. Free educational screener with transparent methodology and research context.",
  alternates: { canonical: "/screener" },
  robots: { index: true, follow: true },
};

export default function ScreenerPage() {
  return (
    <main className={`${styles.screenerPage} ${dmSerif.variable}`}>
      <div className={styles.localTicker} aria-label="Market ticker">
        <div className={styles.localTickerTrack}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, index) => (
            <span className={styles.localTickerItem} key={`${item.name}-${index}`}>
              <b>{item.name}</b>
              {item.value}
              <span className={item.positive ? styles.tickerUp : styles.tickerDown}>{item.change}</span>
            </span>
          ))}
        </div>
      </div>

      <nav className={styles.localNav} aria-label="Screener navigation">
        <Link className={styles.localLogo} href="/">
          Barak<span className={styles.localLogoAccent}>Fi</span>
        </Link>
        <div className={styles.localNavRight}>
          <div className={styles.localNavLinks}>
            <Link className={`${styles.localNavLink} ${styles.localNavLinkActive}`} href="/screener">
              Screener
            </Link>
            <Link className={styles.localNavLink} href="/watchlist">
              Watchlist
            </Link>
            <Link className={styles.localNavLink} href="/methodology">
              Methodology
            </Link>
            <Link className={`${styles.localNavLink} ${styles.localNavCta}`} href="/screener">
              Open Screener
            </Link>
          </div>
          <RouteLocalAuth
            className={styles.localNavAuth}
            ghostClassName={`${styles.localNavLink} ${styles.localNavAuthGhost}`}
            primaryClassName={`${styles.localNavLink} ${styles.localNavAuthPrimary}`}
            userClassName={styles.localNavUser}
          />
        </div>
      </nav>

      <Suspense fallback={<ScreenerSkeleton />}>
        <ScreenerDataLayer />
      </Suspense>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Try the fast GET /screener/snapshot (pre-computed, CDN-cacheable).
// If the backend hasn't deployed that endpoint yet (404) or the screening
// cache is cold, fall back to the original two-call approach so users always
// see the screener — never the error page — during backend transitions.
// ---------------------------------------------------------------------------
async function ScreenerDataLayer() {
  const validStocks = await loadScreenerStocks();
  if (validStocks.length === 0) {
    // Backend is cold or unreachable. Opt out of ISR caching so this
    // empty state is never stored — the next request will try again fresh.
    unstable_noStore();
    return <ScreenerWarmingUp />;
  }
  return <StockScreenerTableHtml screenedStocks={validStocks} />;
}

async function loadScreenerStocks() {
  // ── Fast path: single GET, cached by Next.js Data Cache + CDN ────────────
  try {
    const entries = await getScreenerSnapshot();
    const mapped = entries.map(({ stock, screening }) => ({ ...stock, screening }));
    if (mapped.length > 0) return mapped;
  } catch {
    // Snapshot endpoint not yet deployed or cache cold — fall through to legacy.
  }

  // ── Legacy fallback: GET /stocks + POST /screen/bulk ─────────────────────
  try {
    const stocks = (
      await getStocks({ limit: 1000, orderBy: "market_cap_desc", revalidateSeconds: 600 })
    ).filter((s) => s.exchange === "NSE");

    if (stocks.length === 0) return [];

    const screeningResults = await getBulkScreeningResults(stocks.map((s) => s.symbol));
    const screeningMap = new Map(screeningResults.map((r) => [r.symbol, r]));

    const validStocks = stocks
      .map((stock) => {
        const screening = screeningMap.get(stock.symbol);
        if (!screening) return null;
        return { ...stock, screening };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    return validStocks;
  } catch {
    // Backend unavailable (e.g. cold start or rate-limited during build).
    // Return empty — ScreenerDataLayer will throw to trigger the warming-up UI.
    return [];
  }
}

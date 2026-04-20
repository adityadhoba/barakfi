import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import styles from "@/app/screener.module.css";
import { getScreenerSnapshot } from "@/lib/api";
import { StockScreenerTable } from "@/components/stock-screener-table";
import { ScreenerSkeleton } from "@/components/screener-skeleton";

// ISR: page segment cache — revalidated on-demand by the pipeline via
// POST /api/revalidate-screener, or automatically every 5 minutes.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Shariah Stock Screener — Barakfi",
  description:
    "Screen NSE-listed Indian equities for Shariah-style compliance: filter by sector and compliance status, sort by market cap and financial ratios, and open any symbol for a full ratio breakdown. Free educational screener with transparent methodology and research context.",
  alternates: { canonical: "/screener" },
  robots: { index: true, follow: true },
};

export default function ScreenerPage() {
  return (
    <main className={styles.screenerPage}>
      <nav className={styles.screenerLearnLinks} aria-label="Learn and lists">
        <Link href="/learn/halal-stocks-india">Halal stocks in India — guide</Link>
        <span aria-hidden="true">·</span>
        <Link href="/learn/what-is-halal-investing">What is halal investing?</Link>
        <span aria-hidden="true">·</span>
        <Link href="/halal-stocks">Curated halal list</Link>
      </nav>
      <Suspense fallback={<ScreenerSkeleton />}>
        <ScreenerDataLayer />
      </Suspense>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Single GET call to /screener/snapshot — pre-computed, cacheable by Next.js
// Data Cache (unlike the old POST /screen/bulk which was uncacheable).
//
// The backend sets Cache-Control: s-maxage=300 so the response is served from
// CDN/Next.js cache between pipeline runs. No more hitting the backend on
// every ISR background revalidation from every Vercel edge region.
//
// Throws on backend errors so ISR never caches an empty/broken page.
// ---------------------------------------------------------------------------
async function ScreenerDataLayer() {
  const entries = await getScreenerSnapshot();

  const validStocks = entries.map(({ stock, screening }) => ({
    ...stock,
    screening,
  }));

  return <StockScreenerTable screenedStocks={validStocks} />;
}

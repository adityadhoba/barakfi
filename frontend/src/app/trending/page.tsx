import type { Metadata } from "next";
import Link from "next/link";
import { getTrending } from "@/lib/api";
import { TrendingStocksGrid } from "@/components/trending-stocks-grid";
import styles from "./trending.module.css";

export const metadata: Metadata = {
  title: "Trending Stocks — Halal Gainers, Losers & Most Active",
  description: "Discover trending halal stocks on NSE and BSE. See top gainers, losers, most active, and 52-week highs and lows in the Indian market.",
  alternates: { canonical: "https://barakfi.in/trending" },
};

export const dynamic = "force-dynamic";

const CATEGORIES = [
  { key: "popular", label: "Popular" },
  { key: "gainers", label: "Top Gainers" },
  { key: "losers", label: "Top Losers" },
  { key: "most-active", label: "Most Active" },
  { key: "52w-high", label: "52W High" },
  { key: "52w-low", label: "52W Low" },
];

export default async function TrendingPage() {
  const stocks = await getTrending("popular", undefined, 30);

  return (
    <main className="shellPage">
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Trending</span>
        </nav>
        <header className={styles.header}>
          <span className={styles.kicker}>Live Market</span>
          <h1 className={styles.title}>Trending Stocks</h1>
          <p className={styles.subtitle}>
            Most popular stocks on NSE and BSE.
          </p>
        </header>

        <div className={styles.pills}>
          {CATEGORIES.map((cat) => (
            <span key={cat.key} className={`${styles.pill} ${cat.key === "popular" ? styles.pillActive : ""}`}>
              {cat.label}
            </span>
          ))}
        </div>

        <TrendingStocksGrid stocks={stocks} />
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getTrending } from "@/lib/api";
import styles from "./trending.module.css";

export const metadata: Metadata = {
  title: "Trending Stocks — Halal Gainers, Losers & Most Active",
  description: "Discover trending halal stocks across India, US, and UK markets. See top gainers, losers, most active, and 52-week highs and lows.",
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

function formatPrice(price: number, currency: string = "INR") {
  const sym = currency === "GBP" ? "£" : currency === "USD" ? "$" : "₹";
  return `${sym}${price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatMcap(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}L Cr`;
  if (value >= 100) return `${(value / 100).toFixed(1)}K Cr`;
  return `${value.toFixed(0)} Cr`;
}

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
            Most popular stocks across Indian, US, and UK markets.
          </p>
        </header>

        <div className={styles.pills}>
          {CATEGORIES.map((cat) => (
            <span key={cat.key} className={`${styles.pill} ${cat.key === "popular" ? styles.pillActive : ""}`}>
              {cat.label}
            </span>
          ))}
        </div>

        <div className={styles.grid}>
          {stocks.map((stock, i) => (
            <Link key={stock.symbol} href={`/stocks/${stock.symbol}`} className={styles.card}>
              <div className={styles.cardRank}>{i + 1}</div>
              <div className={styles.cardBody}>
                <div className={styles.cardSymbol}>{stock.symbol}</div>
                <div className={styles.cardName}>{stock.name}</div>
              </div>
              <div className={styles.cardRight}>
                <div className={styles.cardPrice}>{formatPrice(stock.price, stock.currency)}</div>
                <div className={styles.cardMcap}>{formatMcap(stock.market_cap)}</div>
              </div>
              <span className={styles.cardExchange}>{stock.exchange}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

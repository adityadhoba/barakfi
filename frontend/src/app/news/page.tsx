import type { Metadata } from "next";
import Link from "next/link";
import styles from "./news.module.css";

export const metadata: Metadata = {
  title: "Islamic Finance News — Halal Investing Updates India",
  description: "Stay updated with the latest Islamic finance news, Shariah-compliant investing trends, and halal market developments in India and globally.",
  alternates: { canonical: "https://barakfi.in/news" },
};

const NEWS_ITEMS = [
  {
    title: "Understanding S&P Shariah Screening Methodology",
    summary: "How the S&P Dow Jones Shariah indices screen stocks for compliance. Learn about the 5 key financial ratios and sector exclusions that determine halal status.",
    category: "Education",
    date: "2026",
    href: "/methodology",
  },
  {
    title: "SEBI Allows Shariah-Compliant Mutual Funds in India",
    summary: "India's securities regulator continues to support Islamic finance products, enabling more options for Muslim investors seeking compliant investment vehicles.",
    category: "Regulation",
    date: "2026",
    href: "/halal-stocks",
  },
  {
    title: "Halal Investing: Why Debt Ratios Matter",
    summary: "A deep dive into why Shariah screening focuses heavily on debt ratios. Companies with excessive leverage are excluded — here's what the thresholds mean for your portfolio.",
    category: "Analysis",
    date: "2026",
    href: "/shariah-compliance",
  },
  {
    title: "Top 10 Halal Stocks on NSE by Market Cap",
    summary: "The largest Shariah-compliant companies listed on the National Stock Exchange. From Reliance to Maruti, see which blue chips pass the screening.",
    category: "Market",
    date: "2026",
    href: "/screener?status=HALAL",
  },
  {
    title: "Purification of Dividends: A Practical Guide",
    summary: "Even halal stocks may have small non-permissible income. Learn how to calculate and donate the purification amount from your dividend income.",
    category: "Guide",
    date: "2026",
    href: "/tools/purification",
  },
  {
    title: "Zakat on Stock Investments: Complete Guide for India",
    summary: "How to calculate zakat on your equity portfolio, including methodology differences between scholars and practical steps for Indian investors.",
    category: "Guide",
    date: "2026",
    href: "/tools/zakat",
  },
];

export default function NewsPage() {
  return (
    <main className="shellPage">
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <span>/</span>
          <span>News</span>
        </nav>
        <header className={styles.header}>
          <span className={styles.kicker}>Stay Informed</span>
          <h1 className={styles.title}>Islamic Finance News</h1>
          <p className={styles.subtitle}>
            Latest updates on Shariah-compliant investing, market trends, and Islamic finance in India.
          </p>
        </header>

        <div className={styles.grid}>
          {NEWS_ITEMS.map((item, i) => (
            <Link key={i} href={item.href} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.cardCategory}>{item.category}</span>
                <span className={styles.cardDate}>{item.date}</span>
              </div>
              <h2 className={styles.cardTitle}>{item.title}</h2>
              <p className={styles.cardSummary}>{item.summary}</p>
              <span className={styles.cardLink}>Read more →</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getNews } from "@/lib/api";
import { NewsCarousel } from "./news-carousel";
import styles from "./news.module.css";

export const metadata: Metadata = {
  title: "Islamic Finance News — Halal Investing Updates India",
  description:
    "Stay updated with the latest Islamic finance news, Shariah-compliant investing trends, and halal market developments in India and globally.",
  alternates: { canonical: "https://barakfi.in/news" },
};

export const dynamic = "force-dynamic";

const GUIDE_ITEMS = [
  {
    title: "Understanding S&P Shariah Screening Methodology",
    summary:
      "How the S&P Dow Jones Shariah indices screen stocks for compliance. Learn about the 5 key financial ratios and sector exclusions that determine halal status.",
    category: "Education",
    date: "2026",
    href: "/methodology",
  },
  {
    title: "Halal Investing: Why Debt Ratios Matter",
    summary:
      "A deep dive into why Shariah screening focuses heavily on debt ratios. Companies with excessive leverage are excluded — here's what the thresholds mean for your portfolio.",
    category: "Analysis",
    date: "2026",
    href: "/shariah-compliance",
  },
  {
    title: "Purification of Dividends: A Practical Guide",
    summary:
      "Even halal stocks may have small non-permissible income. Learn how to calculate and donate the purification amount from your dividend income.",
    category: "Guide",
    date: "2026",
    href: "/tools/purification",
  },
];

export default async function NewsPage() {
  const feed = await getNews(24);

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
            Islamic finance &amp; Shariah investing headlines (NewsAPI when configured, plus RSS). Opens in a new tab.
          </p>
        </header>

        {feed.length > 0 ? (
          <>
            <NewsCarousel items={feed.slice(0, 8)} />
            <h2 className={styles.feedSectionTitle}>More headlines</h2>
            <div className={styles.grid}>
              {feed.map((item) => (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className={styles.card}>
                  <div className={styles.cardTop}>
                    <span className={styles.cardCategory}>{item.source || "News"}</span>
                    <span className={styles.cardDate}>
                      {item.published_at ? item.published_at.slice(0, 10) : ""}
                    </span>
                  </div>
                  <h2 className={styles.cardTitle}>{item.title}</h2>
                  {item.summary ? <p className={styles.cardSummary}>{item.summary}</p> : null}
                  <span className={styles.cardLink}>Read on source site →</span>
                </a>
              ))}
            </div>
          </>
        ) : (
          <p className={styles.emptyFeed}>
            News headlines will appear here after the server syncs the RSS feed. Ask your host to run the news sync job
            or set <code>NEWS_RSS_URL</code> on the API.
          </p>
        )}

        <h2 className={styles.feedSectionTitle} style={{ marginTop: 40 }}>
          Guides on Barakfi
        </h2>
        <div className={styles.grid}>
          {GUIDE_ITEMS.map((item, i) => (
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

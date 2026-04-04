import type { Metadata } from "next";
import Link from "next/link";
import { getETFs } from "@/lib/api";
import styles from "./etfs.module.css";

export const metadata: Metadata = {
  title: "Halal ETFs — Shariah-Compliant Exchange Traded Funds",
  description: "Discover Shariah-compliant ETFs from India, US, and UK. Compare expense ratios, AUM, and coverage for halal investing.",
  alternates: { canonical: "https://barakfi.in/etfs" },
};

export const dynamic = "force-dynamic";

export default async function ETFsPage() {
  const etfs = await getETFs();

  return (
    <main className="shellPage">
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Halal ETFs</span>
        </nav>
        <header className={styles.header}>
          <span className={styles.kicker}>Passive Investing</span>
          <h1 className={styles.title}>Halal ETFs</h1>
          <p className={styles.subtitle}>
            Shariah-compliant exchange-traded funds from India, US, and UK markets.
          </p>
        </header>

        <div className={styles.grid}>
          {etfs.map((etf) => (
            <div key={etf.symbol} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.cardSymbol}>{etf.symbol}</div>
                <span className={styles.cardExchange}>{etf.exchange}</span>
              </div>
              <h2 className={styles.cardName}>{etf.name}</h2>
              <p className={styles.cardDesc}>{etf.description}</p>
              <div className={styles.cardStats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Expense Ratio</span>
                  <span className={styles.statValue}>{etf.expense_ratio}%</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>AUM</span>
                  <span className={styles.statValue}>${etf.aum_millions}M</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Provider</span>
                  <span className={styles.statValue}>{etf.provider}</span>
                </div>
              </div>
              {etf.is_shariah_certified && (
                <span className={styles.certified}>Shariah Certified</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

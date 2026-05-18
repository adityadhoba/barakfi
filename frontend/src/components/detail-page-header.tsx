"use client";

import Link from "next/link";
import styles from "@/components/detail-page-header.module.css";

const FALLBACK_INDICES = [
  { name: "NIFTY", value: 23145.9, change: 1, change_percent: 0.75 },
  { name: "NIFTY FMCG", value: 56234.5, change: 1, change_percent: 0.32 },
  { name: "INDIA VIX", value: 13.42, change: -1, change_percent: -2.75 },
  { name: "NIFTY 50", value: 23842.75, change: 1, change_percent: 0.54 },
  { name: "SENSEX", value: 78553.20, change: 1, change_percent: 0.54 },
  { name: "NIFTY BANK", value: 51236.80, change: -1, change_percent: -0.17 },
  { name: "NIFTY IT", value: 33156.40, change: 1, change_percent: 0.75 },
  { name: "NIFTY PHARMA", value: 19872.35, change: 1, change_percent: 0.28 },
];

type Props = {
  indices?: Array<{
    name: string;
    value: number;
    change_percent: number;
  }>;
};

export function DetailPageHeader({ indices }: Props) {
  const tickerItems = indices && indices.length > 0 ? indices : FALLBACK_INDICES;

  return (
    <>
      <section className={styles.ticker} aria-label="Live market tape">
        <div className={styles.tickerTrack}>
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span className={styles.tickerItem} key={`${item.name}-${i}`}>
              <b>{item.name}</b>
              {typeof item.value === "number"
                ? item.value.toLocaleString("en-IN", { maximumFractionDigits: 2 })
                : "—"}
              <span
                className={
                  item.change_percent >= 0 ? styles.up : styles.down
                }
              >
                {item.change_percent >= 0 ? "+" : ""}
                {item.change_percent.toFixed(2)}%
              </span>
            </span>
          ))}
        </div>
      </section>

      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/" className={styles.logo}>
          Barak<span className={styles.logoAccent}>Fi</span>
        </Link>
        <div className={styles.navRight}>
          <div className={styles.navLinks}>
            <Link href="/screener">Screener</Link>
            <Link href="/explore">Explore</Link>
            <Link href="/tools">Tools</Link>
            <Link href="/watchlist">Watchlist</Link>
          </div>
          <div className={styles.navAuth}>
            <Link href="/sign-in" className={`${styles.navLink} ${styles.navAuthGhost}`}>
              Log in
            </Link>
            <Link href="/sign-up" className={`${styles.navLink} ${styles.navAuthPrimary}`}>
              Get started
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}

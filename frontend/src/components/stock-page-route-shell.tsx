"use client";

import Link from "next/link";
import { RouteLocalAuth } from "@/components/route-local-auth";
import styles from "@/app/stock-page-html.module.css";

const FALLBACK_TICKER = [
  { name: "NIFTY 50", value: "23,842.75", change: "+0.54%", positive: true },
  { name: "SENSEX", value: "78,553.20", change: "+0.54%", positive: true },
  { name: "NIFTY BANK", value: "51,236.80", change: "-0.17%", positive: false },
  { name: "NIFTY IT", value: "33,156.40", change: "+0.75%", positive: true },
  { name: "NIFTY PHARMA", value: "19,872.35", change: "+0.28%", positive: true },
  { name: "NIFTY AUTO", value: "23,145.90", change: "-0.48%", positive: false },
  { name: "NIFTY FMCG", value: "56,234.15", change: "+0.32%", positive: true },
  { name: "INDIA VIX", value: "13.42", change: "-2.75%", positive: false },
] as const;

export function StockPageRouteShell({
  children,
  breadcrumbSymbol,
}: {
  children: React.ReactNode;
  breadcrumbSymbol?: string;
}) {
  return (
    <main className={styles.stockPage}>
      <div className={styles.localTicker} aria-label="Market ticker">
        <div className={styles.localTickerTrack}>
          {[...FALLBACK_TICKER, ...FALLBACK_TICKER].map((item, index) => (
            <span className={styles.localTickerItem} key={`${item.name}-${index}`}>
              <b>{item.name}</b>
              {item.value}
              <span className={item.positive ? styles.tickerUp : styles.tickerDown}>{item.change}</span>
            </span>
          ))}
        </div>
      </div>

      <nav className={styles.localNav} aria-label="Stock page navigation">
        <Link className={styles.localLogo} href="/">
          Barak<span className={styles.localLogoAccent}>Fi</span>
        </Link>
        <div className={styles.localNavRight}>
          <div className={styles.localNavLinks}>
            <Link className={styles.localNavLink} href="/screener">Screener</Link>
            <Link className={styles.localNavLink} href="/watchlist">Watchlist</Link>
            <Link className={styles.localNavLink} href="/methodology">Methodology</Link>
            <Link className={`${styles.localNavLink} ${styles.localNavCta}`} href="/screener">Open Screener</Link>
          </div>
          <RouteLocalAuth
            className={styles.localNavAuth}
            ghostClassName={`${styles.localNavLink} ${styles.localNavAuthGhost}`}
            primaryClassName={`${styles.localNavLink} ${styles.localNavAuthPrimary}`}
            userClassName={styles.localNavUser}
          />
        </div>
      </nav>

      {breadcrumbSymbol ? (
        <div className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>›</span>
          <Link href="/screener">Screener</Link>
          <span>›</span>
          <span className={styles.breadcrumbCurrent}>{breadcrumbSymbol}</span>
        </div>
      ) : null}

      {children}
    </main>
  );
}

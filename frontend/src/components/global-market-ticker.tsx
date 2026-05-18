"use client";

import styles from "./global-market-ticker.module.css";

const TICKER_DATA = [
  { name: "NIFTY 50", value: "23,842.75", change: "+0.54%", positive: true },
  { name: "SENSEX", value: "78,553.20", change: "+0.54%", positive: true },
  { name: "NIFTY BANK", value: "51,236.80", change: "−0.17%", positive: false },
  { name: "NIFTY IT", value: "33,156.40", change: "+0.75%", positive: true },
  { name: "NIFTY PHARMA", value: "19,872.35", change: "+0.28%", positive: true },
  { name: "NIFTY AUTO", value: "23,145.90", change: "−0.48%", positive: false },
  { name: "NIFTY FMCG", value: "56,234.15", change: "+0.32%", positive: true },
  { name: "INDIA VIX", value: "13.42", change: "−2.75%", positive: false },
];

export function GlobalMarketTicker() {
  return (
    <div className={styles.ticker} aria-label="Market ticker">
      <div className={styles.track}>
        {[...TICKER_DATA, ...TICKER_DATA].map((item, index) => (
          <span className={styles.item} key={`${item.name}-${index}`}>
            <span className={styles.name}>{item.name}</span>
            <span className={styles.value}>{item.value}</span>
            <span className={item.positive ? styles.up : styles.down}>{item.change}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

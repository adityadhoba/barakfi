"use client";

import { useEffect, useState } from "react";
import { getPublicApiBaseUrl } from "@/lib/api-base";
import styles from "./market-ticker.module.css";

interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePct: number;
}

// Seed data — shown immediately, then replaced by live data when available
const SEED_INDICES: MarketIndex[] = [
  { name: "NIFTY 50", value: 23842.75, change: 127.30, changePct: 0.54 },
  { name: "SENSEX", value: 78553.20, change: 418.45, changePct: 0.54 },
  { name: "NIFTY BANK", value: 51236.80, change: -89.15, changePct: -0.17 },
  { name: "NIFTY IT", value: 33156.40, change: 245.60, changePct: 0.75 },
  { name: "NIFTY PHARMA", value: 19872.35, change: 56.20, changePct: 0.28 },
  { name: "NIFTY AUTO", value: 23145.90, change: -112.40, changePct: -0.48 },
  { name: "NIFTY FMCG", value: 56234.15, change: 178.90, changePct: 0.32 },
  { name: "INDIA VIX", value: 13.42, change: -0.38, changePct: -2.75 },
];

function formatValue(value: number): string {
  // For most indices, show 2 decimal places
  // For VIX and smaller values, may need adjustment
  if (value < 100) {
    return value.toFixed(2);
  }
  return value.toFixed(2);
}

function TickerItem({ index }: { index: MarketIndex }) {
  const isPositive = index.change >= 0;
  const changeClass = isPositive ? styles.changePositive : styles.changeNegative;

  return (
    <div className={styles.tickerItem}>
      <span className={styles.indexName}>{index.name}</span>
      <span className={styles.indexValue}>{formatValue(index.value)}</span>
      <span className={`${styles.indexChange} ${changeClass}`}>
        {isPositive ? "+" : ""}
        {formatValue(index.change)}
      </span>
      <span className={`${styles.indexPct} ${changeClass}`}>
        {isPositive ? "+" : ""}
        {index.changePct.toFixed(2)}%
      </span>
    </div>
  );
}

export function MarketTicker() {
  const [indices, setIndices] = useState<MarketIndex[]>(SEED_INDICES);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
    const refreshMs = isMobile ? 300_000 : 120_000;

    async function fetchLive() {
      try {
        const apiBase = getPublicApiBaseUrl();
        const res = await fetch(`${apiBase}/market-data/indices`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && !cancelled) {
          setIndices(
            data.map((d: { name: string; value: number; change: number; change_percent: number }) => ({
              name: d.name,
              value: d.value,
              change: d.change,
              changePct: d.change_percent,
            })),
          );
          setIsLive(true);
        }
      } catch {
        // Keep seed data on failure
      }
    }
    fetchLive();
    const interval = setInterval(fetchLive, refreshMs);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Duplicate indices for seamless scrolling
  const displayIndices = [...indices, ...indices];

  return (
    <div className={`globalMarketTicker ${styles.tickerRibbon}`}>
      <div className={styles.tickerContainer}>
        <div className={styles.liveDot} />
        <span className={styles.liveLabel}>{isLive ? "LIVE" : "MARKET"}</span>
        <div className={styles.tickerScroll}>
          {displayIndices.map((index, idx) => (
            <TickerItem key={idx} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

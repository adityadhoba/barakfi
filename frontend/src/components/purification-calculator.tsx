"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./purification-calculator.module.css";

type Props = {
  holdings?: Array<{
    symbol: string;
    name: string;
    purificationRatioPct: number | null;
    dividendReceived?: number;
  }>;
};

function AnimatedValue({ value, prefix = "₹" }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (Math.abs(diff) < 0.01) { setDisplay(value); return; }
    const duration = 600;
    const t0 = performance.now();
    function tick(now: number) {
      const elapsed = now - t0;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + diff * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{prefix}{display.toFixed(2)}</>;
}

export function PurificationCalculator({ holdings = [] }: Props) {
  const [manualDividend, setManualDividend] = useState("");
  const [manualRatio, setManualRatio] = useState("");
  const [showPortfolio, setShowPortfolio] = useState(false);

  const manualAmount =
    manualDividend && manualRatio
      ? (parseFloat(manualDividend) * parseFloat(manualRatio)) / 100
      : 0;

  const holdingsWithRatio = holdings.filter((h) => h.purificationRatioPct != null && h.purificationRatioPct > 0);
  const totalPurification = holdingsWithRatio.reduce((sum, h) => {
    const div = h.dividendReceived || 0;
    return sum + (div * (h.purificationRatioPct || 0)) / 100;
  }, 0);

  const hasInput = manualDividend !== "" || manualRatio !== "";

  return (
    <div className={styles.calculator}>
      <div className={styles.header}>
        <div className={styles.iconBadge}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <div>
          <h3 className={styles.title}>Purification Calculator</h3>
          <p className={styles.desc}>
            Calculate how much dividend income to donate to purify earnings from companies with minor non-permissible income.
          </p>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.inputGrid}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Dividend received</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputPrefix}>₹</span>
              <input
                type="number"
                className={styles.input}
                placeholder="5,000"
                value={manualDividend}
                onChange={(e) => setManualDividend(e.target.value)}
                min={0}
              />
            </div>
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Purification ratio</label>
            <div className={styles.inputWrap}>
              <input
                type="number"
                className={styles.input}
                placeholder="2.5"
                value={manualRatio}
                onChange={(e) => setManualRatio(e.target.value)}
                min={0}
                max={100}
                step={0.1}
              />
              <span className={styles.inputSuffix}>%</span>
            </div>
          </div>
        </div>

        <div className={`${styles.resultCard} ${hasInput && manualAmount > 0 ? styles.resultActive : ""}`}>
          <div className={styles.resultTop}>
            <span className={styles.resultLabel}>Amount to donate</span>
            {manualAmount > 0 && (
              <button
                type="button"
                className={styles.copyBtn}
                onClick={() => navigator.clipboard?.writeText(manualAmount.toFixed(2))}
                title="Copy amount"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              </button>
            )}
          </div>
          <span className={styles.resultValue}>
            <AnimatedValue value={manualAmount} />
          </span>
          {manualAmount > 0 && (
            <div className={styles.breakdownBar}>
              <div
                className={styles.breakdownFill}
                style={{ width: `${Math.min(parseFloat(manualRatio || "0"), 100)}%` }}
              />
            </div>
          )}
          <p className={styles.hint}>
            Find the purification ratio on each stock&apos;s detail page — it&apos;s the non-permissible income as a % of total income.
          </p>
        </div>
      </div>

      {holdingsWithRatio.length > 0 && (
        <>
          <button
            type="button"
            className={styles.portfolioToggle}
            onClick={() => setShowPortfolio(!showPortfolio)}
          >
            <span>Your portfolio purification ({holdingsWithRatio.length} stocks)</span>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: showPortfolio ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <div className={`${styles.portfolioSection} ${showPortfolio ? styles.portfolioOpen : ""}`}>
            <div className={styles.holdingsList}>
              {holdingsWithRatio.map((h) => (
                <div className={styles.holdingRow} key={h.symbol}>
                  <span className={styles.holdingSymbol}>{h.symbol}</span>
                  <span className={styles.holdingName}>{h.name}</span>
                  <span className={styles.holdingRatio}>{h.purificationRatioPct?.toFixed(2)}%</span>
                </div>
              ))}
            </div>
            {totalPurification > 0 && (
              <div className={styles.totalRow}>
                <span>Total to purify</span>
                <strong>₹{totalPurification.toFixed(2)}</strong>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

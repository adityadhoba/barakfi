"use client";

import { useState } from "react";
import styles from "./purification-calculator.module.css";

/**
 * Purification Calculator
 *
 * Calculates how much dividend income needs to be donated to charity
 * to purify earnings from companies with minor non-permissible income.
 *
 * Formula: Purification Amount = Dividend Received × (Non-Permissible Income / Total Income)
 * Only applies to HALAL stocks that have some non-permissible income < 5%.
 */

type Props = {
  /** Pre-loaded purification ratios from screening results */
  holdings?: Array<{
    symbol: string;
    name: string;
    purificationRatioPct: number | null;
    dividendReceived?: number;
  }>;
};

export function PurificationCalculator({ holdings = [] }: Props) {
  const [manualDividend, setManualDividend] = useState("");
  const [manualRatio, setManualRatio] = useState("");

  // Manual calculation
  const manualAmount =
    manualDividend && manualRatio
      ? (parseFloat(manualDividend) * parseFloat(manualRatio)) / 100
      : 0;

  // Portfolio-level calculation
  const holdingsWithRatio = holdings.filter((h) => h.purificationRatioPct != null && h.purificationRatioPct > 0);
  const totalPurification = holdingsWithRatio.reduce((sum, h) => {
    const div = h.dividendReceived || 0;
    return sum + (div * (h.purificationRatioPct || 0)) / 100;
  }, 0);

  return (
    <div className={styles.calculator}>
      <div className={styles.header}>
        <h3 className={styles.title}>Purification Calculator</h3>
        <p className={styles.desc}>
          Calculate how much dividend income to donate to purify earnings from companies with minor non-permissible income.
        </p>
      </div>

      {/* Quick manual calculator */}
      <div className={styles.manualCalc}>
        <div className={styles.inputRow}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Dividend received (&#x20B9;)</label>
            <input
              type="number"
              className={styles.input}
              placeholder="e.g. 5000"
              value={manualDividend}
              onChange={(e) => setManualDividend(e.target.value)}
              min={0}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Purification ratio (%)</label>
            <input
              type="number"
              className={styles.input}
              placeholder="e.g. 2.5"
              value={manualRatio}
              onChange={(e) => setManualRatio(e.target.value)}
              min={0}
              max={100}
              step={0.1}
            />
          </div>
          <div className={styles.resultBox}>
            <span className={styles.resultLabel}>Donate</span>
            <span className={styles.resultValue}>
              &#x20B9;{manualAmount > 0 ? manualAmount.toFixed(2) : "0.00"}
            </span>
          </div>
        </div>
        <p className={styles.hint}>
          Find the purification ratio on each stock&apos;s detail page. It&apos;s the non-permissible income as a % of total income.
        </p>
      </div>

      {/* Portfolio purification summary (if holdings provided) */}
      {holdingsWithRatio.length > 0 && (
        <div className={styles.portfolioSection}>
          <h4 className={styles.sectionTitle}>Your portfolio purification</h4>
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
              <strong>&#x20B9;{totalPurification.toFixed(2)}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import styles from "./zakat-calculator.module.css";

/**
 * Zakat Calculator for Investments
 *
 * Calculates zakat due on stock investments using the market value method.
 * Zakat on stocks = 2.5% of current market value (for stocks held > 1 lunar year).
 *
 * Two methods supported:
 * 1. Quick: Enter total portfolio value → get zakat amount
 * 2. Detailed: Enter individual holdings → get per-stock breakdown
 */

type Props = {
  portfolioValue?: number;
  holdingCount?: number;
};

export function ZakatCalculator({ portfolioValue = 0, holdingCount = 0 }: Props) {
  const [customValue, setCustomValue] = useState(portfolioValue > 0 ? String(Math.round(portfolioValue)) : "");
  const [goldPrice, setGoldPrice] = useState("7500"); // ~Rs 7500/gram Nisab threshold
  const [showDetails, setShowDetails] = useState(false);

  const NISAB_GOLD_GRAMS = 87.48; // 7.5 tola
  const ZAKAT_RATE = 0.025; // 2.5%

  const nisabThreshold = parseFloat(goldPrice || "7500") * NISAB_GOLD_GRAMS;
  const portfolioVal = parseFloat(customValue || "0");
  const isAboveNisab = portfolioVal >= nisabThreshold;
  const zakatDue = isAboveNisab ? portfolioVal * ZAKAT_RATE : 0;

  return (
    <div className={styles.calculator}>
      <div className={styles.header}>
        <h3 className={styles.title}>Zakat Calculator</h3>
        <p className={styles.desc}>
          Calculate zakat on your stock investments. Zakat is 2.5% of eligible wealth held for one lunar year above the Nisab threshold.
        </p>
      </div>

      <div className={styles.body}>
        <div className={styles.inputRow}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Portfolio value (&#x20B9;)</label>
            <input
              type="number"
              className={styles.input}
              placeholder="Enter total investment value"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              min={0}
            />
            {portfolioValue > 0 && (
              <button
                type="button"
                className={styles.usePortfolioBtn}
                onClick={() => setCustomValue(String(Math.round(portfolioValue)))}
              >
                Use portfolio value (&#x20B9;{Math.round(portfolioValue).toLocaleString("en-IN")})
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          className={styles.detailsToggle}
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? "Hide" : "Show"} Nisab settings
        </button>

        {showDetails && (
          <div className={styles.detailsPanel}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Gold price per gram (&#x20B9;)</label>
              <input
                type="number"
                className={styles.input}
                value={goldPrice}
                onChange={(e) => setGoldPrice(e.target.value)}
                min={0}
              />
            </div>
            <div className={styles.nisabInfo}>
              <span>Nisab (87.48g gold)</span>
              <strong>&#x20B9;{Math.round(nisabThreshold).toLocaleString("en-IN")}</strong>
            </div>
          </div>
        )}

        {/* Result */}
        <div className={`${styles.resultCard} ${isAboveNisab && portfolioVal > 0 ? styles.resultActive : styles.resultInactive}`}>
          {portfolioVal > 0 ? (
            isAboveNisab ? (
              <>
                <div className={styles.resultMain}>
                  <span className={styles.resultLabel}>Zakat due (2.5%)</span>
                  <span className={styles.resultValue}>&#x20B9;{Math.round(zakatDue).toLocaleString("en-IN")}</span>
                </div>
                <p className={styles.resultNote}>
                  On &#x20B9;{Math.round(portfolioVal).toLocaleString("en-IN")} portfolio value
                  {holdingCount > 0 && ` across ${holdingCount} holdings`}.
                  Applies to stocks held for one full lunar year.
                </p>
              </>
            ) : (
              <div className={styles.resultMain}>
                <span className={styles.resultLabel}>Below Nisab</span>
                <span className={styles.resultValueMuted}>
                  Portfolio is below the Nisab threshold of &#x20B9;{Math.round(nisabThreshold).toLocaleString("en-IN")}. No zakat due.
                </span>
              </div>
            )
          ) : (
            <div className={styles.resultMain}>
              <span className={styles.resultLabel}>Enter your portfolio value above</span>
            </div>
          )}
        </div>

        <p className={styles.disclaimer}>
          This is an estimate only. Consult a qualified Islamic scholar for precise zakat calculations based on your full financial situation.
        </p>
      </div>
    </div>
  );
}

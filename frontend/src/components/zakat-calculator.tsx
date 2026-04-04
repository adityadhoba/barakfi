"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./zakat-calculator.module.css";

const CURRENCIES = { INR: "₹", USD: "$", GBP: "£" } as const;
type CurrencyCode = keyof typeof CURRENCIES;

const DEFAULT_GOLD_PRICES: Record<CurrencyCode, string> = {
  INR: "7500",
  USD: "90",
  GBP: "72",
};

const LOCALE_MAP: Record<CurrencyCode, string> = {
  INR: "en-IN",
  USD: "en-US",
  GBP: "en-GB",
};

type Props = {
  portfolioValue?: number;
  holdingCount?: number;
};

function AnimatedValue({ value, prefix = "₹", locale = "en-IN" }: { value: number; prefix?: string; locale?: string }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (Math.abs(diff) < 1) { setDisplay(value); return; }
    const duration = 700;
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

  return <>{prefix}{Math.round(display).toLocaleString(locale)}</>;
}

export function ZakatCalculator({ portfolioValue = 0, holdingCount = 0 }: Props) {
  const [currency, setCurrency] = useState<CurrencyCode>("INR");
  const currencySymbol = CURRENCIES[currency];
  const locale = LOCALE_MAP[currency];
  const [customValue, setCustomValue] = useState(portfolioValue > 0 ? String(Math.round(portfolioValue)) : "");
  const [goldPrice, setGoldPrice] = useState("7500");
  const [showNisab, setShowNisab] = useState(false);

  useEffect(() => {
    setGoldPrice(DEFAULT_GOLD_PRICES[currency]);
  }, [currency]);

  const NISAB_GOLD_GRAMS = 87.48;
  const ZAKAT_RATE = 0.025;

  const nisabThreshold = parseFloat(goldPrice || "7500") * NISAB_GOLD_GRAMS;
  const portfolioVal = parseFloat(customValue || "0");
  const isAboveNisab = portfolioVal >= nisabThreshold;
  const zakatDue = isAboveNisab ? portfolioVal * ZAKAT_RATE : 0;
  const retainedAmount = portfolioVal - zakatDue;

  const zakatPct = portfolioVal > 0 && isAboveNisab ? 2.5 : 0;

  return (
    <div className={styles.calculator}>
      <div className={styles.header}>
        <div className={styles.iconBadge}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className={styles.title}>Zakat Calculator</h3>
          <p className={styles.desc}>
            Calculate zakat on your stock investments — 2.5% of eligible wealth held for one lunar year above the Nisab threshold.
          </p>
        </div>
      </div>

      <div className={styles.currencySelector}>
        {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
          <button
            key={code}
            type="button"
            className={`${styles.currencyBtn} ${currency === code ? styles.currencyBtnActive : ""}`}
            onClick={() => setCurrency(code)}
          >
            {CURRENCIES[code]} {code}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>Total portfolio value</label>
          <div className={styles.inputWrap}>
            <span className={styles.inputPrefix}>{currencySymbol}</span>
            <input
              type="number"
              className={styles.input}
              placeholder="Enter total investment value"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              min={0}
            />
          </div>
          {portfolioValue > 0 && (
            <button
              type="button"
              className={styles.usePortfolioBtn}
              onClick={() => setCustomValue(String(Math.round(portfolioValue)))}
            >
              Use portfolio value ({currencySymbol}{Math.round(portfolioValue).toLocaleString(locale)})
            </button>
          )}
        </div>

        <button
          type="button"
          className={styles.nisabToggle}
          onClick={() => setShowNisab(!showNisab)}
        >
          <span>Nisab settings</span>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: showNisab ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div className={`${styles.nisabPanel} ${showNisab ? styles.nisabOpen : ""}`}>
          <div className={styles.nisabInner}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Gold price per gram ({currencySymbol})</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputPrefix}>{currencySymbol}</span>
                <input
                  type="number"
                  className={styles.input}
                  value={goldPrice}
                  onChange={(e) => setGoldPrice(e.target.value)}
                  min={0}
                />
              </div>
            </div>
            <div className={styles.nisabInfo}>
              <span>Nisab threshold (87.48g gold)</span>
              <strong>{currencySymbol}{Math.round(nisabThreshold).toLocaleString(locale)}</strong>
            </div>
          </div>
        </div>

        <div className={`${styles.resultCard} ${isAboveNisab && portfolioVal > 0 ? styles.resultActive : portfolioVal > 0 ? styles.resultBelow : ""}`}>
          {portfolioVal > 0 ? (
            isAboveNisab ? (
              <>
                <div className={styles.resultMain}>
                  <span className={styles.resultLabel}>Zakat due (2.5%)</span>
                  <span className={styles.resultValue}>
                    <AnimatedValue value={zakatDue} prefix={currencySymbol} locale={locale} />
                  </span>
                </div>

                <div className={styles.donutRow}>
                  <div className={styles.donut}>
                    <svg viewBox="0 0 36 36" className={styles.donutSvg}>
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--line)" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15.9" fill="none"
                        stroke="var(--emerald)"
                        strokeWidth="3"
                        strokeDasharray={`${zakatPct} ${100 - zakatPct}`}
                        strokeDashoffset="25"
                        strokeLinecap="round"
                        style={{ transition: "stroke-dasharray 0.6s ease" }}
                      />
                    </svg>
                    <span className={styles.donutCenter}>2.5%</span>
                  </div>
                  <div className={styles.donutLegend}>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: "var(--emerald)" }} />
                      <span>Zakat: {currencySymbol}{Math.round(zakatDue).toLocaleString(locale)}</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: "var(--line)" }} />
                      <span>Retained: {currencySymbol}{Math.round(retainedAmount).toLocaleString(locale)}</span>
                    </div>
                  </div>
                </div>

                <p className={styles.resultNote}>
                  On {currencySymbol}{Math.round(portfolioVal).toLocaleString(locale)} portfolio value
                  {holdingCount > 0 && ` across ${holdingCount} holdings`}.
                  Applies to stocks held for one full lunar year.
                </p>

                <div className={styles.actionRow}>
                  <button
                    type="button"
                    className={styles.copyBtn}
                    onClick={() => navigator.clipboard?.writeText(String(Math.round(zakatDue)))}
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    Copy amount
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.resultMain}>
                <span className={styles.resultLabel}>Below Nisab</span>
                <p className={styles.resultMuted}>
                  Your portfolio value ({currencySymbol}{Math.round(portfolioVal).toLocaleString(locale)}) is below the Nisab threshold of {currencySymbol}{Math.round(nisabThreshold).toLocaleString(locale)}. No zakat is due.
                </p>
              </div>
            )
          ) : (
            <div className={styles.resultMain}>
              <span className={styles.resultLabel}>Enter your portfolio value above</span>
              <span className={styles.resultPlaceholder}>{currencySymbol}0</span>
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

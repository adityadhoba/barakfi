"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import styles from "./stock-preview-popup.module.css";
import type { ScreeningResult, Stock } from "@/lib/api";

type ScreenedStock = Stock & { screening: ScreeningResult };

type Props = {
  stock: ScreenedStock;
  price: number;
  changePct: number | null;
  children: React.ReactNode;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
}

function formatMcap(value: number) {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)} L`;
  return formatPrice(value);
}

function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function getMcapCategory(mcap: number): string {
  if (mcap >= 100000) return "Large Cap";
  if (mcap >= 20000) return "Mid Cap";
  return "Small Cap";
}

const STATUS_LABELS: Record<string, string> = {
  HALAL: "Halal",
  REQUIRES_REVIEW: "Needs Review",
  NON_COMPLIANT: "Non-Compliant",
};

export function StockPreviewPopup({ stock, price, changePct, children }: Props) {
  const [visible, setVisible] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(true), 300);
  }, []);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 200);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const b = stock.screening.breakdown;
  const statusCls = stock.screening.status === "HALAL" ? styles.statusHalal
    : stock.screening.status === "REQUIRES_REVIEW" ? styles.statusReview
    : styles.statusFail;

  const avatarBg = stock.screening.status === "HALAL" ? "var(--emerald)"
    : stock.screening.status === "REQUIRES_REVIEW" ? "var(--gold)"
    : "var(--red)";

  return (
    <div
      ref={wrapRef}
      className={styles.wrapper}
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={(e) => e.stopPropagation()}
    >
      {children}

      {visible && (
        <div className={styles.popup} onMouseEnter={show} onMouseLeave={hide}>
          <div className={styles.popupArrow} />

          {/* Header */}
          <div className={styles.popupHeader}>
            <div className={styles.popupAvatar} style={{ background: avatarBg }}>
              {stock.symbol.slice(0, 2)}
            </div>
            <div className={styles.popupIdentity}>
              <span className={styles.popupName}>{stock.name}</span>
              <span className={styles.popupSymbol}>{stock.symbol}</span>
            </div>
          </div>

          {/* Sector + Status */}
          <div className={styles.popupMeta}>
            <span className={styles.popupSector}>{stock.sector}</span>
            <span className={`${styles.popupStatus} ${statusCls}`}>
              {STATUS_LABELS[stock.screening.status]}
            </span>
          </div>

          {/* Price */}
          <div className={styles.popupPriceRow}>
            <span className={styles.popupPrice}>{formatPrice(price)}</span>
            {changePct != null && (
              <span className={changePct >= 0 ? styles.popupUp : styles.popupDown}>
                {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
              </span>
            )}
          </div>

          {/* Key stats grid */}
          <div className={styles.popupStats}>
            <div className={styles.popupStat}>
              <span className={styles.popupStatLabel}>Market Cap</span>
              <span className={styles.popupStatValue}>{formatMcap(stock.market_cap)}</span>
            </div>
            <div className={styles.popupStat}>
              <span className={styles.popupStatLabel}>Cap Type</span>
              <span className={styles.popupStatValue}>{getMcapCategory(stock.market_cap)}</span>
            </div>
            <div className={styles.popupStat}>
              <span className={styles.popupStatLabel}>Debt Ratio</span>
              <span className={`${styles.popupStatValue} ${b.debt_to_36m_avg_market_cap_ratio <= 0.23 ? styles.popupGood : b.debt_to_36m_avg_market_cap_ratio <= 0.33 ? styles.popupWarn : styles.popupBad}`}>
                {formatPct(b.debt_to_36m_avg_market_cap_ratio)}
              </span>
            </div>
            <div className={styles.popupStat}>
              <span className={styles.popupStatLabel}>Income Purity</span>
              <span className={`${styles.popupStatValue} ${b.non_permissible_income_ratio <= 0.035 ? styles.popupGood : b.non_permissible_income_ratio <= 0.05 ? styles.popupWarn : styles.popupBad}`}>
                {formatPct(b.non_permissible_income_ratio)}
              </span>
            </div>
          </div>

          {/* CTA */}
          <Link
            href={`/stocks/${encodeURIComponent(stock.symbol)}`}
            className={styles.popupCta}
            onClick={(e) => e.stopPropagation()}
          >
            View Details
          </Link>
        </div>
      )}
    </div>
  );
}

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import styles from "./stock-preview-popup.module.css";
import type { ScreeningResult, Stock } from "@/lib/api";
import { StockLogo } from "@/components/stock-logo";
import {
  formatMoney,
  formatMcapShort,
  resolveDisplayCurrency,
  resolveMarketLabel,
} from "@/lib/currency-format";

type ScreenedStock = Stock & { screening: ScreeningResult };

type Props = {
  stock: ScreenedStock;
  price: number;
  changePct: number | null;
  children: React.ReactNode;
};

function resolveCurrencyCode(stock: Stock): "INR" | "USD" | "GBP" {
  return resolveDisplayCurrency(stock.exchange, stock.currency);
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
  CAUTIOUS: "Doubtful",
  NON_COMPLIANT: "Haram",
};

const POPUP_WIDTH = 320;
const POPUP_PADDING = 8;

export function StockPreviewPopup({ stock, price, changePct, children }: Props) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; arrowSide: "top" | "bottom" }>({ top: 0, left: 0, arrowSide: "top" });
  const wrapRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const computePosition = useCallback(() => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const popupHeight = popupRef.current?.offsetHeight || 340;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top: number;
    let arrowSide: "top" | "bottom";

    if (spaceBelow >= popupHeight + POPUP_PADDING) {
      top = rect.bottom + POPUP_PADDING + window.scrollY;
      arrowSide = "top";
    } else if (spaceAbove >= popupHeight + POPUP_PADDING) {
      top = rect.top - popupHeight - POPUP_PADDING + window.scrollY;
      arrowSide = "bottom";
    } else {
      top = Math.max(POPUP_PADDING + window.scrollY, window.innerHeight / 2 - popupHeight / 2 + window.scrollY);
      arrowSide = "top";
    }

    let left = rect.left + window.scrollX;
    if (left + POPUP_WIDTH > window.innerWidth - POPUP_PADDING) {
      left = window.innerWidth - POPUP_WIDTH - POPUP_PADDING;
    }
    if (left < POPUP_PADDING) left = POPUP_PADDING;

    setPos({ top, left, arrowSide });
  }, []);

  const show = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(computePosition);
    }, 300);
  }, [computePosition]);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 200);
  }, []);

  useEffect(() => {
    // Avoid calling setState inside effect body (eslint rule). Use rAF instead.
    if (visible) requestAnimationFrame(computePosition);
  }, [visible, computePosition]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const b = stock.screening.breakdown;
  const statusCls = stock.screening.status === "HALAL" ? styles.statusHalal
    : stock.screening.status === "CAUTIOUS" ? styles.statusReview
    : styles.statusFail;

  const cur = resolveCurrencyCode(stock);
  const market = resolveMarketLabel(stock.exchange, stock.currency);

  const popupContent = visible ? createPortal(
    <div
      ref={popupRef}
      className={`${styles.popup} ${pos.arrowSide === "bottom" ? styles.popupFlipped : ""}`}
      style={{ top: pos.top, left: pos.left }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <div className={`${styles.popupArrow} ${pos.arrowSide === "bottom" ? styles.popupArrowBottom : ""}`} />

      <div className={styles.popupHeader}>
        <StockLogo symbol={stock.symbol} size={36} status={stock.screening.status} />
        <div className={styles.popupIdentity}>
          <span className={styles.popupName}>{stock.name}</span>
          <span className={styles.popupSymbol}>{stock.symbol}</span>
        </div>
      </div>

      <div className={styles.popupMeta}>
        <span className={styles.popupSector}>{stock.sector} · {market}</span>
        <span className={`${styles.popupStatus} ${statusCls}`}>
          {STATUS_LABELS[stock.screening.status]}
        </span>
      </div>

      <div className={styles.popupPriceRow}>
        <span className={styles.popupPrice}>{formatMoney(price, cur)}</span>
        {changePct != null && (
          <span className={changePct >= 0 ? styles.popupUp : styles.popupDown}>
            {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
          </span>
        )}
      </div>

      <div className={styles.popupStats}>
        <div className={styles.popupStat}>
          <span className={styles.popupStatLabel}>Market Cap</span>
          <span className={styles.popupStatValue}>{formatMcapShort(stock.market_cap, cur)}</span>
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

      <Link
        href={`/stocks/${encodeURIComponent(stock.symbol)}`}
        className={styles.popupCta}
        onClick={(e) => e.stopPropagation()}
      >
        View Details
      </Link>
    </div>,
    document.body
  ) : null;

  return (
    <div
      ref={wrapRef}
      className={styles.wrapper}
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
      {popupContent}
    </div>
  );
}

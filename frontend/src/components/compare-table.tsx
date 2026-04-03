"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./compare-table.module.css";
import { StockLogo } from "./stock-logo";
import type { ScreeningResult, Stock } from "@/lib/api";

type ScreenedStock = Stock & { screening: ScreeningResult };

type Props = {
  compareStocks: ScreenedStock[];
  allStocks: Stock[];
};

const STATUS_LABELS: Record<string, string> = {
  HALAL: "Halal",
  CAUTIOUS: "Cautious",
  NON_COMPLIANT: "Non-Compliant",
};

const STATUS_CLASS: Record<string, string> = {
  HALAL: "statusHalal",
  CAUTIOUS: "statusReview",
  NON_COMPLIANT: "statusFail",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMcap(value: number) {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(0)} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)} L`;
  return formatCurrency(value);
}

function formatPct(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function ratioClass(value: number, threshold: number): string {
  if (value <= threshold * 0.7) return styles.ratioGood;
  if (value <= threshold) return styles.ratioWarn;
  return styles.ratioBad;
}

function ratioColor(value: number, threshold: number): string {
  if (value <= threshold * 0.7) return "var(--emerald)";
  if (value <= threshold) return "var(--gold)";
  return "var(--red)";
}

function RatioBar({ value, threshold, max }: { value: number; threshold: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = ratioColor(value, threshold);
  return (
    <div className={styles.ratioBarWrap}>
      <div className={styles.ratioBarTrack}>
        <div
          className={styles.ratioBarFill}
          style={{ width: `${pct}%`, background: color }}
        />
        <div
          className={styles.ratioBarThreshold}
          style={{ left: `${(threshold / max) * 100}%` }}
        />
      </div>
      <span className={ratioClass(value, threshold)}>{formatPct(value)}</span>
    </div>
  );
}

export function CompareTable({ compareStocks, allStocks }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const currentSymbols = compareStocks.map((s) => s.symbol);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allStocks
      .filter(
        (s) =>
          !currentSymbols.includes(s.symbol) &&
          (s.symbol.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [query, allStocks, currentSymbols]);

  function addStock(symbol: string) {
    const next = [...currentSymbols, symbol].join(",");
    router.push(`/compare?symbols=${next}`);
    setQuery("");
    setShowPicker(false);
  }

  function removeStock(symbol: string) {
    const next = currentSymbols.filter((s) => s !== symbol).join(",");
    router.push(next ? `/compare?symbols=${next}` : "/compare");
  }

  const rows: { label: string; values: (s: ScreenedStock) => React.ReactNode }[] = [
    {
      label: "Shariah Status",
      values: (s) => (
        <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[s.screening.status] || "statusReview"]}`}>
          {STATUS_LABELS[s.screening.status] || s.screening.status}
        </span>
      ),
    },
    { label: "Price", values: (s) => formatCurrency(s.price) },
    { label: "Market Cap", values: (s) => formatMcap(s.market_cap) },
    { label: "Sector", values: (s) => <span className={styles.sectorBadge}>{s.sector}</span> },
    {
      label: "Debt Ratio",
      values: (s) => (
        <RatioBar value={s.screening.breakdown.debt_to_36m_avg_market_cap_ratio} threshold={0.33} max={0.6} />
      ),
    },
    {
      label: "Current Debt Ratio",
      values: (s) => (
        <RatioBar value={s.screening.breakdown.debt_to_market_cap_ratio} threshold={0.33} max={0.6} />
      ),
    },
    {
      label: "Non-Permissible Income",
      values: (s) => (
        <RatioBar value={s.screening.breakdown.non_permissible_income_ratio} threshold={0.05} max={0.15} />
      ),
    },
    {
      label: "Interest Income",
      values: (s) => (
        <RatioBar value={s.screening.breakdown.interest_income_ratio} threshold={0.05} max={0.15} />
      ),
    },
    {
      label: "Receivables Ratio",
      values: (s) => (
        <RatioBar value={s.screening.breakdown.receivables_to_market_cap_ratio} threshold={0.33} max={0.6} />
      ),
    },
    {
      label: "Cash & IB / Assets",
      values: (s) => (
        <RatioBar value={s.screening.breakdown.cash_and_interest_bearing_to_assets_ratio} threshold={0.33} max={0.6} />
      ),
    },
    { label: "Revenue", values: (s) => formatCurrency(s.revenue) },
    { label: "Total Debt", values: (s) => formatCurrency(s.debt) },
    { label: "Total Assets", values: (s) => formatCurrency(s.total_assets) },
  ];

  return (
    <div className={styles.compareContainer}>
      {/* Stock Picker */}
      {currentSymbols.length < 4 && (
        <div className={styles.pickerWrap}>
          <div className={styles.pickerInput}>
            <svg className={styles.pickerIcon} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="search"
              placeholder="Search stocks to compare..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowPicker(true);
              }}
              onFocus={() => setShowPicker(true)}
              aria-label="Search stocks to compare"
            />
          </div>
          {showPicker && suggestions.length > 0 && (
            <div className={styles.pickerDropdown}>
              {suggestions.map((s) => (
                <button
                  key={s.symbol}
                  type="button"
                  className={styles.pickerItem}
                  onClick={() => addStock(s.symbol)}
                >
                  <StockLogo symbol={s.symbol} size={28} />
                  <span className={styles.pickerSymbol}>{s.symbol}</span>
                  <span className={styles.pickerName}>{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {compareStocks.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconWrap}>
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="var(--emerald)" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </div>
          <h3 className={styles.emptyTitle}>Compare stocks side by side</h3>
          <p className={styles.emptyDesc}>
            Search above to add up to 4 stocks. Compare their Shariah compliance, financials, and key ratios at a glance.
          </p>
          <Link href="/screener" className={styles.emptyBtn}>
            Browse screener &rarr;
          </Link>
        </div>
      )}

      {/* Comparison Table */}
      {compareStocks.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.labelCol}>Metric</th>
                {compareStocks.map((s) => (
                  <th key={s.symbol} className={styles.stockCol}>
                    <div className={styles.stockHeader}>
                      <Link href={`/stocks/${encodeURIComponent(s.symbol)}`} className={styles.stockLink}>
                        <StockLogo symbol={s.symbol} size={36} status={s.screening.status} />
                        <div className={styles.stockMeta}>
                          <span className={styles.stockSymbol}>{s.symbol}</span>
                          <span className={styles.stockName}>{s.name}</span>
                        </div>
                      </Link>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => removeStock(s.symbol)}
                        aria-label={`Remove ${s.symbol}`}
                      >
                        &times;
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td className={styles.labelCell}>{row.label}</td>
                  {compareStocks.map((s) => (
                    <td key={s.symbol} className={styles.valueCell}>
                      {row.values(s)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

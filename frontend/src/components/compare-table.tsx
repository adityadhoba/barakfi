"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./compare-table.module.css";
import type { ScreeningResult, Stock } from "@/lib/api";

type ScreenedStock = Stock & { screening: ScreeningResult };

type Props = {
  compareStocks: ScreenedStock[];
  allStocks: Stock[];
};

const STATUS_LABELS: Record<string, string> = {
  HALAL: "Halal",
  REQUIRES_REVIEW: "Requires Review",
  NON_COMPLIANT: "Non-Compliant",
};

const STATUS_CLASS: Record<string, string> = {
  HALAL: "statusHalal",
  REQUIRES_REVIEW: "statusReview",
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
    { label: "Sector", values: (s) => s.sector },
    { label: "Exchange", values: (s) => s.exchange },
    {
      label: "Debt Ratio",
      values: (s) => (
        <span className={ratioClass(s.screening.breakdown.debt_to_36m_avg_market_cap_ratio, 0.33)}>
          {formatPct(s.screening.breakdown.debt_to_36m_avg_market_cap_ratio)}
        </span>
      ),
    },
    {
      label: "Current Debt Ratio",
      values: (s) => (
        <span className={ratioClass(s.screening.breakdown.debt_to_market_cap_ratio, 0.33)}>
          {formatPct(s.screening.breakdown.debt_to_market_cap_ratio)}
        </span>
      ),
    },
    {
      label: "Non-Permissible Income",
      values: (s) => (
        <span className={ratioClass(s.screening.breakdown.non_permissible_income_ratio, 0.05)}>
          {formatPct(s.screening.breakdown.non_permissible_income_ratio)}
        </span>
      ),
    },
    {
      label: "Interest Income",
      values: (s) => (
        <span className={ratioClass(s.screening.breakdown.interest_income_ratio, 0.05)}>
          {formatPct(s.screening.breakdown.interest_income_ratio)}
        </span>
      ),
    },
    {
      label: "Receivables Ratio",
      values: (s) => (
        <span className={ratioClass(s.screening.breakdown.receivables_to_market_cap_ratio, 0.33)}>
          {formatPct(s.screening.breakdown.receivables_to_market_cap_ratio)}
        </span>
      ),
    },
    {
      label: "Cash & IB / Assets",
      values: (s) => (
        <span className={ratioClass(s.screening.breakdown.cash_and_interest_bearing_to_assets_ratio, 0.33)}>
          {formatPct(s.screening.breakdown.cash_and_interest_bearing_to_assets_ratio)}
        </span>
      ),
    },
    {
      label: "Revenue",
      values: (s) => formatCurrency(s.revenue),
    },
    {
      label: "Total Debt",
      values: (s) => formatCurrency(s.debt),
    },
    {
      label: "Total Assets",
      values: (s) => formatCurrency(s.total_assets),
    },
  ];

  return (
    <div className={styles.compareContainer}>
      {/* Stock Picker */}
      {currentSymbols.length < 4 && (
        <div className={styles.pickerWrap}>
          <div className={styles.pickerInput}>
            <input
              type="search"
              placeholder="Add a stock to compare..."
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
          <span className={styles.emptyIcon}>⚖</span>
          <h3 className={styles.emptyTitle}>No stocks selected</h3>
          <p className={styles.emptyDesc}>
            Search above to add stocks, or{" "}
            <Link href="/screener" className={styles.emptyLink}>
              browse the screener
            </Link>{" "}
            to find stocks to compare.
          </p>
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
                        <span className={styles.stockSymbol}>{s.symbol}</span>
                        <span className={styles.stockName}>{s.name}</span>
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

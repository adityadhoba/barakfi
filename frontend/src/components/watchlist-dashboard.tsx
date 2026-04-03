"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useBatchQuotes } from "@/hooks/use-batch-quotes";
import { WatchlistActionButton } from "@/components/watchlist-action-button";
import type { WatchlistEntry, ScreeningResult } from "@/lib/api";
import styles from "./watchlist-dashboard.module.css";

interface EnrichedEntry extends WatchlistEntry {
  screening: ScreeningResult | null;
}

type SortKey = "symbol" | "price" | "status";
type SortOrder = "asc" | "desc";

interface Props {
  entries: EnrichedEntry[];
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  HALAL: "badgeHalal",
  CAUTIOUS: "badgeReview",
  NON_COMPLIANT: "badgeFail",
};

const STATUS_LABELS: Record<string, string> = {
  HALAL: "Halal",
  CAUTIOUS: "Cautious",
  NON_COMPLIANT: "Avoid",
};

const STATUS_ORDER: Record<string, number> = {
  HALAL: 0,
  CAUTIOUS: 1,
  NON_COMPLIANT: 2,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPriceChange(change: number | null | undefined): string {
  if (change == null) return "—";
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

export function WatchlistDashboard({ entries }: Props) {
  const symbols = useMemo(() => entries.map((e) => e.stock.symbol), [entries]);
  const quotes = useBatchQuotes(symbols);

  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Calculate compliance summary
  const summary = useMemo(() => {
    const halal = entries.filter((e) => e.screening?.status === "HALAL").length;
    const review = entries.filter((e) => e.screening?.status === "CAUTIOUS").length;
    const avoid = entries.filter((e) => e.screening?.status === "NON_COMPLIANT").length;
    return { halal, review, avoid };
  }, [entries]);

  // Sort entries
  const sorted = useMemo(() => {
    const copy = [...entries];

    copy.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortKey) {
        case "symbol":
          aVal = a.stock.symbol;
          bVal = b.stock.symbol;
          break;
        case "price": {
          const aPrice = quotes[a.stock.symbol]?.last_price ?? a.stock.price ?? 0;
          const bPrice = quotes[b.stock.symbol]?.last_price ?? b.stock.price ?? 0;
          aVal = aPrice;
          bVal = bPrice;
          break;
        }
        case "status":
          aVal = STATUS_ORDER[a.screening?.status || "CAUTIOUS"] ?? 999;
          bVal = STATUS_ORDER[b.screening?.status || "CAUTIOUS"] ?? 999;
          break;
        default:
          return 0;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return copy;
  }, [entries, quotes, sortKey, sortOrder]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  }

  function getSortIcon(key: SortKey): string {
    if (sortKey !== key) return " ↕";
    return sortOrder === "asc" ? " ↑" : " ↓";
  }

  return (
    <div className={styles.dashboard}>
      {/* Compliance Summary Strip */}
      <div className={styles.complianceSummary}>
        <div className={styles.summaryItem}>
          <div className={styles.summaryBadge} style={{ background: "var(--emerald-bg)" }}>
            <span className={styles.summaryIcon} style={{ color: "var(--emerald)" }}>✓</span>
          </div>
          <div className={styles.summaryText}>
            <div className={styles.summaryLabel}>Halal</div>
            <div className={styles.summaryValue}>{summary.halal}</div>
          </div>
        </div>

        <div className={styles.summaryItem}>
          <div className={styles.summaryBadge} style={{ background: "var(--gold-bg)" }}>
            <span className={styles.summaryIcon} style={{ color: "var(--gold)" }}>⚠</span>
          </div>
          <div className={styles.summaryText}>
            <div className={styles.summaryLabel}>Cautious</div>
            <div className={styles.summaryValue}>{summary.review}</div>
          </div>
        </div>

        <div className={styles.summaryItem}>
          <div className={styles.summaryBadge} style={{ background: "var(--red-bg)" }}>
            <span className={styles.summaryIcon} style={{ color: "var(--red)" }}>✕</span>
          </div>
          <div className={styles.summaryText}>
            <div className={styles.summaryLabel}>Avoid</div>
            <div className={styles.summaryValue}>{summary.avoid}</div>
          </div>
        </div>
      </div>

      {/* Sortable Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>
                <button
                  className={styles.sortButton}
                  onClick={() => handleSort("symbol")}
                  type="button"
                >
                  Stock{getSortIcon("symbol")}
                </button>
              </th>
              <th className={styles.th}>Sector</th>
              <th className={styles.th}>
                <button
                  className={styles.sortButton}
                  onClick={() => handleSort("price")}
                  type="button"
                >
                  Price{getSortIcon("price")}
                </button>
              </th>
              <th className={styles.th}>Change</th>
              <th className={styles.th}>
                <button
                  className={styles.sortButton}
                  onClick={() => handleSort("status")}
                  type="button"
                >
                  Status{getSortIcon("status")}
                </button>
              </th>
              <th className={styles.th}>Notes</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => {
              const status = entry.screening?.status || "CAUTIOUS";
              const badgeClass = STATUS_BADGE_CLASS[status] || "badgeReview";
              const badgeLabel = STATUS_LABELS[status] || status;
              const currentPrice = quotes[entry.stock.symbol]?.last_price ?? entry.stock.price;
              const change = quotes[entry.stock.symbol]?.change_percent;

              return (
                <tr key={entry.id} className={styles.tr}>
                  <td className={styles.td}>
                    <Link href={`/stocks/${encodeURIComponent(entry.stock.symbol)}`} className={styles.symbolLink}>
                      <span className={styles.symbolText}>{entry.stock.symbol}</span>
                      <span className={styles.nameText}>{entry.stock.name}</span>
                    </Link>
                  </td>
                  <td className={styles.td}>{entry.stock.sector}</td>
                  <td className={styles.td}>
                    <span className={styles.priceText}>{formatCurrency(currentPrice)}</span>
                  </td>
                  <td className={styles.td}>
                    <span
                      className={styles.changeText}
                      style={{
                        color:
                          change == null
                            ? "var(--text-secondary)"
                            : change >= 0
                              ? "var(--emerald)"
                              : "var(--red)",
                      }}
                    >
                      {formatPriceChange(change)}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${styles[badgeClass]}`}>
                      {badgeLabel}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {entry.notes ? (
                      <span className={styles.notesText}>{entry.notes}</span>
                    ) : (
                      <span className={styles.emptyText}>—</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actions}>
                      <Link href={`/stocks/${encodeURIComponent(entry.stock.symbol)}`} className={styles.detailsLink}>
                        Details →
                      </Link>
                      <WatchlistActionButton
                        symbol={entry.stock.symbol}
                        initialInWatchlist
                        removeLabel="Remove"
                        addLabel="Add"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

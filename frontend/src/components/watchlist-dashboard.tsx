"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useBatchQuotes } from "@/hooks/use-batch-quotes";
import { WatchlistActionButton } from "@/components/watchlist-action-button";
import type { WatchlistEntry, ScreeningResult } from "@/lib/api";
import styles from "./watchlist-dashboard.module.css";
import { formatMoney, resolveDisplayCurrency, resolveMarketLabel } from "@/lib/currency-format";
import { exchangeForBatchQuote } from "@/lib/exchange-for-quotes";

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
  CAUTIOUS: "Doubtful",
  NON_COMPLIANT: "Haram",
};

const STATUS_ORDER: Record<string, number> = {
  HALAL: 0,
  CAUTIOUS: 1,
  NON_COMPLIANT: 2,
};

function formatPriceChange(change: number | null | undefined): string {
  if (change == null) return "—";
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

export function WatchlistDashboard({ entries }: Props) {
  const symbols = useMemo(() => entries.map((e) => e.stock.symbol), [entries]);
  const exchangeBySymbol = useMemo(() => {
    const m: Record<string, string> = {};
    for (const e of entries) {
      m[e.stock.symbol] = exchangeForBatchQuote(e.stock.exchange, e.stock.currency);
    }
    return m;
  }, [entries]);

  const quotes = useBatchQuotes(symbols, exchangeBySymbol);

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
            <div className={styles.summaryLabel}>Doubtful</div>
            <div className={styles.summaryValue}>{summary.review}</div>
          </div>
        </div>

        <div className={styles.summaryItem}>
          <div className={styles.summaryBadge} style={{ background: "var(--red-bg)" }}>
            <span className={styles.summaryIcon} style={{ color: "var(--red)" }}>✕</span>
          </div>
          <div className={styles.summaryText}>
            <div className={styles.summaryLabel}>Haram</div>
            <div className={styles.summaryValue}>{summary.avoid}</div>
          </div>
        </div>
      </div>

      {/* Sortable Table (desktop) + cards (mobile) */}
      <div className={styles.tableContainer}>
        <table className={`${styles.table} ${styles.tableDesktop}`}>
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
              <th className={styles.th}>Market</th>
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
                  <td className={styles.td}>
                    <span className={styles.marketBadge}>
                      {resolveMarketLabel(entry.stock.exchange, entry.stock.currency)}
                    </span>
                  </td>
                  <td className={styles.td}>{entry.stock.sector}</td>
                  <td className={styles.td}>
                    <span className={styles.priceText}>
                      {formatMoney(
                        currentPrice,
                        resolveDisplayCurrency(entry.stock.exchange, entry.stock.currency),
                      )}
                    </span>
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
                    {entry.latest_research_summary ? (
                      <span className={styles.notesText}>{entry.latest_research_summary}</span>
                    ) : entry.notes ? (
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

        <div className={styles.cardList} aria-label="Watchlist">
          {sorted.map((entry) => {
            const status = entry.screening?.status || "CAUTIOUS";
            const badgeClass = STATUS_BADGE_CLASS[status] || "badgeReview";
            const badgeLabel = STATUS_LABELS[status] || status;
            const currentPrice = quotes[entry.stock.symbol]?.last_price ?? entry.stock.price;
            const change = quotes[entry.stock.symbol]?.change_percent;
            const noteText = entry.latest_research_summary || entry.notes;

            return (
              <article key={entry.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.cardSymbolBlock}>
                    <Link href={`/stocks/${encodeURIComponent(entry.stock.symbol)}`} className={styles.symbolLink}>
                      <span className={styles.symbolText}>{entry.stock.symbol}</span>
                      <span className={styles.nameText}>{entry.stock.name}</span>
                    </Link>
                  </div>
                  <span className={`${styles.badge} ${styles[badgeClass]}`}>{badgeLabel}</span>
                </div>
                <div className={styles.cardMeta}>
                  <span className={styles.marketBadge}>
                    {resolveMarketLabel(entry.stock.exchange, entry.stock.currency)}
                  </span>
                  <span>{entry.stock.sector}</span>
                </div>
                <div className={styles.priceText} style={{ fontSize: "1.05rem", fontWeight: 700 }}>
                  {formatMoney(
                    currentPrice,
                    resolveDisplayCurrency(entry.stock.exchange, entry.stock.currency),
                  )}
                  <span
                    className={styles.changeText}
                    style={{
                      marginLeft: 10,
                      color:
                        change == null
                          ? "var(--text-secondary)"
                          : change >= 0
                            ? "var(--emerald)"
                            : "var(--red)",
                    }}
                  >
                    {" "}
                    {formatPriceChange(change)}
                  </span>
                </div>
                {noteText ? (
                  <p className={styles.notesText} style={{ margin: "8px 0 0", fontSize: "0.82rem" }}>
                    {noteText}
                  </p>
                ) : null}
                <div className={styles.cardRow}>
                  <div className={styles.cardActions}>
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
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

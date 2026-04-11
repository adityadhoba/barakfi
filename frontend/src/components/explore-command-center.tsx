"use client";

import styles from "@/app/page.module.css";
import { unwrapPrimaryScreenEnvelope, type ScreeningResult, type Stock } from "@/lib/api";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useBatchQuotes } from "@/hooks/use-batch-quotes";
import { exchangeForBatchQuote } from "@/lib/exchange-for-quotes";
import { formatMoney, resolveDisplayCurrency } from "@/lib/currency-format";

type Props = {
  stocks: Stock[];
};

const STATUS_CLASS: Record<string, string> = {
  HALAL: "statusPositive",
  CAUTIOUS: "statusWarning",
  NON_COMPLIANT: "statusCritical",
};

function formatRatio(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatStatus(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

function matchesSearch(stock: Stock, query: string, sector: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery =
    normalizedQuery.length === 0 ||
    stock.symbol.toLowerCase().includes(normalizedQuery) ||
    stock.name.toLowerCase().includes(normalizedQuery);
  const matchesSector = sector === "All" || stock.sector === sector;
  return matchesQuery && matchesSector;
}

async function fetchScreening(symbol: string) {
  const response = await fetch(`/api/stocks/${encodeURIComponent(symbol)}/screen`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load stock screening");
  }

  const raw = await response.json();
  const screening = unwrapPrimaryScreenEnvelope(raw);
  if (!screening) {
    throw new Error("Unable to load stock screening");
  }
  return screening;
}

export function ExploreCommandCenter({ stocks }: Props) {
  const sectors = [
    "All",
    ...new Set(stocks.map((stock) => stock.sector).sort((left, right) => left.localeCompare(right))),
  ];
  const [query, setQuery] = useState("");
  const [activeSector, setActiveSector] = useState("All");
  const [selectedSymbol, setSelectedSymbol] = useState(stocks[0]?.symbol ?? "");
  const [screening, setScreening] = useState<ScreeningResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filteredStocks = stocks.filter((stock) => matchesSearch(stock, deferredQuery, activeSector));
  const selectedStock =
    filteredStocks.find((stock) => stock.symbol === selectedSymbol) || filteredStocks[0] || null;

  const listSymbols = useMemo(() => filteredStocks.map((s) => s.symbol), [filteredStocks]);
  const listExchangeBySymbol = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of filteredStocks) {
      m[s.symbol] = exchangeForBatchQuote(s.exchange, s.currency);
    }
    return m;
  }, [filteredStocks]);
  const listQuotes = useBatchQuotes(listSymbols, listExchangeBySymbol);

  useEffect(() => {
    if (selectedStock && selectedStock.symbol !== selectedSymbol) {
      setSelectedSymbol(selectedStock.symbol);
    }
    if (!selectedStock) {
      setSelectedSymbol("");
      setScreening(null);
      setError("");
    }
  }, [selectedStock, selectedSymbol]);

  useEffect(() => {
    if (!selectedSymbol) return;

    let cancelled = false;

    async function loadScreening() {
      setIsLoading(true);
      setError("");
      try {
        const result = await fetchScreening(selectedSymbol);
        if (!cancelled) setScreening(result);
      } catch {
        if (!cancelled) {
          setScreening(null);
          setError("Could not load screening for this stock.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadScreening();
    return () => { cancelled = true; };
  }, [selectedSymbol]);

  const reasons =
    screening?.reasons.length && screening.reasons.length > 0
      ? screening.reasons
      : ["No hard-rule violations detected."];
  const reviewFlags =
    screening?.manual_review_flags.length && screening.manual_review_flags.length > 0
      ? screening.manual_review_flags
      : ["No manual review flags on this snapshot."];

  return (
    <div className={styles.commandDeck}>
      <div className={styles.commandToolbar}>
        <label className={styles.commandInput}>
          <span>Search</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by symbol or company name..."
            value={query}
            type="search"
          />
        </label>
        <div className={styles.commandMeta}>
          <span className={styles.commandStat}>{filteredStocks.length} results</span>
        </div>
      </div>

      <div className={styles.sectorRow}>
        {sectors.map((sector) => (
          <button
            className={`${styles.sectorChip} ${activeSector === sector ? styles.sectorChipActive : ""}`}
            key={sector}
            onClick={() => setActiveSector(sector)}
            type="button"
          >
            {sector}
          </button>
        ))}
      </div>

      <div className={styles.commandGrid}>
        <div className={styles.stockScroller}>
          {filteredStocks.map((stock) => (
            <button
              className={`${styles.stockSignalCard} ${
                selectedStock?.symbol === stock.symbol ? styles.stockSignalCardActive : ""
              }`}
              key={stock.symbol}
              onClick={() => setSelectedSymbol(stock.symbol)}
              type="button"
            >
              <div className={styles.stockSignalHeader}>
                <div>
                  <strong>{stock.symbol}</strong>
                  <span>{stock.name}</span>
                </div>
                <span className={styles.price}>
                  {formatMoney(
                    listQuotes[stock.symbol]?.last_price ?? stock.price,
                    resolveDisplayCurrency(stock.exchange, stock.currency),
                  )}
                </span>
              </div>
              <div className={styles.stockSignalFooter}>
                <span>{stock.sector}</span>
                <span>{stock.exchange}</span>
              </div>
            </button>
          ))}

          {filteredStocks.length === 0 && (
            <p className={styles.emptyState}>No stocks match your search.</p>
          )}
        </div>

        <div className={styles.signalPanel}>
          {selectedStock ? (
            <>
              <div className={styles.signalHero}>
                <div>
                  <p className={styles.kicker}>{selectedStock.sector}</p>
                  <h3>{selectedStock.name}</h3>
                  <div className={styles.signalSubhead}>
                    <span>{selectedStock.symbol}</span>
                    <span>{selectedStock.exchange}</span>
                  </div>
                </div>
                <div className={styles.signalPriceBlock}>
                  <strong>
                    {formatMoney(
                      listQuotes[selectedStock.symbol]?.last_price ?? selectedStock.price,
                      resolveDisplayCurrency(selectedStock.exchange, selectedStock.currency),
                    )}
                  </strong>
                  {screening && (
                    <span className={styles[STATUS_CLASS[screening.status] || "statusNeutral"]}>
                      {formatStatus(screening.status)}
                    </span>
                  )}
                  {isLoading && <span className={styles.statusNeutral}>loading</span>}
                </div>
              </div>

              {error && <p className={styles.heroText}>{error}</p>}

              {screening && !isLoading && (
                <>
                  <div className={styles.signalMetrics}>
                    <div className={styles.signalMetric}>
                      <span>Debt ratio</span>
                      <strong>{formatRatio(screening.breakdown.debt_to_36m_avg_market_cap_ratio)}</strong>
                    </div>
                    <div className={styles.signalMetric}>
                      <span>Income quality</span>
                      <strong>{formatRatio(screening.breakdown.non_permissible_income_ratio)}</strong>
                    </div>
                    <div className={styles.signalMetric}>
                      <span>Receivables</span>
                      <strong>{formatRatio(screening.breakdown.receivables_to_market_cap_ratio)}</strong>
                    </div>
                    <div className={styles.signalMetric}>
                      <span>Cash & IB</span>
                      <strong>{formatRatio(screening.breakdown.cash_and_interest_bearing_to_assets_ratio)}</strong>
                    </div>
                  </div>

                  <div className={styles.signalNarrative}>
                    <div className={styles.signalBlock}>
                      <span className={styles.cardEyebrow}>Rule summary</span>
                      <div className={styles.reasonList}>
                        {reasons.map((reason) => (
                          <div className={styles.reasonItem} key={reason}>
                            <span className={styles.reasonDot} />
                            <p>{reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={styles.signalBlock}>
                      <span className={styles.cardEyebrow}>Open questions</span>
                      <div className={styles.reasonList}>
                        {reviewFlags.map((item) => (
                          <div className={styles.reasonItem} key={item}>
                            <span className={styles.reasonDotMuted} />
                            <p>{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {screening.active_review_case && (
                    <div className={styles.simpleList} style={{ marginTop: 12 }}>
                      <div className={styles.simpleRow}>
                        <div>
                          <strong>Active review</strong>
                          <span>{formatStatus(screening.active_review_case.status)}</span>
                        </div>
                        <p>{screening.active_review_case.summary}</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className={styles.detailActionRow}>
                <Link className={styles.primaryCta} href={`/stocks/${encodeURIComponent(selectedStock.symbol)}`}>
                  View full details →
                </Link>
              </div>
            </>
          ) : (
            <p className={styles.emptyState}>Select a stock to view its screening summary.</p>
          )}
        </div>
      </div>
    </div>
  );
}

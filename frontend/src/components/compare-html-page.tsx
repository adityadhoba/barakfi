"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "@/app/tools/tools.module.css";
import type { ScreeningResult, Stock } from "@/lib/api";
import { screeningUiLabel } from "@/lib/screening-status";
import { rankStocksForQuery } from "@/lib/stock-search-rank";
import { formatMcapShort, formatMoney, resolveDisplayCurrency } from "@/lib/currency-format";
import { QuotaLimitModal } from "./quota-limit-modal";

type Props = {
  allStocks: Stock[];
  initialSymbols?: string[];
  mode?: "select" | "results";
  userId?: string | null;
};

type CompareLimit = {
  status: "limit_exhausted";
  message: string;
  actions?: string[];
  redirect_url?: string;
  reports_remaining?: number;
};

function statusClass(status: string | null) {
  if (status === "HALAL") return styles.badgeCompliant;
  if (status === "CAUTIOUS") return styles.badgeReview;
  return styles.badgeFail;
}

function normalizeSymbols(symbols: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const symbol of symbols) {
    const clean = String(symbol || "").trim().toUpperCase();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= 3) break;
  }
  return out;
}

export function CompareHtmlPage({ allStocks, initialSymbols = [], mode = "select", userId = null }: Props) {
  const isGuest = userId === null;
  console.log("[CompareHtmlPage] userId:", userId, "isGuest:", isGuest, "typeof userId:", typeof userId);
  const [slots, setSlots] = useState<string[]>([
    initialSymbols[0] ?? "",
    initialSymbols[1] ?? "",
    initialSymbols[2] ?? "",
  ]);
  const [queries, setQueries] = useState<string[]>([
    initialSymbols[0] ?? "",
    initialSymbols[1] ?? "",
    initialSymbols[2] ?? "",
  ]);
  const [screening, setScreening] = useState<Record<string, ScreeningResult>>({});
  const [loading, setLoading] = useState(mode === "results");
  const [error, setError] = useState<string>("");
  const [limitState, setLimitState] = useState<CompareLimit | null>(null);
  const [showQuotaModal, setShowQuotaModal] = useState(false);

  const selected = useMemo(
    () =>
      slots
        .map((symbol) => allStocks.find((stock) => stock.symbol.toUpperCase() === symbol.toUpperCase()))
        .filter((stock): stock is Stock => Boolean(stock)),
    [slots, allStocks],
  );

  const suggestions = queries.map((query, index) => {
    const picked = new Set(slots.filter(Boolean));
    if (slots[index]) picked.delete(slots[index]);
    return rankStocksForQuery(allStocks, query, 6).filter((stock) => !picked.has(stock.symbol));
  });

  async function runCompare(forceSymbols?: string[]) {
    const symbols = normalizeSymbols(forceSymbols ?? slots.filter(Boolean));
    if (symbols.length < 2) return;

    setLoading(true);
    setError("");
    setLimitState(null);

    try {
      const res = await fetch("/api/compare/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(symbols),
      });
      const body = (await res.json().catch(() => ({}))) as unknown;
      const data =
        body && typeof body === "object" && "data" in body
          ? ((body as { data?: ScreeningResult[] }).data ?? [])
          : [];

      if (res.status === 429) {
        const payload = body as CompareLimit;
        const quotaMessage = payload.message || "You've used all 50 monthly full report credits";
        setLimitState({
          status: "limit_exhausted",
          message: quotaMessage,
          actions: payload.actions,
          redirect_url: payload.redirect_url || "/premium",
          reports_remaining: payload.reports_remaining,
        });
        setShowQuotaModal(true);
        setScreening({});
        return;
      }

      if (!res.ok) {
        const detail = body && typeof body === "object" && "detail" in body ? String((body as { detail?: unknown }).detail ?? "") : "";
        const message = body && typeof body === "object" && "message" in body ? String((body as { message?: unknown }).message ?? "") : "";
        setError(detail || message || "Could not load comparison right now.");
        setScreening({});
        return;
      }

      const rows = Array.isArray(data) ? data : [];
      setScreening(Object.fromEntries(rows.map((row) => [row.symbol.toUpperCase(), row])));
    } catch {
      setError("Network error. Please try again.");
      setScreening({});
    } finally {
      setLoading(false);
    }
  }

  function setSlot(index: number, symbol: string) {
    const nextSlots = [...slots];
    nextSlots[index] = symbol;
    setSlots(nextSlots);

    const nextQueries = [...queries];
    nextQueries[index] = symbol;
    setQueries(nextQueries);
  }

  const selectedCount = selected.length;

  const showResults = selectedCount >= 2 && Object.keys(screening).length > 0;

  if (isGuest) {
    return (
      <section className={styles.comparePageWrap}>
        <header className={styles.toolHeader}>
          <p className={styles.toolEyebrow}>Compare</p>
          <h1 className={styles.toolTitle}>Compare Stocks</h1>
          <p className={styles.toolDesc}>
            Compare <strong>Shariah compliance ratios, financial data, and screening status</strong> side by side for up to 3 stocks.
          </p>
        </header>

        <div className={styles.compareEmpty}>
          <div className={styles.compareEmptyTitle}>Sign in to start comparing</div>
          <div className={styles.compareEmptyBody}>
            Create a free account to compare Shariah compliance, financial ratios, and market metrics for Indian stocks.
          </div>
          <div className={styles.compareLinkRow}>
            <Link className={styles.btnOutlineLink} href="/sign-in">Sign In</Link>
            <Link className={styles.btnPrimary} href="/sign-up">Create Account</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.comparePageWrap}>
      <header className={styles.toolHeader}>
        <p className={styles.toolEyebrow}>Compare</p>
        <h1 className={styles.toolTitle}>Compare Stocks</h1>
        <p className={styles.toolDesc}>
          Compare <strong>Shariah compliance ratios, financial data, and screening status</strong> side by side for up to 3 stocks.
        </p>
      </header>

      <div className={styles.compareTip}>
        <span className={styles.tipIcon}>◆</span>
        <p className={styles.tipText}><strong>Monthly report credits are used per selected symbol.</strong> Two symbols use 2 credits, three symbols use 3 credits per compare run.</p>
      </div>

      <div className={styles.compareSearchRow}>
        {queries.map((query, index) => {
          const selectedStock = selected.find((stock) => stock.symbol === slots[index]);
          return (
            <div key={index} className={styles.compareSearchSlot}>
              <div className={styles.cssLabel}><span className={styles.slotNum}>{index + 1}</span> Stock {index + 1}{index === 2 ? <span className={styles.optionalTag}> (optional)</span> : null}</div>
              <input
                className={styles.cssInput}
                type="text"
                placeholder="Search ticker or name…"
                value={query}
                onChange={(e) => {
                  const next = [...queries];
                  next[index] = e.target.value.toUpperCase();
                  setQueries(next);
                  if (!e.target.value) {
                    const nextSlots = [...slots];
                    nextSlots[index] = "";
                    setSlots(nextSlots);
                  }
                }}
              />
              {selectedStock ? (
                <div className={styles.cssStockPreview}>
                  <div className={styles.cssLogo}>{selectedStock.symbol.charAt(0)}</div>
                  <div>
                    <div className={styles.cssTicker}>{selectedStock.symbol}</div>
                    <div className={styles.cssName}>{selectedStock.name}</div>
                  </div>
                </div>
              ) : <div className={styles.slotPlaceholder}>Type a ticker like RELIANCE or TCS</div>}
              {query && !selectedStock ? (
                <div className={styles.suggestionBox}>
                  {suggestions[index].slice(0, 5).map((stock) => (
                    <button key={stock.symbol} type="button" className={styles.suggestionItem} onClick={() => setSlot(index, stock.symbol)}>
                      <strong>{stock.symbol}</strong>
                      <span>{stock.name}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}

        <button type="button" className={styles.btnCompare} disabled={selected.length < 2 || loading} onClick={() => runCompare()}>
          {loading ? "Comparing…" : "Compare →"}
        </button>
      </div>

      {limitState ? (
        <div className={styles.compareEmpty}>
          <div className={styles.compareEmptyTitle}>{limitState.message}</div>
          <div className={styles.compareEmptyBody}>Your monthly report credits are insufficient for this compare run.</div>
          <div className={styles.compareLinkRow}>
            <Link className={styles.btnOutlineLink} href={limitState.redirect_url || "/premium"}>{limitState.actions?.[1] || "Join BarakFi Pro"}</Link>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className={styles.compareEmpty}>
          <div className={styles.compareEmptyTitle}>Could not run comparison</div>
          <div className={styles.compareEmptyBody}>{error}</div>
        </div>
      ) : null}

      {showResults ? (
        <div className={styles.compareTableWrap}>
          <table className={styles.compareTable}>
            <thead>
              <tr>
                <th>Metric</th>
                {selected.map((stock) => <th key={stock.symbol} className={styles.stockCol}>{stock.symbol}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr className={styles.sectionDividerRow}><td colSpan={selected.length + 1}>Shariah Compliance</td></tr>
              <tr>
                <td className={styles.metricLabel}>Status</td>
                {selected.map((stock) => {
                  const status = screening[stock.symbol]?.status ?? null;
                  return <td key={stock.symbol} className={styles.statusCell}><span className={`${styles.badge} ${statusClass(status)}`}>{screeningUiLabel(status ?? "NON_COMPLIANT")}</span></td>;
                })}
              </tr>
              <tr>
                <td className={styles.metricLabel}>Sector</td>
                {selected.map((stock) => <td key={stock.symbol} className={styles.centerCell}>{stock.sector}</td>)}
              </tr>
              <tr className={styles.sectionDividerRow}><td colSpan={selected.length + 1}>Market Data</td></tr>
              <tr>
                <td className={styles.metricLabel}>Price</td>
                {selected.map((stock) => <td key={stock.symbol} className={styles.metricVal}>{formatMoney(stock.price, resolveDisplayCurrency(stock.exchange, stock.currency))}</td>)}
              </tr>
              <tr>
                <td className={styles.metricLabel}>Market Cap</td>
                {selected.map((stock) => <td key={stock.symbol} className={styles.metricVal}>{formatMcapShort(stock.market_cap, resolveDisplayCurrency(stock.exchange, stock.currency))}</td>)}
              </tr>
              <tr>
                <td className={styles.metricLabel}>P/E Ratio</td>
                {selected.map((stock) => <td key={stock.symbol} className={styles.metricVal}>{stock.pe_ratio != null ? `${stock.pe_ratio.toFixed(1)}×` : "—"}</td>)}
              </tr>
            </tbody>
          </table>
          <div className={styles.compareLinkRow}><Link className={styles.btnOutlineLink} href={`/compare/results?symbols=${selected.map((stock) => stock.symbol).join(",")}`}>Open full compare →</Link></div>
        </div>
      ) : (!limitState && !error && !loading) ? (
        <div className={styles.compareEmpty}>
          <div className={styles.compareEmptyTitle}>Choose stocks to compare</div>
          <div className={styles.compareEmptyBody}>Search above to add between 2 and 3 stocks. Credits are used only when you click Compare.</div>
          <div className={styles.compareEmptyHint}>Tip: try RELIANCE, TCS, or INFY</div>
        </div>
      ) : null}

      <QuotaLimitModal
        isOpen={showQuotaModal}
        onClose={() => setShowQuotaModal(false)}
        message={limitState?.message}
      />
    </section>
  );
}

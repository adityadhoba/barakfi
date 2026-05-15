"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "@/app/tools/tools.module.css";
import { StockLogo } from "@/components/stock-logo";
import type { ScreeningResult, Stock } from "@/lib/api";
import { screeningUiLabel } from "@/lib/screening-status";

type CompareLimitState = {
  status: "limit_exhausted";
  message: string;
  actions: string[];
  redirect_url: string;
};

type Props = {
  allStocks: Stock[];
  initialSymbols?: string[];
  mode?: "select" | "results";
};

function normalizeSymbols(symbols: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const symbol of symbols) {
    const clean = symbol.trim().toUpperCase();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= 3) break;
  }
  return out;
}

function normalizeLimitState(payload: unknown): CompareLimitState | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  if (obj.status !== "limit_exhausted") return null;
  return {
    status: "limit_exhausted",
    message:
      typeof obj.message === "string"
        ? obj.message
        : "You have reached your monthly compare credit limit.",
    actions: Array.isArray(obj.actions)
      ? obj.actions.filter((x): x is string => typeof x === "string")
      : ["Come back next month", "Join Pro waitlist"],
    redirect_url: typeof obj.redirect_url === "string" ? obj.redirect_url : "/premium",
  };
}

function formatPct(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function statusBadgeClass(status: ScreeningResult["status"]) {
  if (status === "HALAL") return `${styles.badge} ${styles.badgeCompliant}`;
  if (status === "NON_COMPLIANT") return `${styles.badge} ${styles.badgeFail}`;
  return `${styles.badge} ${styles.badgeReview}`;
}

export function CompareHtmlPage({ allStocks, initialSymbols = [], mode = "select" }: Props) {
  const router = useRouter();
  const [symbols, setSymbols] = useState<string[]>(normalizeSymbols(initialSymbols));
  const [query, setQuery] = useState("");
  const [openSlot, setOpenSlot] = useState<number | null>(0);
  const [results, setResults] = useState<ScreeningResult[]>([]);
  const [loading, setLoading] = useState(mode === "results");
  const [error, setError] = useState<string | null>(null);
  const [limitState, setLimitState] = useState<CompareLimitState | null>(null);

  const selectedStocks = useMemo(
    () => symbols.map((s) => allStocks.find((stock) => stock.symbol.toUpperCase() === s)).filter(Boolean) as Stock[],
    [allStocks, symbols],
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || openSlot == null) return [];
    return allStocks
      .filter(
        (stock) =>
          !symbols.includes(stock.symbol) &&
          (stock.symbol.toLowerCase().includes(q) || stock.name.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [allStocks, openSlot, query, symbols]);

  const resultBySymbol = useMemo(
    () => new Map(results.map((item) => [item.symbol.toUpperCase(), item])),
    [results],
  );

  async function runCompare(nextSymbols?: string[]) {
    const active = normalizeSymbols(nextSymbols ?? symbols);
    if (active.length < 2) return;
    setLoading(true);
    setError(null);
    setLimitState(null);

    try {
      const response = await fetch("/api/compare/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(active),
      });
      const body = (await response.json().catch(() => ({}))) as unknown;
      const payload =
        body && typeof body === "object" && "data" in (body as Record<string, unknown>)
          ? (body as { data?: unknown }).data
          : body;

      const limit = normalizeLimitState(payload);
      if (response.status === 429 && limit) {
        setLimitState(limit);
        setResults([]);
        return;
      }
      if (!response.ok) {
        setError("Unable to compare the selected stocks right now.");
        setResults([]);
        return;
      }
      const parsed = Array.isArray(payload) ? (payload as ScreeningResult[]) : [];
      setResults(parsed);
      if (mode === "select") {
        router.push(`/compare/results?symbols=${active.join(",")}`);
      }
    } catch {
      setError("Unable to compare the selected stocks right now.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function setSlot(index: number, symbol: string) {
    const next = [...symbols];
    next[index] = symbol;
    const normalized = normalizeSymbols(next);
    setSymbols(normalized);
    setOpenSlot(null);
    setQuery("");
  }

  const slots = [0, 1, 2];

  return (
    <section className={styles.comparePageWrap}>
      <header className={styles.toolHeader}>
        <p className={styles.toolEyebrow}>Tools · Compare</p>
        <h1 className={styles.toolTitle}>Compare Stocks</h1>
        <p className={styles.toolDesc}>
          Compare Shariah screening verdicts and ratio breakdowns side by side.
        </p>
      </header>

      <div className={styles.compareTip}>
        <span className={styles.tipIcon}>✦</span>
        <p className={styles.tipText}>
          Each compare run consumes monthly report credits based on the number of selected symbols.
        </p>
      </div>

      <div className={styles.compareSearchRow}>
        {slots.map((slot) => {
          const symbol = symbols[slot] ?? "";
          const stock = symbol
            ? allStocks.find((item) => item.symbol.toUpperCase() === symbol.toUpperCase())
            : null;
          return (
            <div key={slot} className={styles.compareSearchSlot}>
              <div className={styles.cssLabel}>
                <span className={styles.slotNum}>{slot + 1}</span>
                Stock {slot === 2 ? <span className={styles.optionalTag}>(Optional)</span> : null}
              </div>
              <input
                className={styles.cssInput}
                value={openSlot === slot ? query : stock?.symbol ?? ""}
                placeholder="Search by symbol or company"
                onFocus={() => {
                  setOpenSlot(slot);
                  setQuery("");
                }}
                onChange={(e) => {
                  setOpenSlot(slot);
                  setQuery(e.target.value);
                }}
              />
              {stock && openSlot !== slot ? (
                <div className={styles.cssStockPreview}>
                  <div className={styles.cssLogo}>
                    <StockLogo symbol={stock.symbol} size={20} exchange={stock.exchange} />
                  </div>
                  <div>
                    <div className={styles.cssTicker}>{stock.symbol}</div>
                    <div className={styles.cssName}>{stock.name}</div>
                  </div>
                </div>
              ) : null}
              {openSlot === slot && suggestions.length > 0 ? (
                <div className={styles.suggestionBox}>
                  {suggestions.map((item) => (
                    <button
                      key={item.symbol}
                      className={styles.suggestionItem}
                      type="button"
                      onClick={() => setSlot(slot, item.symbol)}
                    >
                      <strong>{item.symbol}</strong>
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}

        <button
          type="button"
          className={styles.btnCompare}
          disabled={symbols.length < 2 || loading}
          onClick={() => runCompare()}
        >
          {loading ? "Comparing…" : "Compare Stocks"}
        </button>
      </div>

      {limitState ? (
        <div className={styles.requestCard}>
          <p className={styles.requestCopy}>{limitState.message}</p>
          <div className={styles.limitActions}>
            <Link href={limitState.redirect_url} className={styles.btnPrimaryLink}>Join Pro Waitlist</Link>
          </div>
        </div>
      ) : null}

      {error ? <p className={styles.formErr}>{error}</p> : null}

      {!loading && results.length > 0 ? (
        <div className={styles.compareTableWrap}>
          <table className={styles.compareTable}>
            <thead>
              <tr>
                <th>Metric</th>
                {selectedStocks.map((stock) => (
                  <th key={stock.symbol}>{stock.symbol}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className={styles.sectionDividerRow}><td colSpan={selectedStocks.length + 1}>Verdict</td></tr>
              <tr>
                <td className={styles.metricLabel}>Shariah Status</td>
                {selectedStocks.map((stock) => {
                  const result = resultBySymbol.get(stock.symbol.toUpperCase());
                  return (
                    <td key={stock.symbol} className={styles.centerCell}>
                      {result ? (
                        <span className={statusBadgeClass(result.status)}>{screeningUiLabel(result.status)}</span>
                      ) : "-"}
                    </td>
                  );
                })}
              </tr>
              <tr className={styles.sectionDividerRow}><td colSpan={selectedStocks.length + 1}>Ratios</td></tr>
              <tr>
                <td className={styles.metricLabel}>Debt / Market Cap</td>
                {selectedStocks.map((stock) => {
                  const result = resultBySymbol.get(stock.symbol.toUpperCase());
                  return <td key={stock.symbol} className={styles.centerCell}>{result ? formatPct(result.breakdown.debt_to_market_cap_ratio) : "-"}</td>;
                })}
              </tr>
              <tr>
                <td className={styles.metricLabel}>Interest Income</td>
                {selectedStocks.map((stock) => {
                  const result = resultBySymbol.get(stock.symbol.toUpperCase());
                  return <td key={stock.symbol} className={styles.centerCell}>{result ? formatPct(result.breakdown.interest_income_ratio) : "-"}</td>;
                })}
              </tr>
              <tr>
                <td className={styles.metricLabel}>Non-Permissible Income</td>
                {selectedStocks.map((stock) => {
                  const result = resultBySymbol.get(stock.symbol.toUpperCase());
                  return <td key={stock.symbol} className={styles.centerCell}>{result ? formatPct(result.breakdown.non_permissible_income_ratio) : "-"}</td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && results.length === 0 && !limitState ? (
        <div className={styles.compareEmpty}>
          <h3 className={styles.compareEmptyTitle}>Choose stocks before comparing</h3>
          <p className={styles.compareEmptyBody}>
            Add at least two stocks, then run compare to view side-by-side verdict and ratio details.
          </p>
          <p className={styles.compareEmptyHint}>Max 3 stocks per run.</p>
        </div>
      ) : null}
    </section>
  );
}

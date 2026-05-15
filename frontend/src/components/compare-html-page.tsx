"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

const PRESET_ROWS = [
  ["TCS", "INFY", "WIPRO"],
  ["RELIANCE", "ONGC"],
  ["CGPOWER", "NCC", "HDFCBANK"],
  ["SBIN", "ICICIBANK", "AXISBANK"],
  ["BHARTIARTL", "LTIM", "ZOMATO"],
] as const;

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

function slotStock(symbol: string | null, allStocks: Stock[]) {
  if (!symbol) return null;
  return allStocks.find((item) => item.symbol.toUpperCase() === symbol.toUpperCase()) ?? null;
}

export function CompareHtmlPage({ allStocks, initialSymbols = [], mode = "select" }: Props) {
  const router = useRouter();
  const [slotSymbols, setSlotSymbols] = useState<(string | null)[]>([
    initialSymbols[0] ?? null,
    initialSymbols[1] ?? null,
    initialSymbols[2] ?? null,
  ]);
  const [slotQueries, setSlotQueries] = useState<string[]>(["", "", ""]);
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [results, setResults] = useState<ScreeningResult[]>([]);
  const [loading, setLoading] = useState(mode === "results");
  const [error, setError] = useState<string | null>(null);
  const [limitState, setLimitState] = useState<CompareLimitState | null>(null);
  const autoFetchedRef = useRef(false);

  const activeSymbols = useMemo(
    () => normalizeSymbols(slotSymbols.filter((v): v is string => Boolean(v))),
    [slotSymbols],
  );

  const selectedStocks = useMemo(
    () => slotSymbols.map((sym) => slotStock(sym, allStocks)),
    [allStocks, slotSymbols],
  );

  const suggestions = useMemo(() => {
    if (openSlot == null) return [];
    const q = slotQueries[openSlot].trim().toLowerCase();
    if (!q) return [];
    const taken = new Set(activeSymbols);
    return allStocks
      .filter(
        (stock) =>
          !taken.has(stock.symbol.toUpperCase()) &&
          (stock.symbol.toLowerCase().includes(q) || stock.name.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [activeSymbols, allStocks, openSlot, slotQueries]);

  const resultBySymbol = useMemo(
    () => new Map(results.map((item) => [item.symbol.toUpperCase(), item])),
    [results],
  );

  async function fetchCompare(symbolsToCompare: string[]) {
    const active = normalizeSymbols(symbolsToCompare);
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
    } catch {
      setError("Unable to compare the selected stocks right now.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mode !== "results") return;
    if (autoFetchedRef.current) return;
    autoFetchedRef.current = true;
    void fetchCompare(activeSymbols);
  }, [activeSymbols, mode]);

  function chooseSymbol(slot: number, symbol: string) {
    setSlotSymbols((prev) => {
      const next = [...prev];
      next[slot] = symbol.toUpperCase();
      return next;
    });
    setSlotQueries((prev) => {
      const next = [...prev];
      next[slot] = "";
      return next;
    });
    setOpenSlot(null);
  }

  function clearSlot(slot: number) {
    setSlotSymbols((prev) => {
      const next = [...prev];
      next[slot] = null;
      return next;
    });
    setSlotQueries((prev) => {
      const next = [...prev];
      next[slot] = "";
      return next;
    });
    if (openSlot === slot) setOpenSlot(null);
  }

  function runCompare() {
    if (activeSymbols.length < 2) return;
    if (mode === "select") {
      router.push(`/compare/results?symbols=${activeSymbols.join(",")}`);
      return;
    }
    void fetchCompare(activeSymbols);
  }

  function applyPreset(preset: readonly string[]) {
    const next = [preset[0] ?? null, preset[1] ?? null, preset[2] ?? null];
    setSlotSymbols(next);
    setSlotQueries(["", "", ""]);
    setOpenSlot(null);
    if (mode === "results") {
      void fetchCompare(normalizeSymbols(preset.map((v) => v)));
    }
  }

  const enoughToCompare = activeSymbols.length >= 2;

  return (
    <section className={styles.comparePageWrap}>
      <header className={styles.compareHero}>
        <p className={styles.compareEyebrow}>BarakFi · Compare</p>
        <h1 className={styles.compareTitle}>
          Compare Stocks
          <br />
          <span>Side by Side</span>
        </h1>
        <p className={styles.compareLead}>
          Shariah compliance, financials, profitability, and market data — all in one view.
          Compare up to 3 NSE / BSE stocks from our full universe.
        </p>
      </header>

      <div className={styles.compareStatsRow}>
        <div className={styles.compareStat}><strong>527</strong><span>Stocks Screened</span></div>
        <div className={styles.compareStat}><strong>29</strong><span>Sectors Covered</span></div>
        <div className={styles.compareStat}><strong>AAOIFI</strong><span>Methodology Aligned</span></div>
        <div className={styles.compareStat}><strong>Free</strong><span>Monthly Credit Model</span></div>
      </div>

      <div className={styles.compareEntryRow}>
        {[0, 1, 2].map((slot) => {
          const stock = selectedStocks[slot];
          return (
            <div key={slot} className={styles.compareSlotCard}>
              <div className={styles.compareSlotHead}>
                <div className={styles.cssLabel}>
                  <span className={styles.slotNum}>{slot + 1}</span>
                  Stock {slot === 2 ? <span className={styles.optionalTag}>(Optional)</span> : `${slot + 1}`}
                </div>
                {stock ? (
                  <button type="button" className={styles.compareSlotClear} onClick={() => clearSlot(slot)}>
                    ×
                  </button>
                ) : null}
              </div>

              <input
                className={styles.cssInput}
                value={openSlot === slot ? slotQueries[slot] : stock?.symbol ?? ""}
                placeholder="Change..."
                onFocus={() => setOpenSlot(slot)}
                onChange={(e) => {
                  setOpenSlot(slot);
                  setSlotQueries((prev) => {
                    const next = [...prev];
                    next[slot] = e.target.value;
                    return next;
                  });
                }}
              />

              {stock ? (
                <div className={styles.compareStockLine}>
                  <div className={styles.cssLogo}>
                    <StockLogo symbol={stock.symbol} size={24} exchange={stock.exchange} />
                  </div>
                  <div>
                    <div className={styles.cssTicker}>{stock.symbol}</div>
                    <div className={styles.cssName}>{stock.name}</div>
                    <span className={`${styles.badge} ${styles.badgeCompliant}`}>Selected</span>
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
                      onClick={() => chooseSymbol(slot, item.symbol)}
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
          className={styles.compareRunButton}
          disabled={!enoughToCompare || loading}
          onClick={runCompare}
        >
          <span>⇄</span>
          <strong>{loading ? "Running" : "Compare"}</strong>
        </button>
      </div>

      <div className={styles.compareTryRow}>
        <span>Try:</span>
        {PRESET_ROWS.map((preset) => (
          <button
            key={preset.join("-")}
            type="button"
            className={styles.compareTryChip}
            onClick={() => applyPreset(preset)}
          >
            {preset.join(" · ")}
          </button>
        ))}
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
        <>
          <div className={styles.compareResultsCards}>
            {activeSymbols.map((symbol) => {
              const stock = slotStock(symbol, allStocks);
              const result = resultBySymbol.get(symbol.toUpperCase());
              if (!stock || !result) return null;
              return (
                <article key={symbol} className={styles.compareResultCard}>
                  <div className={styles.compareResultHead}>
                    <div className={styles.cssLogo}>
                      <StockLogo symbol={stock.symbol} size={26} exchange={stock.exchange} />
                    </div>
                    <div>
                      <h3>{stock.symbol}</h3>
                      <p>{stock.name}</p>
                      <span className={statusBadgeClass(result.status)}>{screeningUiLabel(result.status)}</span>
                    </div>
                  </div>

                  <div className={styles.compareResultPrice}>₹{Math.round(stock.price).toLocaleString("en-IN")}</div>
                  <div className={styles.compareResultMetaGrid}>
                    <div><span>Sector</span><strong>{stock.sector}</strong></div>
                    <div><span>Debt Ratio</span><strong>{formatPct(result.breakdown.debt_to_market_cap_ratio)}</strong></div>
                    <div><span>Interest Income</span><strong>{formatPct(result.breakdown.interest_income_ratio)}</strong></div>
                    <div><span>Non-perm Income</span><strong>{formatPct(result.breakdown.non_permissible_income_ratio)}</strong></div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className={styles.compareTableWrap}>
            <table className={styles.compareTable}>
              <thead>
                <tr>
                  <th>Metric</th>
                  {activeSymbols.map((symbol) => <th key={symbol}>{symbol}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr className={styles.sectionDividerRow}><td colSpan={activeSymbols.length + 1}>Verdict</td></tr>
                <tr>
                  <td className={styles.metricLabel}>Shariah Status</td>
                  {activeSymbols.map((symbol) => {
                    const result = resultBySymbol.get(symbol.toUpperCase());
                    return (
                      <td key={symbol} className={styles.centerCell}>
                        {result ? <span className={statusBadgeClass(result.status)}>{screeningUiLabel(result.status)}</span> : "-"}
                      </td>
                    );
                  })}
                </tr>

                <tr className={styles.sectionDividerRow}><td colSpan={activeSymbols.length + 1}>Ratios</td></tr>
                <tr>
                  <td className={styles.metricLabel}>Debt / Market Cap</td>
                  {activeSymbols.map((symbol) => {
                    const result = resultBySymbol.get(symbol.toUpperCase());
                    return <td key={symbol} className={styles.centerCell}>{result ? formatPct(result.breakdown.debt_to_market_cap_ratio) : "-"}</td>;
                  })}
                </tr>
                <tr>
                  <td className={styles.metricLabel}>Interest Income</td>
                  {activeSymbols.map((symbol) => {
                    const result = resultBySymbol.get(symbol.toUpperCase());
                    return <td key={symbol} className={styles.centerCell}>{result ? formatPct(result.breakdown.interest_income_ratio) : "-"}</td>;
                  })}
                </tr>
                <tr>
                  <td className={styles.metricLabel}>Non-Permissible Income</td>
                  {activeSymbols.map((symbol) => {
                    const result = resultBySymbol.get(symbol.toUpperCase());
                    return <td key={symbol} className={styles.centerCell}>{result ? formatPct(result.breakdown.non_permissible_income_ratio) : "-"}</td>;
                  })}
                </tr>
                <tr>
                  <td className={styles.metricLabel}>Receivables / Market Cap</td>
                  {activeSymbols.map((symbol) => {
                    const result = resultBySymbol.get(symbol.toUpperCase());
                    return <td key={symbol} className={styles.centerCell}>{result ? formatPct(result.breakdown.receivables_to_market_cap_ratio) : "-"}</td>;
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </>
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

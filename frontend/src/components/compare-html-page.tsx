"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
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
  inline?: boolean;
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
  return `${(value * 100).toFixed(1)}%`;
}

function formatMcap(value: number): string {
  if (value >= 1e12) return `₹${(value / 1e12).toFixed(2)}L Cr`;
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(0)} Cr`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatPrice(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function statusBadgeClass(status: ScreeningResult["status"]) {
  if (status === "HALAL") return styles.cmpTbadgeC;
  if (status === "NON_COMPLIANT") return styles.cmpTbadgeN;
  return styles.cmpTbadgeR;
}

function chipBadgeClass(status: ScreeningResult["status"]) {
  if (status === "HALAL") return styles.cmpChipBadgeC;
  if (status === "NON_COMPLIANT") return styles.cmpChipBadgeN;
  return styles.cmpChipBadgeR;
}

function scoreRingClass(score: number) {
  if (score >= 85) return styles.cmpRingE;
  if (score >= 70) return styles.cmpRingG;
  if (score >= 50) return styles.cmpRingC;
  return styles.cmpRingP;
}

function ratioBarStatus(value: number, threshold: number): "pass" | "warn" | "fail" {
  if (value <= threshold * 0.7) return "pass";
  if (value <= threshold) return "warn";
  return "fail";
}

function barFillClass(status: "pass" | "warn" | "fail") {
  if (status === "warn") return `${styles.cmpBarF} ${styles.cmpBarFWarn}`;
  if (status === "fail") return `${styles.cmpBarF} ${styles.cmpBarFFail}`;
  return styles.cmpBarF;
}

function ratioColorClass(status: "pass" | "warn" | "fail") {
  if (status === "pass") return styles.cmpPass;
  if (status === "warn") return styles.cmpWarn;
  return styles.cmpFail;
}

function deriveStrengths(screening: ScreeningResult): string[] {
  const strengths: string[] = [];
  const b = screening.breakdown;
  if (b.debt_to_market_cap_ratio <= 0.33) strengths.push("Debt ratio passes AAOIFI threshold");
  if (b.interest_income_ratio <= 0.05) strengths.push("Interest income within permissible limits");
  if (b.receivables_to_market_cap_ratio <= 0.33) strengths.push("Receivables ratio is healthy");
  if (b.sector_allowed) strengths.push("Core business activity is permissible");
  if (screening.purification_ratio_pct != null && screening.purification_ratio_pct <= 2)
    strengths.push("Very low purification requirement");
  return strengths.length > 0 ? strengths : ["No specific strengths identified from available data"];
}

function deriveRisks(screening: ScreeningResult): string[] {
  const risks: string[] = [];
  const b = screening.breakdown;
  if (b.debt_to_market_cap_ratio > 0.33) risks.push("Debt ratio exceeds 33% threshold");
  if (b.interest_income_ratio > 0.03)
    risks.push(`Interest income at ${formatPct(b.interest_income_ratio)} — monitor trend`);
  if (b.non_permissible_income_ratio > 0.03) risks.push("Non-permissible income requires attention");
  if (!b.sector_allowed) risks.push("Business activity flagged as non-permissible");
  if (b.cash_and_interest_bearing_to_assets_ratio > 0.25)
    risks.push("High cash & interest-bearing assets ratio");
  return risks.length > 0 ? risks : ["No specific risk factors identified from available data"];
}

function slotStock(symbol: string | null, allStocks: Stock[]) {
  if (!symbol) return null;
  return allStocks.find((item) => item.symbol.toUpperCase() === symbol.toUpperCase()) ?? null;
}

function buildSection(label: string, content: ReactNode) {
  return (
    <div>
      <div className={styles.cmpSecDivider}>
        <div className={styles.cmpSecLabel}>{label}</div>
        <div className={styles.cmpSecLine} />
      </div>
      {content}
    </div>
  );
}

/** Find the best (lowest or highest) value index for highlighting */
function bestIdx(values: (number | null | undefined)[], mode: "min" | "max"): number {
  let best = -1;
  let bestVal = mode === "min" ? Infinity : -Infinity;
  values.forEach((v, i) => {
    if (v == null) return;
    if (mode === "min" ? v < bestVal : v > bestVal) {
      bestVal = v;
      best = i;
    }
  });
  return best;
}

export function CompareHtmlPage({ allStocks, initialSymbols = [], mode = "select", inline = false }: Props) {
  const router = useRouter();
  const [slotSymbols, setSlotSymbols] = useState<(string | null)[]>([
    initialSymbols[0] ?? null,
    initialSymbols[1] ?? null,
    initialSymbols[2] ?? null,
  ]);
  const [slotQueries, setSlotQueries] = useState<string[]>(["", "", ""]);
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [results, setResults] = useState<ScreeningResult[]>([]);
  const [showResults, setShowResults] = useState(mode === "results");
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

  const uniqueSectors = useMemo(() => {
    const s = new Set(allStocks.map((st) => st.sector).filter(Boolean));
    return s.size;
  }, [allStocks]);

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
    if (!showResults) return;
    if (autoFetchedRef.current) return;
    autoFetchedRef.current = true;
    void fetchCompare(activeSymbols);
  }, [activeSymbols, showResults]);

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
    if (inline) {
      setShowResults(true);
      void fetchCompare(activeSymbols);
      return;
    }
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
    if (showResults) {
      void fetchCompare(normalizeSymbols(preset.map((v) => v)));
    }
  }

  const enoughToCompare = activeSymbols.length >= 2;

  /* ── Gather ordered data for result tables ── */
  const orderedStocks = activeSymbols.map((sym) => slotStock(sym, allStocks));
  const orderedResults = activeSymbols.map((sym) => resultBySymbol.get(sym.toUpperCase()) ?? null);

  function renderMetricRow(
    label: string,
    sublabel: string | null,
    values: (string | ReactNode)[],
    winIdx?: number,
  ) {
    return (
      <tr>
        <td>
          <div className={styles.cmpMl}>{label}</div>
          {sublabel && <div className={styles.cmpMs}>{sublabel}</div>}
        </td>
        {values.map((v, i) => (
          <td key={i} className={`${styles.cmpMv} ${winIdx === i ? styles.cmpMw : ""}`}>
            {winIdx === i && <span className={styles.cmpWd} />}
            {typeof v === "string" ? <span className={styles.cmpMt}>{v}</span> : v}
          </td>
        ))}
      </tr>
    );
  }

  function renderDividerRow(label: string) {
    return (
      <tr className={styles.cmpCtblDivider}>
        <td colSpan={activeSymbols.length + 1}>{label}</td>
      </tr>
    );
  }

  return (
    <section>
      {/* ── Hero ── */}
      <div className={styles.cmpHero}>
        <p className={styles.cmpEyebrow}>BarakFi · Compare</p>
        <h1 className={styles.cmpTitle}>
          Compare Stocks<br />
          <span>Side by Side</span>
        </h1>
        <p className={styles.cmpSub}>
          Shariah compliance, financials, profitability, and market data — all in one view.
          Compare up to 3 NSE / BSE stocks from our full universe of {allStocks.length}+ stocks.
        </p>
        <div className={styles.cmpStats}>
          <div className={styles.cmpStat}>
            <div className={styles.cmpStatNum}>{allStocks.length}</div>
            <div className={styles.cmpStatLabel}>Stocks Screened</div>
          </div>
          <div className={styles.cmpStat}>
            <div className={styles.cmpStatNum}>{uniqueSectors}</div>
            <div className={styles.cmpStatLabel}>Sectors Covered</div>
          </div>
          <div className={styles.cmpStat}>
            <div className={styles.cmpStatNum}>AAOIFI</div>
            <div className={styles.cmpStatLabel}>Methodology</div>
          </div>
          <div className={styles.cmpStat}>
            <div className={styles.cmpStatNum}>Free</div>
            <div className={styles.cmpStatLabel}>Monthly Credits</div>
          </div>
        </div>
      </div>

      {/* ── Search Section ── */}
      <div className={styles.cmpSearchSection}>
        <div className={styles.cmpSearchGrid}>
          {[0, 1, 2].map((slot) => {
            const stock = selectedStocks[slot];
            const result = stock ? resultBySymbol.get(stock.symbol.toUpperCase()) : null;
            return (
              <div key={slot} className={styles.cmpSlotWrap}>
                <div className={`${styles.cmpSlotBox} ${stock ? styles.cmpHasStock : ""}`}>
                  <div className={styles.cmpSlotLabelRow}>
                    <div>
                      <span className={styles.cmpSlotNumBadge}>{slot + 1}</span>
                      <span className={styles.cmpSlotLabelText}>
                        Stock {slot + 1}{slot === 2 ? " (Optional)" : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.cmpSlotClearBtn}
                      onClick={() => clearSlot(slot)}
                    >
                      ×
                    </button>
                  </div>

                  <input
                    className={styles.cmpSlotInput}
                    value={openSlot === slot ? slotQueries[slot] : stock?.symbol ?? ""}
                    placeholder="Search ticker or name..."
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

                  {stock && (
                    <div className={styles.cmpSlotChip}>
                      <div className={styles.cmpChipLogo}>
                        <StockLogo symbol={stock.symbol} size={24} exchange={stock.exchange} />
                      </div>
                      <div>
                        <div className={styles.cmpChipTicker}>{stock.symbol}</div>
                        <div className={styles.cmpChipName}>{stock.name}</div>
                      </div>
                      {result && (
                        <span className={`${styles.cmpChipBadge} ${chipBadgeClass(result.status)}`}>
                          {screeningUiLabel(result.status)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {openSlot === slot && suggestions.length > 0 && (
                  <div className={styles.cmpDropdown}>
                    {suggestions.map((item) => (
                      <button
                        key={item.symbol}
                        className={styles.cmpDropItem}
                        type="button"
                        onClick={() => chooseSymbol(slot, item.symbol)}
                      >
                        <div className={styles.cmpDropItemLogo}>
                          <StockLogo symbol={item.symbol} size={24} exchange={item.exchange} />
                        </div>
                        <div>
                          <div className={styles.cmpDropItemTicker}>{item.symbol}</div>
                          <div className={styles.cmpDropItemName}>{item.name}</div>
                        </div>
                        <div className={styles.cmpDropItemRight}>
                          <span className={styles.cmpDropBadge}>{item.sector}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            className={styles.cmpBtn}
            disabled={!enoughToCompare || loading}
            onClick={runCompare}
          >
            <span className={styles.cmpBtnArrow}>⇄</span>
            <span>{loading ? "RUNNING" : "COMPARE"}</span>
          </button>
        </div>
      </div>

      {/* ── Presets ── */}
      <div className={styles.cmpPresets}>
        <span className={styles.cmpPresetLabel}>Try:</span>
        {PRESET_ROWS.map((preset) => (
          <button
            key={preset.join("-")}
            type="button"
            className={styles.cmpPresetPill}
            onClick={() => applyPreset(preset)}
          >
            {preset.join(" · ")}
          </button>
        ))}
      </div>

      {/* ── Limit exhausted ── */}
      {limitState && (
        <div className={styles.cmpResults}>
          <div className={styles.requestCard}>
            <p className={styles.requestCopy}>{limitState.message}</p>
            <div className={styles.limitActions}>
              <Link href={limitState.redirect_url} className={styles.btnPrimaryLink}>
                Join Pro Waitlist
              </Link>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className={styles.cmpResults}>
          <p className={styles.formErr}>{error}</p>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className={styles.cmpResults}>
          <div className={styles.cmpLoading}>
            <div className={styles.cmpLdots}>
              <div className={styles.cmpLdot} />
              <div className={styles.cmpLdot} />
              <div className={styles.cmpLdot} />
            </div>
            <div className={styles.cmpLtext}>Screening and comparing stocks...</div>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {showResults && !loading && results.length === 0 && !limitState && !error && (
        <div className={styles.cmpResults}>
          <div className={styles.cmpEmpty}>
            <div className={styles.cmpEmptyIcon}>⇄</div>
            <h3 className={styles.cmpEmptyTitle}>Choose stocks to compare</h3>
            <p className={styles.cmpEmptyDesc}>
              Add at least two stocks above, then hit Compare to view side-by-side
              Shariah compliance, financials, and market data.
            </p>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {showResults && !loading && results.length > 0 && (
        <div className={styles.cmpResults}>
          {/* Stock Header Cards */}
          <div className={`${styles.cmpHeaderGrid} ${styles.cmpAnim} ${styles.cmpA1}`} style={{ gridTemplateColumns: `repeat(${activeSymbols.length}, 1fr)` }}>
            {activeSymbols.map((symbol) => {
              const stock = slotStock(symbol, allStocks);
              const result = resultBySymbol.get(symbol.toUpperCase());
              if (!stock || !result) return null;
              const chgPct = stock.price_change_pct;
              const chgUp = chgPct != null && chgPct >= 0;
              return (
                <div key={symbol} className={styles.cmpShc}>
                  <div className={styles.cmpShcTop}>
                    <div className={styles.cmpShcLogo}>
                      <StockLogo symbol={stock.symbol} size={36} exchange={stock.exchange} />
                    </div>
                    <div>
                      <div className={styles.cmpShcTicker}>{stock.symbol}</div>
                      <div className={styles.cmpShcName}>{stock.name}</div>
                      <span className={`${styles.cmpShcStatus} ${statusBadgeClass(result.status)}`}>
                        {screeningUiLabel(result.status)}
                      </span>
                    </div>
                  </div>
                  <div className={styles.cmpShcPriceRow}>
                    <span className={styles.cmpShcPrice}>{formatPrice(stock.price)}</span>
                    {chgPct != null && (
                      <span className={`${styles.cmpShcChg} ${chgUp ? styles.cmpShcChgUp : styles.cmpShcChgDown}`}>
                        {chgUp ? "+" : ""}{(chgPct * 100).toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div className={styles.cmpShcGrid}>
                    <div className={styles.cmpShcKv}>
                      <div className={styles.cmpShcK}>Market Cap</div>
                      <div className={styles.cmpShcV}>{formatMcap(stock.market_cap)}</div>
                    </div>
                    <div className={styles.cmpShcKv}>
                      <div className={styles.cmpShcK}>P/E Ratio</div>
                      <div className={styles.cmpShcV}>{stock.pe_ratio != null ? stock.pe_ratio.toFixed(1) : "N/A"}</div>
                    </div>
                    <div className={styles.cmpShcKv}>
                      <div className={styles.cmpShcK}>Sector</div>
                      <div className={styles.cmpShcV}>{stock.sector}</div>
                    </div>
                    <div className={styles.cmpShcKv}>
                      <div className={styles.cmpShcK}>Score</div>
                      <div className={styles.cmpShcV}>{result.screening_score}/100</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Shariah Compliance Table ── */}
          {buildSection("Shariah Compliance", (
            <div className={`${styles.cmpTblWrap} ${styles.cmpAnim} ${styles.cmpA2}`}>
              <table className={styles.cmpCtbl}>
                <thead>
                  <tr>
                    <th>Metric</th>
                    {activeSymbols.map((sym) => (
                      <th key={sym} className={styles.cmpStockTh}>{sym}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Status badges */}
                  {renderMetricRow("Status", "Shariah screening verdict", orderedResults.map((r, i) =>
                    r ? (
                      <span key={i} className={`${styles.cmpTbadge} ${statusBadgeClass(r.status)}`}>
                        {screeningUiLabel(r.status)}
                      </span>
                    ) : "-"
                  ))}

                  {/* Business Activity */}
                  {renderMetricRow("Business Activity", "Sector permissibility", orderedResults.map((r, i) =>
                    r ? (
                      <span key={i} className={r.breakdown.sector_allowed ? styles.cmpPass : styles.cmpFail}>
                        {r.breakdown.sector_allowed ? "Permissible" : "Not Permissible"}
                      </span>
                    ) : "-"
                  ))}

                  {/* Compliance Score rings */}
                  {renderMetricRow("Compliance Score", "0–100 methodology score", orderedResults.map((r, i) =>
                    r ? (
                      <div key={i} className={`${styles.cmpScoreRing} ${scoreRingClass(r.screening_score)}`}>
                        <span className={styles.cmpSn}>{r.screening_score}</span>
                        <span className={styles.cmpSl}>Score</span>
                      </div>
                    ) : "-"
                  ), bestIdx(orderedResults.map((r) => r?.screening_score), "max"))}

                  {renderDividerRow("Financial Ratios")}

                  {/* Debt ratio with bars */}
                  {renderMetricRow("Debt / Market Cap", "Threshold: 33%", orderedResults.map((r, i) => {
                    if (!r) return "-";
                    const val = r.breakdown.debt_to_market_cap_ratio;
                    const status = ratioBarStatus(val, 0.33);
                    return (
                      <div key={i} className={styles.cmpBarW}>
                        <span className={`${styles.cmpMn} ${ratioColorClass(status)}`}>{formatPct(val)}</span>
                        <div className={styles.cmpBarT}>
                          <div className={barFillClass(status)} style={{ width: `${Math.min(val / 0.33 * 100, 100)}%` }} />
                        </div>
                      </div>
                    );
                  }), bestIdx(orderedResults.map((r) => r?.breakdown.debt_to_market_cap_ratio), "min"))}

                  {/* Interest income with bars */}
                  {renderMetricRow("Interest Income", "Threshold: 5%", orderedResults.map((r, i) => {
                    if (!r) return "-";
                    const val = r.breakdown.interest_income_ratio;
                    const status = ratioBarStatus(val, 0.05);
                    return (
                      <div key={i} className={styles.cmpBarW}>
                        <span className={`${styles.cmpMn} ${ratioColorClass(status)}`}>{formatPct(val)}</span>
                        <div className={styles.cmpBarT}>
                          <div className={barFillClass(status)} style={{ width: `${Math.min(val / 0.05 * 100, 100)}%` }} />
                        </div>
                      </div>
                    );
                  }), bestIdx(orderedResults.map((r) => r?.breakdown.interest_income_ratio), "min"))}

                  {/* Receivables with bars */}
                  {renderMetricRow("Receivables / Market Cap", "Threshold: 33%", orderedResults.map((r, i) => {
                    if (!r) return "-";
                    const val = r.breakdown.receivables_to_market_cap_ratio;
                    const status = ratioBarStatus(val, 0.33);
                    return (
                      <div key={i} className={styles.cmpBarW}>
                        <span className={`${styles.cmpMn} ${ratioColorClass(status)}`}>{formatPct(val)}</span>
                        <div className={styles.cmpBarT}>
                          <div className={barFillClass(status)} style={{ width: `${Math.min(val / 0.33 * 100, 100)}%` }} />
                        </div>
                      </div>
                    );
                  }), bestIdx(orderedResults.map((r) => r?.breakdown.receivables_to_market_cap_ratio), "min"))}
                </tbody>
              </table>
            </div>
          ))}

          {/* ── Market & Financials Table ── */}
          {buildSection("Market & Financials", (
            <div className={styles.cmpTblWrap}>
              <table className={styles.cmpCtbl}>
                <thead>
                  <tr>
                    <th>Metric</th>
                    {activeSymbols.map((sym) => (
                      <th key={sym} className={styles.cmpStockTh}>{sym}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {renderMetricRow("Price", "Current trading price", orderedStocks.map((s) =>
                    s ? formatPrice(s.price) : "-"
                  ))}
                  {renderMetricRow("Market Cap", "Total market capitalisation", orderedStocks.map((s) =>
                    s ? formatMcap(s.market_cap) : "-"
                  ), bestIdx(orderedStocks.map((s) => s?.market_cap), "max"))}
                  {renderMetricRow("P/E Ratio", "Price to earnings", orderedStocks.map((s) =>
                    s?.pe_ratio != null ? s.pe_ratio.toFixed(1) : "N/A"
                  ), bestIdx(orderedStocks.map((s) => s?.pe_ratio), "min"))}
                  {renderMetricRow("EPS", "Earnings per share", orderedStocks.map((s) =>
                    s?.eps != null ? `₹${s.eps.toFixed(2)}` : "N/A"
                  ), bestIdx(orderedStocks.map((s) => s?.eps), "max"))}
                  {renderMetricRow("Dividend Yield", "Annual dividend yield", orderedStocks.map((s) =>
                    s?.dividend_yield != null ? `${(s.dividend_yield * 100).toFixed(2)}%` : "N/A"
                  ), bestIdx(orderedStocks.map((s) => s?.dividend_yield), "max"))}
                  {renderMetricRow("Beta", "Volatility measure", orderedStocks.map((s) =>
                    s?.beta != null ? s.beta.toFixed(2) : "N/A"
                  ))}
                  {renderMetricRow("52W High", "52-week high", orderedStocks.map((s) =>
                    s?.week_52_high != null ? formatPrice(s.week_52_high) : "N/A"
                  ))}
                  {renderMetricRow("52W Low", "52-week low", orderedStocks.map((s) =>
                    s?.week_52_low != null ? formatPrice(s.week_52_low) : "N/A"
                  ))}
                  {renderMetricRow("Avg Volume", "Average daily volume", orderedStocks.map((s) =>
                    s?.avg_volume != null ? s.avg_volume.toLocaleString("en-IN") : "N/A"
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* ── Profitability Table ── */}
          {buildSection("Profitability", (
            <div className={styles.cmpTblWrap}>
              <table className={styles.cmpCtbl}>
                <thead>
                  <tr>
                    <th>Metric</th>
                    {activeSymbols.map((sym) => (
                      <th key={sym} className={styles.cmpStockTh}>{sym}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {renderMetricRow("ROE", "Return on equity", orderedStocks.map(() => "N/A"))}
                  {renderMetricRow("ROCE", "Return on capital employed", orderedStocks.map(() => "N/A"))}
                  {renderMetricRow("Revenue Growth", "YoY revenue growth", orderedStocks.map(() => "N/A"))}
                  {renderMetricRow("Profit Growth", "YoY profit growth", orderedStocks.map(() => "N/A"))}
                </tbody>
              </table>
            </div>
          ))}

          {/* ── Screening Checklist Table ── */}
          {buildSection("Screening Checklist", (
            <div className={styles.cmpTblWrap}>
              <table className={styles.cmpCtbl}>
                <thead>
                  <tr>
                    <th>Metric</th>
                    {activeSymbols.map((sym) => (
                      <th key={sym} className={styles.cmpStockTh}>{sym}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {renderMetricRow("Last Screened", "Fundamentals data date", orderedStocks.map((s) =>
                    s?.fundamentals_updated_at
                      ? new Date(s.fundamentals_updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : "N/A"
                  ))}
                  {renderMetricRow("Purification Ratio", "Required purification %", orderedResults.map((r) =>
                    r?.purification_ratio_pct != null ? `${r.purification_ratio_pct.toFixed(2)}%` : "N/A"
                  ), bestIdx(orderedResults.map((r) => r?.purification_ratio_pct), "min"))}
                  {renderMetricRow("Debt Check", "≤ 33% of market cap", orderedResults.map((r, i) => {
                    if (!r) return "-";
                    const pass = r.breakdown.debt_to_market_cap_ratio <= 0.33;
                    return <span key={i} className={pass ? styles.cmpPass : styles.cmpFail}>{pass ? "PASS" : "FAIL"}</span>;
                  }))}
                  {renderMetricRow("Interest Income Check", "≤ 5% of revenue", orderedResults.map((r, i) => {
                    if (!r) return "-";
                    const pass = r.breakdown.interest_income_ratio <= 0.05;
                    return <span key={i} className={pass ? styles.cmpPass : styles.cmpFail}>{pass ? "PASS" : "FAIL"}</span>;
                  }))}
                  {renderMetricRow("Receivables Check", "≤ 33% of market cap", orderedResults.map((r, i) => {
                    if (!r) return "-";
                    const pass = r.breakdown.receivables_to_market_cap_ratio <= 0.33;
                    return <span key={i} className={pass ? styles.cmpPass : styles.cmpFail}>{pass ? "PASS" : "FAIL"}</span>;
                  }))}
                </tbody>
              </table>
            </div>
          ))}

          {/* ── Purification Cards ── */}
          {buildSection("Purification", (
            <div className={styles.cmpPurifyGrid} style={{ gridTemplateColumns: `repeat(${activeSymbols.length}, 1fr)` }}>
              {activeSymbols.map((symbol) => {
                const stock = slotStock(symbol, allStocks);
                const result = resultBySymbol.get(symbol.toUpperCase());
                if (!stock || !result) return null;
                const ratio = result.purification_ratio_pct;
                const ratioVal = ratio != null ? ratio : 0;
                const barStatus = ratioBarStatus(ratioVal / 100, 0.05);
                return (
                  <div key={symbol} className={styles.cmpPurifyCard}>
                    <div className={styles.cmpPurifyTicker}>{stock.symbol}</div>
                    <div className={styles.cmpPurifyRatioRow}>
                      <div>
                        <div className={styles.cmpPurifyRatioVal}>
                          {ratio != null ? `${ratio.toFixed(2)}%` : "N/A"}
                        </div>
                        <div className={styles.cmpPurifyRatioLabel}>Purification Ratio</div>
                      </div>
                      <div className={`${styles.cmpScoreRing} ${scoreRingClass(result.screening_score)}`}>
                        <span className={styles.cmpSn}>{result.screening_score}</span>
                        <span className={styles.cmpSl}>Score</span>
                      </div>
                    </div>
                    <div className={styles.cmpPurifyBarRow}>
                      <div className={styles.cmpPurifyBarLabel}>vs 5% Limit</div>
                      <div className={styles.cmpBarT}>
                        <div
                          className={barFillClass(barStatus)}
                          style={{ width: `${Math.min((ratioVal / 5) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className={styles.cmpPurifyNote}>
                      {ratio != null && ratio > 0
                        ? `For every ₹100 of dividend income, ₹${ratio.toFixed(2)} should be purified (donated to charity).`
                        : "No purification required based on current screening data."}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* ── Insights Cards ── */}
          {buildSection("Insights", (
            <div className={styles.cmpInsightGrid} style={{ gridTemplateColumns: `repeat(${activeSymbols.length}, 1fr)` }}>
              {activeSymbols.map((symbol) => {
                const result = resultBySymbol.get(symbol.toUpperCase());
                if (!result) return null;
                const strengths = deriveStrengths(result);
                const risks = deriveRisks(result);
                return (
                  <div key={symbol} className={styles.cmpInsightCard}>
                    <div className={styles.cmpInsightCardHead}>{symbol} — Analysis</div>
                    <div className={styles.cmpInsightBody}>
                      {result.reasons.length > 0 ? result.reasons.join(" ") : "No additional analyst notes available."}
                    </div>
                    <div className={styles.cmpInsightSectionLabel}>Strengths</div>
                    {strengths.map((s, i) => (
                      <div key={i} className={styles.cmpInsightRow}>{s}</div>
                    ))}
                    <div className={styles.cmpInsightSectionLabel} style={{ marginTop: 16 }}>Risks</div>
                    {risks.map((r, i) => (
                      <div key={i} className={styles.cmpInsightRow}>{r}</div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}

          {/* ── Methodology Note ── */}
          <div className={styles.cmpMethodNote} style={{ marginTop: 52 }}>
            <div className={styles.cmpMethodNoteIcon}>ℹ</div>
            <p className={styles.cmpMethodNoteText}>
              All screening data is based on AAOIFI-aligned methodology using publicly available financial statements.
              This is not a fatwa, certification, or investment recommendation. Investors should conduct their own
              due diligence and consult qualified scholars for religious rulings.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

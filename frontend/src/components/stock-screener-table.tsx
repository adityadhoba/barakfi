/**
 * Stock Screener Table Component
 *
 * Interactive data table for browsing halal-screened stocks.
 * Features: filtering, sorting, pagination, bulk export, live price quotes.
 *
 * Key Features:
 * - Filter by status (HALAL, REQUIRES_REVIEW, NON_COMPLIANT)
 * - Filter by market cap range, debt ratio threshold, and sector
 * - Sort by any column (symbol, price, market cap, compliance status, debt)
 * - Paginate through large result sets (default 20 per page)
 * - Export filtered results to CSV (premium feature)
 * - Sync live prices from NSE in background
 * - View mode toggle (table vs card grid)
 * - Save filter sets as reusable screeners
 *
 * Props:
 * - screenedStocks: Pre-screened Stock objects with compliance results
 *
 * State Managed:
 * - Search term, filters (status, mcap, debt, sector)
 * - Sort column and direction
 * - Current page (pagination)
 * - Live quote cache (per-symbol)
 */

"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/toast";
import styles from "@/app/screener.module.css";
import type { ScreeningResult, Stock } from "@/lib/api";
import { useBatchQuotes } from "@/hooks/use-batch-quotes";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ScreenedStock = Stock & { screening: ScreeningResult };

type SortKey = "symbol" | "price" | "market_cap" | "status" | "debt_ratio";
type SortDir = "asc" | "desc";
type ViewMode = "cards" | "table";

const STATUS_ORDER: Record<string, number> = { HALAL: 0, REQUIRES_REVIEW: 1, NON_COMPLIANT: 2 };

type QuickPreset = {
  key: string;
  label: string;
  status?: string;
  minMcap?: number;
  maxMcap?: number;
  maxDebt?: number;
};

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const QUICK_PRESETS: QuickPreset[] = [
  { key: "large-halal", label: "Large Cap Halal", status: "HALAL", minMcap: 100000 },
  { key: "mid-halal", label: "Mid Cap Halal", status: "HALAL", minMcap: 20000, maxMcap: 100000 },
  { key: "small-cap", label: "Small Cap", maxMcap: 20000 },
  { key: "low-debt", label: "Low Debt", maxDebt: 0.15 },
  { key: "review", label: "Needs Review", status: "REQUIRES_REVIEW" },
];

const STATUS_CONFIG: Record<string, { badge: string; label: string; desc: string }> = {
  HALAL: { badge: "badgeHalal", label: "Halal", desc: "Passes Shariah checks" },
  REQUIRES_REVIEW: { badge: "badgeReview", label: "Review", desc: "Needs verification" },
  NON_COMPLIANT: { badge: "badgeFail", label: "Avoid", desc: "Outside rules" },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/** Format number as Indian Rupees (₹). */
function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

/** Format market cap in readable units: 1000+ Cr, 100+ L. */
function formatMcap(value: number) {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(0)} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)} L`;
  return formatPrice(value);
}

/** Format ratio as percentage string: 0.15 -> "15.0%". */
function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

/** Determine color for ratio bar based on threshold. Returns good/warn/bad. */
function ratioColor(value: number, threshold: number): "good" | "warn" | "bad" {
  if (value <= threshold * 0.7) return "good";
  if (value <= threshold) return "warn";
  return "bad";
}

/** Map ratio color to CSS class name. */
function barColorClass(color: "good" | "warn" | "bad") {
  if (color === "good") return styles.ratioBarFillGood;
  if (color === "warn") return styles.ratioBarFillWarn;
  return styles.ratioBarFillBad;
}

/** Extract sortable value from stock by key (for column sorting). */
function getSortValue(s: ScreenedStock, key: SortKey): number | string {
  switch (key) {
    case "symbol": return s.symbol;
    case "price": return s.price;
    case "market_cap": return s.market_cap;
    case "status": return STATUS_ORDER[s.screening.status] ?? 9;
    case "debt_ratio": return s.screening.breakdown.debt_to_36m_avg_market_cap_ratio;
  }
}

/** Mini compliance bar for stock cards — visual progress toward threshold */
function MiniBar({ label, value, limit }: { label: string; value: number; limit: number }) {
  const pct = Math.min((value / (limit * 1.5)) * 100, 100);
  const color = value <= limit * 0.7 ? "Good" : value <= limit ? "Warn" : "Bad";
  return (
    <div className={styles.miniBar}>
      <div className={styles.miniBarHeader}>
        <span className={styles.miniBarLabel}>{label}</span>
        <span className={`${styles.miniBarValue} ${styles[`miniBar${color}`]}`}>{formatPct(value)}</span>
      </div>
      <div className={styles.miniBarTrack}>
        <div
          className={`${styles.miniBarFill} ${styles[`miniBarFill${color}`]}`}
          style={{ width: `${pct}%` }}
        />
        <div className={styles.miniBarThreshold} style={{ left: `${(limit / (limit * 1.5)) * 100}%` }} />
      </div>
    </div>
  );
}

type Props = {
  screenedStocks: ScreenedStock[];
};

function exportToCsv(stocks: ScreenedStock[]) {
  const header = ["Symbol", "Name", "Sector", "Price (INR)", "Market Cap (Cr)", "Status", "Debt/36m Avg Mcap", "Debt/Mcap", "Non-Permissible Income", "Interest Income", "Receivables/Mcap", "Cash & IB/Assets", "Sector Allowed"];
  const rows = stocks.map((s) => {
    const b = s.screening.breakdown;
    return [
      s.symbol,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.sector}"`,
      s.price.toFixed(2),
      (s.market_cap / 100).toFixed(2),
      s.screening.status,
      (b.debt_to_36m_avg_market_cap_ratio * 100).toFixed(2) + "%",
      (b.debt_to_market_cap_ratio * 100).toFixed(2) + "%",
      (b.non_permissible_income_ratio * 100).toFixed(2) + "%",
      (b.interest_income_ratio * 100).toFixed(2) + "%",
      (b.receivables_to_market_cap_ratio * 100).toFixed(2) + "%",
      (b.cash_and_interest_bearing_to_assets_ratio * 100).toFixed(2) + "%",
      b.sector_allowed ? "Yes" : "No",
    ].join(",");
  });
  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `barakfi-screener-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function StockScreenerTable({ screenedStocks }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("All");
  const [sortKey, setSortKey] = useState<SortKey>("market_cap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const deferredQuery = useDeferredValue(query);

  // Pagination
  const PAGE_SIZE = 24;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Save filter state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState("");
  const [isSavingFilter, setIsSavingFilter] = useState(false);

  // Batch fetch live quotes for price change indicators
  const allSymbols = useMemo(() => screenedStocks.map((s) => s.symbol), [screenedStocks]);
  const quotes = useBatchQuotes(allSymbols);

  // Read filters from URL on mount
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    const st = searchParams.get("status");
    if (st === "HALAL" || st === "REQUIRES_REVIEW" || st === "NON_COMPLIANT") {
      setStatusFilter(st);
    }
    const sec = searchParams.get("sector");
    if (sec) {
      const decoded = decodeURIComponent(sec);
      const known = new Set(screenedStocks.map((s) => s.sector));
      if (known.has(decoded)) setSectorFilter(decoded);
    }
    const q = searchParams.get("q");
    if (q) setQuery(decodeURIComponent(q));
    const v = searchParams.get("view");
    if (v === "table" || v === "cards") setViewMode(v);
    const sort = searchParams.get("sort");
    if (sort && ["symbol", "price", "market_cap", "status", "debt_ratio"].includes(sort)) {
      setSortKey(sort as SortKey);
    }
    const dir = searchParams.get("dir");
    if (dir === "asc" || dir === "desc") setSortDir(dir);
    const pre = searchParams.get("preset");
    if (pre && QUICK_PRESETS.some((p) => p.key === pre)) setActivePreset(pre);
    setInitialized(true);
  }, [searchParams, screenedStocks]);

  // Write filters to URL when they change (after initial load)
  useEffect(() => {
    if (!initialized) return;
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (sectorFilter !== "All") params.set("sector", sectorFilter);
    if (query.trim()) params.set("q", query.trim());
    if (viewMode !== "cards") params.set("view", viewMode);
    if (sortKey !== "market_cap") params.set("sort", sortKey);
    if (sortDir !== "desc") params.set("dir", sortDir);
    if (activePreset) params.set("preset", activePreset);
    const qs = params.toString();
    const url = qs ? `/screener?${qs}` : "/screener";
    router.replace(url, { scroll: false });
  }, [initialized, statusFilter, sectorFilter, query, viewMode, sortKey, sortDir, activePreset, router]);

  const sectorCounts = useMemo(() => {
    const counts: Record<string, number> = { All: screenedStocks.length };
    for (const s of screenedStocks) {
      counts[s.sector] = (counts[s.sector] || 0) + 1;
    }
    return counts;
  }, [screenedStocks]);

  const sectors = useMemo(() => {
    return ["All", ...Object.keys(sectorCounts).filter((k) => k !== "All").sort()];
  }, [sectorCounts]);

  const preset = QUICK_PRESETS.find((p) => p.key === activePreset) ?? null;

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return screenedStocks.filter((s) => {
      if (q && !s.symbol.toLowerCase().includes(q) && !s.name.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && s.screening.status !== statusFilter) return false;
      if (sectorFilter !== "All" && s.sector !== sectorFilter) return false;
      // Quick preset filters
      if (preset) {
        if (preset.status && s.screening.status !== preset.status) return false;
        if (preset.minMcap && s.market_cap < preset.minMcap) return false;
        if (preset.maxMcap && s.market_cap > preset.maxMcap) return false;
        if (preset.maxDebt && s.screening.breakdown.debt_to_36m_avg_market_cap_ratio > preset.maxDebt) return false;
      }
      return true;
    });
  }, [screenedStocks, deferredQuery, statusFilter, sectorFilter, preset]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "symbol" ? "asc" : "desc"); }
  }

  // Reset focus and pagination when results change
  useEffect(() => { setFocusedIdx(-1); setVisibleCount(PAGE_SIZE); }, [sorted.length]);

  // Keyboard navigation: j/k to move, Enter to open stock
  const handleKeyNav = useCallback((e: KeyboardEvent) => {
    // Don't capture when user is typing in an input
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx((prev) => Math.min(prev + 1, sorted.length - 1));
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && focusedIdx >= 0 && focusedIdx < sorted.length) {
      e.preventDefault();
      router.push(`/stocks/${encodeURIComponent(sorted[focusedIdx].symbol)}`);
    } else if (e.key === "Escape") {
      setFocusedIdx(-1);
    }
  }, [sorted, focusedIdx, router]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyNav);
    return () => document.removeEventListener("keydown", handleKeyNav);
  }, [handleKeyNav]);

  // Save current filter as a named screener
  async function handleSaveFilter() {
    if (!saveFilterName.trim()) return;
    setIsSavingFilter(true);
    try {
      const statusMap: Record<string, string> = {
        all: "all",
        HALAL: "halal",
        REQUIRES_REVIEW: "requires_review",
        NON_COMPLIANT: "non_compliant",
      };
      const response = await fetch("/api/saved-screeners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveFilterName.trim(),
          search_query: query.trim() || "",
          sector: sectorFilter,
          status_filter: statusMap[statusFilter] || "all",
          halal_only: statusFilter === "HALAL",
          notes: activePreset ? `Preset: ${activePreset}` : "",
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || "Failed to save");
      }
      toast(`Filter "${saveFilterName.trim()}" saved`, "success");
      setShowSaveModal(false);
      setSaveFilterName("");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to save filter", "error");
    } finally {
      setIsSavingFilter(false);
    }
  }

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIdx < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-stock-idx]");
    items[focusedIdx]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedIdx]);

  const hasActiveFilters = statusFilter !== "all" || sectorFilter !== "All" || query.trim() !== "" || activePreset !== null;

  function resetAllFilters() {
    setQuery("");
    setStatusFilter("all");
    setSectorFilter("All");
    setActivePreset(null);
    setSortKey("market_cap");
    setSortDir("desc");
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <>
      <div className={styles.toolbarSticky}>
        <div className={styles.toolbar}>
          <div className={`${styles.toolbarRow} ${styles.toolbarRowMain}`}>
            <div className={styles.searchBox}>
              <span className={styles.searchIcon} aria-hidden>&#x2315;</span>
              <input
                type="search"
                placeholder="Search name or symbol..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search stocks"
              />
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                className={styles.resetBtn}
                onClick={resetAllFilters}
                title="Clear all filters"
              >
                Reset All
              </button>
            )}
          </div>

          <div className={`${styles.toolbarRow} ${styles.toolbarRowPresets}`}>
            {QUICK_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`${styles.presetChip} ${activePreset === p.key ? styles.presetChipActive : ""}`}
                onClick={() => setActivePreset(activePreset === p.key ? null : p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Sector chips with counts */}
          <div className={`${styles.toolbarRow} ${styles.toolbarRowSectors}`}>
            {sectors.map((sec) => (
              <button
                key={sec}
                type="button"
                className={`${styles.sectorChip} ${sectorFilter === sec ? styles.sectorChipActive : ""}`}
                onClick={() => setSectorFilter(sec)}
              >
                {sec === "All" ? "All Sectors" : sec}
                <span className={styles.sectorChipCount}>{sectorCounts[sec] || 0}</span>
              </button>
            ))}
          </div>

          <div className={`${styles.toolbarRow} ${styles.toolbarRowFilters}`}>
            <div className={styles.filterGroup}>
              {(["all", "HALAL", "REQUIRES_REVIEW", "NON_COMPLIANT"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`${styles.filterChip} ${statusFilter === st ? styles.filterChipActive : ""}`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st === "all" ? "All" : STATUS_CONFIG[st]?.label || st}
                </button>
              ))}
            </div>

            <div className={styles.toolbarRight}>
              <div className={styles.viewToggle} role="group" aria-label="View mode">
                <button
                  type="button"
                  className={`${styles.viewToggleBtn} ${viewMode === "cards" ? styles.viewToggleBtnActive : ""}`}
                  onClick={() => setViewMode("cards")}
                >
                  Cards
                </button>
                <button
                  type="button"
                  className={`${styles.viewToggleBtn} ${viewMode === "table" ? styles.viewToggleBtnActive : ""}`}
                  onClick={() => setViewMode("table")}
                >
                  Table
                </button>
              </div>

              <Link href="/compare" className={styles.compareLink}>
                Compare
              </Link>

              <button
                type="button"
                className={styles.saveFilterBtn}
                onClick={() => setShowSaveModal(true)}
                title="Save current filter as a named screener"
              >
                Save Filter
              </button>

              <button
                type="button"
                className={styles.exportBtn}
                onClick={() => {
                  exportToCsv(sorted);
                  toast(`Exported ${sorted.length} stocks to CSV`, "success");
                }}
                title="Export filtered results to CSV"
              >
                &#x2913; Export
              </button>

              <span className={styles.resultCount}>
                {sorted.length} results
                <span className={styles.kbdHint} aria-hidden>
                  <kbd>j</kbd><kbd>k</kbd> navigate
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {viewMode === "cards" && (
        <div className={styles.stockCardGrid} ref={listRef}>
          {sorted.slice(0, visibleCount).map((s, idx) => {
            const cfg = STATUS_CONFIG[s.screening.status] || STATUS_CONFIG.REQUIRES_REVIEW;
            const b = s.screening.breakdown;

            return (
              <Link
                className={`${styles.stockCardItem} ${focusedIdx === idx ? styles.stockCardFocused : ""} ${
                  s.screening.status === "HALAL" ? styles.stockCardHalal
                  : s.screening.status === "REQUIRES_REVIEW" ? styles.stockCardReview
                  : styles.stockCardFail
                }`}
                href={`/stocks/${encodeURIComponent(s.symbol)}`}
                key={s.symbol}
                data-stock-idx={idx}
              >
                <div className={styles.stockCardInner}>
                  {/* Header: Symbol + Badge */}
                  <div className={styles.stockCardTop}>
                    <div>
                      <span className={styles.stockCardSymbol}>{s.symbol}</span>
                      <span className={styles.stockCardName}>{s.name}</span>
                    </div>
                    <span className={`${styles.badge} ${styles[cfg.badge]}`}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Price + Sector */}
                  <div className={styles.stockCardMiddle}>
                    <div className={styles.stockCardPrice}>
                      {formatPrice(quotes[s.symbol]?.last_price ?? s.price)}
                      {quotes[s.symbol]?.change_percent != null && (
                        <span className={
                          (quotes[s.symbol].change_percent ?? 0) >= 0
                            ? styles.stockCardChangeUp
                            : styles.stockCardChangeDown
                        }>
                          {(quotes[s.symbol].change_percent ?? 0) >= 0 ? "+" : ""}
                          {(quotes[s.symbol].change_percent ?? 0).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <div className={styles.stockCardMeta}>
                      <span className={styles.stockCardTag}>{s.sector}</span>
                      <span className={styles.stockCardMcap}>{formatMcap(s.market_cap)}</span>
                    </div>
                  </div>

                  {/* Compliance Bars */}
                  <div className={styles.stockCardBars}>
                    <MiniBar label="Debt" value={b.debt_to_36m_avg_market_cap_ratio} limit={0.33} />
                    <MiniBar label="Income" value={b.non_permissible_income_ratio} limit={0.05} />
                    <MiniBar label="Receivables" value={b.receivables_to_market_cap_ratio} limit={0.33} />
                  </div>
                </div>
              </Link>
            );
          })}

          {sorted.length === 0 && (
            <div className={styles.emptyState} style={{ gridColumn: "1 / -1" }}>
              <div className={styles.emptyIcon} aria-hidden>&#x1F50D;</div>
              <h3 className={styles.emptyTitle}>No stocks found</h3>
              <p className={styles.emptyDesc}>
                No stocks match your current filters. Try adjusting your search, sector, or status filter.
              </p>
              {hasActiveFilters && (
                <button type="button" className={styles.resetBtn} onClick={resetAllFilters}>
                  Reset All Filters
                </button>
              )}
            </div>
          )}

          {visibleCount < sorted.length && (
            <div className={styles.showMoreWrap} style={{ gridColumn: "1 / -1" }}>
              <button
                type="button"
                className={styles.showMoreBtn}
                onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, sorted.length))}
              >
                Show more ({sorted.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {viewMode === "table" && (
        <div className={styles.tableWrap} ref={listRef}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={sortKey === "symbol" ? styles.thActive : ""} scope="col" onClick={() => handleSort("symbol")}>
                  Stock{sortKey === "symbol" && <span className={styles.sortArrow}>{sortDir === "asc" ? " ▲" : " ▼"}</span>}
                </th>
                <th
                  className={`${styles.thNumeric} ${sortKey === "price" ? styles.thActive : ""}`}
                  scope="col"
                  onClick={() => handleSort("price")}
                >
                  Price{sortKey === "price" && <span className={styles.sortArrow}>{sortDir === "asc" ? " ▲" : " ▼"}</span>}
                </th>
                <th
                  className={`${styles.thNumeric} ${sortKey === "market_cap" ? styles.thActive : ""}`}
                  scope="col"
                  onClick={() => handleSort("market_cap")}
                >
                  Mcap{sortKey === "market_cap" && <span className={styles.sortArrow}>{sortDir === "asc" ? " ▲" : " ▼"}</span>}
                </th>
                <th scope="col">Sector</th>
                <th className={sortKey === "status" ? styles.thActive : ""} scope="col" onClick={() => handleSort("status")}>
                  Shariah{sortKey === "status" && <span className={styles.sortArrow}>{sortDir === "asc" ? " ▲" : " ▼"}</span>}
                </th>
                <th
                  className={`${styles.thNumeric} ${sortKey === "debt_ratio" ? styles.thActive : ""}`}
                  scope="col"
                  onClick={() => handleSort("debt_ratio")}
                >
                  Debt{sortKey === "debt_ratio" && <span className={styles.sortArrow}>{sortDir === "asc" ? " ▲" : " ▼"}</span>}
                </th>
                <th className={styles.thNumeric} scope="col">Income</th>
                <th className={styles.navCell} scope="col" aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, visibleCount).map((s, idx) => {
                const cfg = STATUS_CONFIG[s.screening.status] || STATUS_CONFIG.REQUIRES_REVIEW;
                const b = s.screening.breakdown;
                return (
                  <tr
                    key={s.symbol}
                    data-stock-idx={idx}
                    className={focusedIdx === idx ? styles.tableRowFocused : undefined}
                    onClick={() => router.push(`/stocks/${encodeURIComponent(s.symbol)}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/stocks/${encodeURIComponent(s.symbol)}`);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open ${s.symbol}`}
                  >
                    <td>
                      <div className={styles.stockCell}>
                        <span className={styles.stockSymbol}>{s.symbol}</span>
                        <span className={styles.stockName}>{s.name}</span>
                      </div>
                    </td>
                    <td className={styles.priceCell}>
                      <span>{formatPrice(quotes[s.symbol]?.last_price ?? s.price)}</span>
                      {quotes[s.symbol]?.change_percent != null && (
                        <span className={
                          (quotes[s.symbol].change_percent ?? 0) >= 0
                            ? styles.tablePriceUp
                            : styles.tablePriceDown
                        }>
                          {(quotes[s.symbol].change_percent ?? 0) >= 0 ? "+" : ""}
                          {(quotes[s.symbol].change_percent ?? 0).toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className={styles.mcapCell}>{formatMcap(s.market_cap)}</td>
                    <td className={styles.sectorCell}>{s.sector}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[cfg.badge]}`}>{cfg.label}</span>
                    </td>
                    <td className={styles.ratioCell}>
                      <div className={styles.ratioRow}>
                        <span style={{ fontSize: "0.78rem", textAlign: "right" }}>{formatPct(b.debt_to_36m_avg_market_cap_ratio)}</span>
                        <div className={styles.ratioBar}>
                          <div
                            className={`${styles.ratioBarFill} ${barColorClass(ratioColor(b.debt_to_36m_avg_market_cap_ratio, 0.33))}`}
                            style={{ width: `${Math.min(b.debt_to_36m_avg_market_cap_ratio / 0.5 * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className={styles.ratioCell}>
                      <div className={styles.ratioRow}>
                        <span style={{ fontSize: "0.78rem", textAlign: "right" }}>{formatPct(b.non_permissible_income_ratio)}</span>
                        <div className={styles.ratioBar}>
                          <div
                            className={`${styles.ratioBarFill} ${barColorClass(ratioColor(b.non_permissible_income_ratio, 0.05))}`}
                            style={{ width: `${Math.min(b.non_permissible_income_ratio / 0.1 * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className={styles.navCell} aria-hidden>&rarr;</td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={8} className={styles.tableEmpty}>No stocks match your filters.</td></tr>
              )}
            </tbody>
          </table>
          {visibleCount < sorted.length && (
            <div className={styles.showMoreWrap}>
              <button
                type="button"
                className={styles.showMoreBtn}
                onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, sorted.length))}
              >
                Show more ({sorted.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}
      {/* Save Filter Modal */}
      {showSaveModal && (
        <div className={styles.saveFilterOverlay} onClick={() => setShowSaveModal(false)}>
          <div className={styles.saveFilterModal} onClick={(e) => e.stopPropagation()}>
            <h3>Save Current Filter</h3>
            <p>
              {statusFilter !== "all" ? `Status: ${statusFilter} · ` : ""}
              {sectorFilter !== "All" ? `Sector: ${sectorFilter} · ` : ""}
              {query.trim() ? `Search: "${query.trim()}" · ` : ""}
              {sorted.length} results
            </p>
            <input
              className={styles.saveFilterInput}
              type="text"
              placeholder="e.g. Large cap halal IT stocks"
              value={saveFilterName}
              onChange={(e) => setSaveFilterName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveFilter(); }}
              autoFocus
              maxLength={80}
            />
            <div className={styles.saveFilterActions}>
              <button
                type="button"
                className={styles.saveFilterCancel}
                onClick={() => setShowSaveModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.saveFilterSubmit}
                disabled={isSavingFilter || !saveFilterName.trim()}
                onClick={handleSaveFilter}
              >
                {isSavingFilter ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

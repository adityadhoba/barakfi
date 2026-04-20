"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/toast";
import styles from "@/app/screener.module.css";
import type { ScreeningResult, Stock } from "@/lib/api";
import { useBatchQuotes } from "@/hooks/use-batch-quotes";
import { AdUnit } from "@/components/ad-unit";
import { StockPreviewPopup } from "@/components/stock-preview-popup";
import { StockLogo } from "@/components/stock-logo";
import { INDEX_OPTIONS, matchesIndex } from "@/lib/index-membership";
import { useIsMobileSidebarBreakpoint } from "@/hooks/use-is-mobile";
import { exchangeForBatchQuote } from "@/lib/exchange-for-quotes";
import { formatMcapShort, resolveDisplayCurrency } from "@/lib/currency-format";
import { useScreening } from "@/contexts/screening-context";
import {
  SCREENING_LEGAL_DISCLAIMER,
  SCREENING_STATUS_TOOLTIP,
  screeningUiLabel,
} from "@/lib/screening-status";
import { PRIMARY_METHODOLOGY_VERSION } from "@/lib/methodology-version";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type ScreenedStock = Stock & { screening: ScreeningResult };
type SortKey = "symbol" | "price" | "market_cap" | "status" | "debt_ratio" | "income_purity";
type SortDir = "asc" | "desc";

const STATUS_ORDER: Record<string, number> = { HALAL: 0, CAUTIOUS: 1, NON_COMPLIANT: 2 };

const STATUS_OPTIONS = [
  { key: "all", label: "All Stocks" },
  { key: "HALAL", label: "Shariah Compliant" },
  { key: "CAUTIOUS", label: "Requires Review" },
  { key: "NON_COMPLIANT", label: "Not Compliant" },
] as const;

const MCAP_OPTIONS = [
  { key: "all", label: "All", min: 0, max: Infinity },
  { key: "large", label: "Large Cap", min: 100000, max: Infinity },
  { key: "mid", label: "Mid Cap", min: 20000, max: 100000 },
  { key: "small", label: "Small Cap", min: 0, max: 20000 },
] as const;

const STATUS_CONFIG: Record<string, { cls: string; label: string }> = {
  HALAL: { cls: "statusHalal", label: "Shariah Compliant" },
  CAUTIOUS: { cls: "statusReview", label: "Requires Review" },
  NON_COMPLIANT: { cls: "statusFail", label: "Not Compliant" },
};

/** Shown under search — `value` is what we put in the query (symbol or substring). */
const EXAMPLE_STOCK_CHIPS = [
  { label: "Reliance", value: "RELIANCE" },
  { label: "TCS", value: "TCS" },
  { label: "Infosys", value: "INFY" },
  { label: "HDFC Bank", value: "HDFCBANK" },
] as const;

function formatPrice(value: number, currency?: string) {
  const locale = currency === "GBP" ? "en-GB" : currency === "USD" ? "en-US" : "en-IN";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatEventDate(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Render market cap; shows a subtle "Syncing" badge when no price data exists yet. */
function McapCell({ marketCap, currency }: { marketCap: number; currency: "INR" | "USD" | "GBP" }) {
  if (marketCap === 0) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          fontSize: "0.72rem",
          fontWeight: 500,
          color: "var(--text-tertiary)",
          background: "var(--bg-soft)",
          border: "1px solid var(--line)",
          borderRadius: "4px",
          padding: "2px 6px",
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
        }}
        title="Price data not yet available — will update after next EOD sync"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Pending
      </span>
    );
  }
  return <>{formatMcapShort(marketCap, currency)}</>;
}

/** Render sector; shows dash for "Unknown" sectors not yet synced. */
function SectorCell({ sector }: { sector: string }) {
  if (!sector || sector === "Unknown") {
    return <span style={{ color: "var(--text-tertiary)" }}>—</span>;
  }
  return <>{sector}</>;
}

function getSortValue(
  s: ScreenedStock,
  key: SortKey,
  livePrice?: number | null,
): number | string {
  switch (key) {
    case "symbol": return s.symbol;
    case "price": return livePrice ?? s.price;
    case "market_cap": return s.market_cap;
    case "status": return STATUS_ORDER[s.screening.status] ?? 9;
    case "debt_ratio": return s.screening.breakdown.debt_to_36m_avg_market_cap_ratio;
    case "income_purity": return s.screening.breakdown.non_permissible_income_ratio;
  }
}

function exportToCsv(stocks: ScreenedStock[]) {
  const header = ["Symbol", "Name", "Sector", "Price", "Market Cap (Cr)", "Status", "Debt Ratio", "Income Purity"];
  const rows = stocks.map((s) => {
    const b = s.screening.breakdown;
    return [
      s.symbol,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.sector}"`,
      s.price.toFixed(2),
      s.market_cap.toFixed(2),
      s.screening.status,
      (b.debt_to_36m_avg_market_cap_ratio * 100).toFixed(2) + "%",
      (b.non_permissible_income_ratio * 100).toFixed(2) + "%",
    ].join(",");
  });
  const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `barakfi-screener-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type Props = { screenedStocks: ScreenedStock[] };

export function StockScreenerTable({ screenedStocks }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { unlockDetails } = useScreening();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [mcapFilter, setMcapFilter] = useState("all");
  const [indexFilter, setIndexFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("market_cap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const isMobileLayout = useIsMobileSidebarBreakpoint();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 960px)");
    const sync = () => setSidebarOpen(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const listRef = useRef<HTMLDivElement>(null);
  const tableBodyRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);

  const applyExampleChip = useCallback((value: string) => {
    setQuery(value);
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  }, []);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState("");
  const [isSavingFilter, setIsSavingFilter] = useState(false);
  const [pendingSymbol, setPendingSymbol] = useState<string | null>(null);

  const allSymbols = useMemo(() => screenedStocks.map((s) => s.symbol), [screenedStocks]);
  const exchangeBySymbol = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of screenedStocks) {
      m[s.symbol] = exchangeForBatchQuote(s.exchange, s.currency);
    }
    return m;
  }, [screenedStocks]);
  const quotes = useBatchQuotes(allSymbols, exchangeBySymbol);

  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    const st = searchParams.get("status");
    if (st === "HALAL" || st === "CAUTIOUS" || st === "NON_COMPLIANT") setStatusFilter(st);
    const sec = searchParams.get("sector");
    if (sec) {
      const decoded = decodeURIComponent(sec);
      const known = new Set(screenedStocks.map((s) => s.sector));
      if (known.has(decoded)) setSectorFilter(decoded);
    }
    const q = searchParams.get("q");
    if (q) setQuery(decodeURIComponent(q));
    const sort = searchParams.get("sort");
    if (sort && ["symbol", "price", "market_cap", "status", "debt_ratio", "income_purity"].includes(sort)) setSortKey(sort as SortKey);
    const dir = searchParams.get("dir");
    if (dir === "asc" || dir === "desc") setSortDir(dir);
    const mcap = searchParams.get("mcap");
    if (mcap && MCAP_OPTIONS.some((o) => o.key === mcap)) setMcapFilter(mcap);
    const idx = searchParams.get("index");
    if (idx && INDEX_OPTIONS.some((o) => o.key === idx)) setIndexFilter(idx);
    setInitialized(true);
  }, [searchParams, screenedStocks]);

  useEffect(() => {
    if (!initialized) return;
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (sectorFilter !== "All") params.set("sector", sectorFilter);
    if (query.trim()) params.set("q", query.trim());
    if (sortKey !== "market_cap") params.set("sort", sortKey);
    if (sortDir !== "desc") params.set("dir", sortDir);
    if (mcapFilter !== "all") params.set("mcap", mcapFilter);
    if (indexFilter !== "all") params.set("index", indexFilter);
    const qs = params.toString();
    const base = qs ? `/screener?${qs}` : "/screener";
    const hash =
      typeof window !== "undefined" && window.location.hash === "#stock-search"
        ? "#stock-search"
        : "";
    router.replace(`${base}${hash}`, { scroll: false });
  }, [initialized, statusFilter, sectorFilter, query, sortKey, sortDir, mcapFilter, indexFilter, router]);

  const sectorCounts = useMemo(() => {
    const counts: Record<string, number> = { All: screenedStocks.length };
    for (const s of screenedStocks) counts[s.sector] = (counts[s.sector] || 0) + 1;
    return counts;
  }, [screenedStocks]);

  const sectors = useMemo(
    () => ["All", ...Object.keys(sectorCounts).filter((k) => k !== "All" && k !== "Unknown").sort()],
    [sectorCounts],
  );

  const mcapOpt = MCAP_OPTIONS.find((o) => o.key === mcapFilter) ?? MCAP_OPTIONS[0];

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return screenedStocks.filter((s) => {
      if (q) {
        const aliasHit = (s.search_aliases || []).some((a) => a.toLowerCase().includes(q));
        if (
          !s.symbol.toLowerCase().includes(q) &&
          !s.name.toLowerCase().includes(q) &&
          !s.sector.toLowerCase().includes(q) &&
          !aliasHit
        ) {
          return false;
        }
      }
      if (statusFilter !== "all" && s.screening.status !== statusFilter) return false;
      if (sectorFilter !== "All" && s.sector !== sectorFilter) return false;
      if (mcapFilter !== "all" && (s.market_cap < mcapOpt.min || s.market_cap >= mcapOpt.max)) return false;
      if (indexFilter !== "all" && !matchesIndex(s.symbol, indexFilter, s.index_memberships)) return false;
      return true;
    });
  }, [screenedStocks, deferredQuery, statusFilter, sectorFilter, mcapFilter, mcapOpt, indexFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const va = getSortValue(a, sortKey, quotes[a.symbol]?.last_price);
      const vb = getSortValue(b, sortKey, quotes[b.symbol]?.last_price);
      if (typeof va === "number" && typeof vb === "number") return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [filtered, sortKey, sortDir, quotes]);

  // Virtual list — all sorted items in memory, only ~20 rendered in DOM at a time
  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => tableBodyRef.current,
    estimateSize: () => 52,
    overscan: 8,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => { setFocusedIdx(-1); tableBodyRef.current?.scrollTo({ top: 0 }); }, [sorted.length]);

  useEffect(() => {
    if (!initialized) return;
    const run = () => {
      if (typeof window === "undefined") return;
      if (window.location.hash !== "#stock-search") return;
      setQuery("");
      const el = searchInputRef.current;
      if (!el) return;
      const reduceMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      window.setTimeout(() => {
        el.focus();
        el.select();
      }, 280);
    };
    run();
    window.addEventListener("hashchange", run);
    return () => window.removeEventListener("hashchange", run);
  }, [initialized, setQuery]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "symbol" ? "asc" : "desc"); }
  }

  const handleSeeWhy = useCallback(async (symbol: string) => {
    setPendingSymbol(symbol);
    const result = await unlockDetails(symbol);
    setPendingSymbol(null);

    if (result.kind === "granted") {
      router.push(`/stocks/${encodeURIComponent(symbol)}`);
      return;
    }

    if (result.kind === "redirect") {
      router.push(result.url);
      return;
    }

    if (result.kind === "limit_exhausted") {
      toast(result.message, "error");
      if (result.redirectUrl) {
        router.push(result.redirectUrl);
      }
      return;
    }

    toast(result.message, "error");
  }, [router, toast, unlockDetails]);

  const handleKeyNav = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); setFocusedIdx((p) => Math.min(p + 1, sorted.length - 1)); }
    else if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); setFocusedIdx((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter" && focusedIdx >= 0 && focusedIdx < sorted.length) {
      e.preventDefault();
      void handleSeeWhy(sorted[focusedIdx].symbol);
    }
    else if (e.key === "Escape") setFocusedIdx(-1);
  }, [focusedIdx, handleSeeWhy, sorted]);

  useEffect(() => { document.addEventListener("keydown", handleKeyNav); return () => document.removeEventListener("keydown", handleKeyNav); }, [handleKeyNav]);

  // Scroll focused row into view inside the virtual container
  useEffect(() => {
    if (focusedIdx < 0) return;
    rowVirtualizer.scrollToIndex(focusedIdx, { align: "auto" });
  }, [focusedIdx, rowVirtualizer]);

  const hasActiveFilters = statusFilter !== "all" || sectorFilter !== "All" || mcapFilter !== "all" || indexFilter !== "all" || query.trim() !== "";

  function resetAllFilters() {
    setQuery(""); setStatusFilter("all"); setSectorFilter("All"); setMcapFilter("all"); setIndexFilter("all");
    setSortKey("market_cap"); setSortDir("desc");
  }

  const filterCount = [statusFilter !== "all", sectorFilter !== "All", mcapFilter !== "all", indexFilter !== "all", query.trim() !== ""].filter(Boolean).length;

  async function handleSaveFilter() {
    if (!saveFilterName.trim()) return;
    setIsSavingFilter(true);
    try {
      const statusMap: Record<string, string> = { all: "all", HALAL: "halal", CAUTIOUS: "cautious", NON_COMPLIANT: "non_compliant" };
      const response = await fetch("/api/saved-screeners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveFilterName.trim(),
          search_query: query.trim() || "",
          sector: sectorFilter,
          status_filter: statusMap[statusFilter] || "all",
          halal_only: statusFilter === "HALAL",
          notes: mcapFilter !== "all" ? `Market Cap: ${mcapFilter}` : "",
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

  function SortTh({ col, children, numeric }: { col: SortKey; children: React.ReactNode; numeric?: boolean }) {
    const active = sortKey === col;
    return (
      <th
        className={`${styles.th} ${active ? styles.thActive : ""} ${numeric ? styles.thRight : ""}`}
        onClick={() => handleSort(col)}
      >
        {children}
        {active && <span className={styles.sortIcon}>{sortDir === "asc" ? " ▲" : " ▼"}</span>}
      </th>
    );
  }

  return (
    <div className={styles.screenerLayout}>
      {isMobileLayout && sidebarOpen && (
        <button
          type="button"
          className={styles.sidebarOverlay}
          aria-label="Close filters"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* ── Left Sidebar ── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? "" : styles.sidebarCollapsed}`}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>
            {filterCount > 0 ? `${filterCount} filter${filterCount > 1 ? "s" : ""} applied` : "No filters applied"}
          </span>
          {hasActiveFilters && (
            <button type="button" className={styles.sidebarReset} onClick={resetAllFilters}>Reset all</button>
          )}
        </div>

        {/* Status */}
        <div className={styles.filterSection}>
          <h4 className={styles.filterLabel}>Shariah Status</h4>
          <div className={styles.filterOptions}>
            {STATUS_OPTIONS.map((opt) => (
              <label key={opt.key} className={styles.filterRadio}>
                <input
                  type="radio"
                  name="status"
                  checked={statusFilter === opt.key}
                  onChange={() => setStatusFilter(opt.key)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Sector */}
        <div className={styles.filterSection}>
          <h4 className={styles.filterLabel}>Sector</h4>
          <select
            className={styles.filterSelect}
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
          >
            {sectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec === "All" ? "All Sectors" : sec} ({sectorCounts[sec] || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Market Cap */}
        <div className={styles.filterSection}>
          <h4 className={styles.filterLabel}>Market Cap</h4>
          <div className={styles.filterPills}>
            {MCAP_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`${styles.filterPill} ${mcapFilter === opt.key ? styles.filterPillActive : ""}`}
                onClick={() => setMcapFilter(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stock Universe */}
        <div className={styles.filterSection}>
          <h4 className={styles.filterLabel}>Stock Universe</h4>
          <div className={styles.filterPills}>
            {INDEX_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`${styles.filterPill} ${indexFilter === opt.key ? styles.filterPillActive : ""}`}
                onClick={() => setIndexFilter(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Locked premium filters */}
        {(["Compliance Score", "Debt Ratio", "Interest Income %"] as const).map((label) => (
          <div key={label} className={styles.filterSection}>
            <h4 className={styles.filterLabel}>
              {label}{" "}
              <span className={styles.lockIcon} title="Premium (Coming Soon)" aria-label="Premium">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
            </h4>
            <button
              type="button"
              className={styles.lockedFilter}
              onClick={() => router.push("/premium")}
            >
              {label} filter — Premium
            </button>
          </div>
        ))}

        {/* Sidebar toggle on mobile */}
        <button type="button" className={styles.sidebarToggle} onClick={() => setSidebarOpen((o) => !o)}>
          {sidebarOpen ? "Hide Filters" : "Show Filters"}
        </button>
      </aside>

      {/* ── Main Content ── */}
      <div className={styles.mainContent}>
        {/* Header bar */}
        <div className={styles.contentHeader}>
          <div className={styles.contentHeaderLeft}>
            <h1 className={styles.pageTitle}>Stock Screener</h1>
            <p className={styles.resultSummary}>
              {sorted.length} result{sorted.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className={styles.contentHeaderRight}>
            <div className={styles.headerSearchStack}>
              <div className={styles.searchBox}>
                <span className={styles.searchIcon} aria-hidden>&#x2315;</span>
                <input
                  id="stock-search"
                  ref={searchInputRef}
                  type="search"
                  className={styles.stockSearchField}
                  placeholder="Search stocks..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search stocks"
                />
              </div>
              <div className={styles.exampleChips} role="group" aria-label="Try an example stock">
                {EXAMPLE_STOCK_CHIPS.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    className={styles.exampleChip}
                    onClick={() => applyExampleChip(chip.value)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" className={styles.headerBtn} onClick={() => { exportToCsv(sorted); toast(`Exported ${sorted.length} stocks`, "success"); }}>&#x2913; Export</button>
            <button type="button" className={styles.headerBtn} onClick={() => setShowSaveModal(true)}>Save</button>
            <Link href="/compare" className={styles.headerBtn}>Compare</Link>
            <button type="button" className={styles.sidebarToggleMobile} onClick={() => setSidebarOpen((o) => !o)}>
              &#x2630; Filters {filterCount > 0 && <span className={styles.filterBadge}>{filterCount}</span>}
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-[var(--line)] bg-[var(--bg-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text)]">
            Screened using BarakFi methodology v{PRIMARY_METHODOLOGY_VERSION}
          </span>
          {" · "}
          Educational screening — not a religious ruling or certification.{" "}
          <Link href="/methodology" className="font-medium text-[var(--emerald)] underline-offset-2 hover:underline">
            Methodology
          </Link>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className={styles.activeFiltersBar}>
            {statusFilter !== "all" && (
              <span className={styles.chip}>
                {STATUS_CONFIG[statusFilter]?.label || statusFilter}
                <button type="button" onClick={() => setStatusFilter("all")}>&times;</button>
              </span>
            )}
            {sectorFilter !== "All" && (
              <span className={styles.chip}>
                {sectorFilter}
                <button type="button" onClick={() => setSectorFilter("All")}>&times;</button>
              </span>
            )}
            {mcapFilter !== "all" && (
              <span className={styles.chip}>
                {MCAP_OPTIONS.find((o) => o.key === mcapFilter)?.label}
                <button type="button" onClick={() => setMcapFilter("all")}>&times;</button>
              </span>
            )}
            {indexFilter !== "all" && (
              <span className={styles.chip}>
                {INDEX_OPTIONS.find((o) => o.key === indexFilter)?.label}
                <button type="button" onClick={() => setIndexFilter("all")}>&times;</button>
              </span>
            )}
            {query.trim() && (
              <span className={styles.chip}>
                &ldquo;{query.trim()}&rdquo;
                <button type="button" onClick={() => setQuery("")}>&times;</button>
              </span>
            )}
            <button type="button" className={styles.clearAll} onClick={resetAllFilters}>Clear all</button>
          </div>
        )}

        {/* Results: mobile cards + desktop virtual table */}
        <div ref={listRef} className="flex min-h-0 flex-1 flex-col">
        {isMobileLayout ? (
          <div className="flex flex-col gap-3 overflow-y-auto pb-20 md:hidden">
            {sorted.map((s, idx) => {
              const st = STATUS_CONFIG[s.screening.status]?.label || s.screening.status;
              return (
                <Card
                  key={s.symbol}
                  data-stock-idx={idx}
                  className={`border-[var(--line)] bg-[var(--bg-elevated)] ${focusedIdx === idx ? "ring-2 ring-[var(--emerald)]" : ""}`}
                >
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <StockLogo symbol={s.symbol} size={36} exchange={s.exchange} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[var(--text)]">{s.name}</p>
                            <p className="text-xs text-[var(--text-tertiary)]">
                              {idx + 1}. {s.symbol}{s.sector && s.sector !== "Unknown" ? ` · ${s.sector}` : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={
                          s.screening.status === "HALAL"
                            ? "success"
                            : s.screening.status === "NON_COMPLIANT"
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {st}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm tabular-nums">
                      <div>
                        <p className="text-[var(--text-tertiary)]">Mkt cap</p>
                        <p className="font-medium text-[var(--text)]">
                          <McapCell marketCap={s.market_cap} currency={resolveDisplayCurrency(s.exchange, s.currency)} />
                        </p>
                      </div>
                      <div>
                        <p className="text-[var(--text-tertiary)]">Price</p>
                        <p className="font-medium text-[var(--text)]">
                          {formatPrice(quotes[s.symbol]?.last_price ?? s.price, s.currency)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={styles.screenRowBtn}
                      style={{ width: "100%" }}
                      disabled={pendingSymbol === s.symbol}
                      onClick={() => void handleSeeWhy(s.symbol)}
                    >
                      {pendingSymbol === s.symbol ? "Opening..." : "See Why?"}
                    </button>
                  </CardContent>
                </Card>
              );
            })}
            {sorted.length === 0 && (
              <p className="rounded-lg border border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--text-secondary)]">
                No stocks match your filters.{" "}
                <button type="button" className={styles.clearAll} onClick={resetAllFilters}>
                  Reset filters
                </button>
              </p>
            )}
          </div>
        ) : null}

        {/* Desktop: virtual table — only ~20 <tr> in DOM regardless of total stock count */}
        <div className={`${styles.tableContainer} ${isMobileLayout ? "hidden md:block" : ""}`}>
          <table className={styles.table} style={{ tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th className={styles.th} style={{ width: 40 }}>#</th>
                <SortTh col="symbol">Name</SortTh>
                <th className={styles.th}>Sector</th>
                <SortTh col="market_cap" numeric>Market Cap</SortTh>
                <SortTh col="price" numeric>Close Price</SortTh>
                <th className={styles.th}>
                  <span className={styles.statusHeader} title={SCREENING_STATUS_TOOLTIP}>
                    Status
                    <span className={styles.statusHeaderInfo}>i</span>
                  </span>
                </th>
                <th className={styles.th}>Recent Event</th>
                <th className={styles.th} style={{ width: 100 }}>Action</th>
              </tr>
            </thead>
          </table>
          {/* Scrollable virtual body — separate from the sticky thead */}
          <div
            ref={tableBodyRef}
            style={{ overflow: "auto", flex: 1, height: "100%" }}
            className={styles.tableVirtualBody}
          >
            {sorted.length === 0 ? (
              <div className={styles.emptyRow} style={{ padding: "24px 20px", textAlign: "center" }}>
                No stocks match your filters.{" "}
                <button type="button" className={styles.clearAll} onClick={resetAllFilters}>Reset filters</button>
              </div>
            ) : (
              <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
                {virtualItems.map((virtualRow) => {
                  const s = sorted[virtualRow.index];
                  if (!s) return null;
                  return (
                    <div
                      key={s.symbol}
                      data-stock-idx={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                      data-index={virtualRow.index}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                        display: "grid",
                        gridTemplateColumns: "40px 1fr 120px 110px 110px 130px 110px 100px",
                        alignItems: "center",
                        borderBottom: "1px solid var(--line)",
                        background: focusedIdx === virtualRow.index ? "var(--bg-soft)" : "transparent",
                        outline: focusedIdx === virtualRow.index ? "2px solid var(--emerald)" : "none",
                        outlineOffset: "-2px",
                        cursor: "default",
                      }}
                      className={styles.row}
                    >
                      <span className={styles.tdNum}>{virtualRow.index + 1}.</span>
                      <span className={styles.tdName}>
                        <StockPreviewPopup
                          stock={s}
                          price={quotes[s.symbol]?.last_price ?? s.price}
                          changePct={quotes[s.symbol]?.change_percent ?? null}
                        >
                          <StockLogo symbol={s.symbol} size={32} />
                          <div className={styles.nameBlock}>
                            <span className={styles.stockName}>{s.name}</span>
                            <span className={styles.stockSymbol}>{s.symbol}</span>
                          </div>
                        </StockPreviewPopup>
                      </span>
                      <span className={styles.tdSector}><SectorCell sector={s.sector} /></span>
                      <span className={styles.tdRight}>
                        <McapCell marketCap={s.market_cap} currency={resolveDisplayCurrency(s.exchange, s.currency)} />
                      </span>
                      <span className={styles.tdRight}>
                        {formatPrice(quotes[s.symbol]?.last_price ?? s.price, s.currency)}
                        {quotes[s.symbol]?.change_percent != null && (
                          <span className={(quotes[s.symbol].change_percent ?? 0) >= 0 ? styles.up : styles.down}>
                            {" "}{(quotes[s.symbol].change_percent ?? 0) >= 0 ? "+" : ""}
                            {(quotes[s.symbol].change_percent ?? 0).toFixed(2)}%
                          </span>
                        )}
                      </span>
                      <span>
                        <span
                          className={`${styles.statusBadge} ${styles[STATUS_CONFIG[s.screening.status]?.cls || "statusReview"]}`}
                          title={SCREENING_STATUS_TOOLTIP}
                        >
                          {screeningUiLabel(s.screening.status)}
                        </span>
                      </span>
                      <span className={styles.tdSector}>
                        {s.latest_corporate_event ? (
                          <span
                            className={styles.statusBadge}
                            title={`${s.latest_corporate_event.label}${s.latest_corporate_event.effective_date ? ` · ${formatEventDate(s.latest_corporate_event.effective_date)}` : ""}${s.latest_corporate_event.successor_symbol ? ` · ${s.latest_corporate_event.successor_symbol}` : ""}`}
                          >
                            {s.latest_corporate_event.label}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-tertiary)" }}>—</span>
                        )}
                      </span>
                      <span>
                        <button
                          type="button"
                          className={styles.screenRowBtn}
                          disabled={pendingSymbol === s.symbol}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleSeeWhy(s.symbol);
                          }}
                        >
                          {pendingSymbol === s.symbol ? "Opening..." : "See Why?"}
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Ad placement */}
        <AdUnit format="banner" />

        <div className={styles.screenerDisclaimer}>
          {SCREENING_LEGAL_DISCLAIMER}{" "}
          <Link href="/methodology" className={styles.screenerDisclaimerLink}>View methodology</Link>
        </div>
      </div>

      {/* Save Filter Modal */}
      {showSaveModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSaveModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Save Current Screen</h3>
            <p className={styles.modalSub}>
              {sorted.length} results &middot; {filterCount > 0 ? `${filterCount} filter${filterCount > 1 ? "s" : ""}` : "No filters"}
            </p>
            <input
              className={styles.modalInput}
              type="text"
              placeholder='e.g. "Large cap halal IT stocks"'
              value={saveFilterName}
              onChange={(e) => setSaveFilterName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveFilter(); }}
              autoFocus
              maxLength={80}
            />
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancel} onClick={() => setShowSaveModal(false)}>Cancel</button>
              <button type="button" className={styles.modalSubmit} disabled={isSavingFilter || !saveFilterName.trim()} onClick={handleSaveFilter}>
                {isSavingFilter ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

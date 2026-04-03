"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/toast";
import styles from "@/app/screener.module.css";
import type { ScreeningResult, Stock } from "@/lib/api";
import { useBatchQuotes } from "@/hooks/use-batch-quotes";
import { AdUnit } from "@/components/ad-unit";
import { StockPreviewPopup } from "@/components/stock-preview-popup";

type ScreenedStock = Stock & { screening: ScreeningResult };
type SortKey = "symbol" | "price" | "market_cap" | "status" | "debt_ratio" | "income_purity";
type SortDir = "asc" | "desc";

const STATUS_ORDER: Record<string, number> = { HALAL: 0, REQUIRES_REVIEW: 1, NON_COMPLIANT: 2 };

const STATUS_OPTIONS = [
  { key: "all", label: "All Stocks" },
  { key: "HALAL", label: "Halal" },
  { key: "REQUIRES_REVIEW", label: "Needs Review" },
  { key: "NON_COMPLIANT", label: "Non-Compliant" },
] as const;

const MCAP_OPTIONS = [
  { key: "all", label: "All", min: 0, max: Infinity },
  { key: "large", label: "Large Cap", min: 100000, max: Infinity },
  { key: "mid", label: "Mid Cap", min: 20000, max: 100000 },
  { key: "small", label: "Small Cap", min: 0, max: 20000 },
] as const;

const STATUS_CONFIG: Record<string, { cls: string; label: string }> = {
  HALAL: { cls: "statusHalal", label: "Halal" },
  REQUIRES_REVIEW: { cls: "statusReview", label: "Review" },
  NON_COMPLIANT: { cls: "statusFail", label: "Avoid" },
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function formatMcap(value: number) {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)} L`;
  return formatPrice(value);
}

function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function getSortValue(s: ScreenedStock, key: SortKey): number | string {
  switch (key) {
    case "symbol": return s.symbol;
    case "price": return s.price;
    case "market_cap": return s.market_cap;
    case "status": return STATUS_ORDER[s.screening.status] ?? 9;
    case "debt_ratio": return s.screening.breakdown.debt_to_36m_avg_market_cap_ratio;
    case "income_purity": return s.screening.breakdown.non_permissible_income_ratio;
  }
}

function getAvatarColor(status: string): string {
  if (status === "HALAL") return "var(--emerald)";
  if (status === "REQUIRES_REVIEW") return "var(--gold)";
  return "var(--red)";
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
      (s.market_cap / 100).toFixed(2),
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

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [mcapFilter, setMcapFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("market_cap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const deferredQuery = useDeferredValue(query);

  const PAGE_SIZE = 40;
  const [currentPage, setCurrentPage] = useState(1);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState("");
  const [isSavingFilter, setIsSavingFilter] = useState(false);

  const allSymbols = useMemo(() => screenedStocks.map((s) => s.symbol), [screenedStocks]);
  const quotes = useBatchQuotes(allSymbols);

  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    const st = searchParams.get("status");
    if (st === "HALAL" || st === "REQUIRES_REVIEW" || st === "NON_COMPLIANT") setStatusFilter(st);
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
    const qs = params.toString();
    router.replace(qs ? `/screener?${qs}` : "/screener", { scroll: false });
  }, [initialized, statusFilter, sectorFilter, query, sortKey, sortDir, mcapFilter, router]);

  const sectorCounts = useMemo(() => {
    const counts: Record<string, number> = { All: screenedStocks.length };
    for (const s of screenedStocks) counts[s.sector] = (counts[s.sector] || 0) + 1;
    return counts;
  }, [screenedStocks]);

  const sectors = useMemo(() => ["All", ...Object.keys(sectorCounts).filter((k) => k !== "All").sort()], [sectorCounts]);

  const mcapOpt = MCAP_OPTIONS.find((o) => o.key === mcapFilter) ?? MCAP_OPTIONS[0];

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return screenedStocks.filter((s) => {
      if (q && !s.symbol.toLowerCase().includes(q) && !s.name.toLowerCase().includes(q) && !s.sector.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && s.screening.status !== statusFilter) return false;
      if (sectorFilter !== "All" && s.sector !== sectorFilter) return false;
      if (mcapFilter !== "all" && (s.market_cap < mcapOpt.min || s.market_cap >= mcapOpt.max)) return false;
      return true;
    });
  }, [screenedStocks, deferredQuery, statusFilter, sectorFilter, mcapFilter, mcapOpt]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      if (typeof va === "number" && typeof vb === "number") return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, sorted.length);
  const pageItems = sorted.slice(pageStart, pageEnd);

  useEffect(() => { setCurrentPage(1); setFocusedIdx(-1); }, [sorted.length]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "symbol" ? "asc" : "desc"); }
  }

  const handleKeyNav = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); setFocusedIdx((p) => Math.min(p + 1, pageItems.length - 1)); }
    else if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); setFocusedIdx((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter" && focusedIdx >= 0 && focusedIdx < pageItems.length) { e.preventDefault(); router.push(`/stocks/${encodeURIComponent(pageItems[focusedIdx].symbol)}`); }
    else if (e.key === "Escape") setFocusedIdx(-1);
  }, [pageItems, focusedIdx, router]);

  useEffect(() => { document.addEventListener("keydown", handleKeyNav); return () => document.removeEventListener("keydown", handleKeyNav); }, [handleKeyNav]);

  useEffect(() => {
    if (focusedIdx < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-stock-idx]");
    items[focusedIdx]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedIdx]);

  const hasActiveFilters = statusFilter !== "all" || sectorFilter !== "All" || mcapFilter !== "all" || query.trim() !== "";

  function resetAllFilters() {
    setQuery(""); setStatusFilter("all"); setSectorFilter("All"); setMcapFilter("all");
    setSortKey("market_cap"); setSortDir("desc"); setCurrentPage(1);
  }

  const filterCount = [statusFilter !== "all", sectorFilter !== "All", mcapFilter !== "all", query.trim() !== ""].filter(Boolean).length;

  async function handleSaveFilter() {
    if (!saveFilterName.trim()) return;
    setIsSavingFilter(true);
    try {
      const statusMap: Record<string, string> = { all: "all", HALAL: "halal", REQUIRES_REVIEW: "requires_review", NON_COMPLIANT: "non_compliant" };
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

  function renderPageNumbers() {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }

  return (
    <div className={styles.screenerLayout}>
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
              Showing {sorted.length > 0 ? pageStart + 1 : 0} - {pageEnd} of {sorted.length} results
            </p>
          </div>
          <div className={styles.contentHeaderRight}>
            <div className={styles.searchBox}>
              <span className={styles.searchIcon} aria-hidden>&#x2315;</span>
              <input
                type="search"
                placeholder="Search stocks..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search stocks"
              />
            </div>
            <button type="button" className={styles.headerBtn} onClick={() => { exportToCsv(sorted); toast(`Exported ${sorted.length} stocks`, "success"); }}>&#x2913; Export</button>
            <button type="button" className={styles.headerBtn} onClick={() => setShowSaveModal(true)}>Save</button>
            <Link href="/compare" className={styles.headerBtn}>Compare</Link>
            <button type="button" className={styles.sidebarToggleMobile} onClick={() => setSidebarOpen((o) => !o)}>
              &#x2630; Filters {filterCount > 0 && <span className={styles.filterBadge}>{filterCount}</span>}
            </button>
          </div>
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
            {query.trim() && (
              <span className={styles.chip}>
                &ldquo;{query.trim()}&rdquo;
                <button type="button" onClick={() => setQuery("")}>&times;</button>
              </span>
            )}
            <button type="button" className={styles.clearAll} onClick={resetAllFilters}>Clear all</button>
          </div>
        )}

        {/* Table */}
        <div className={styles.tableContainer} ref={listRef}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th} style={{ width: 40 }}>#</th>
                <SortTh col="symbol">Name</SortTh>
                <th className={styles.th}>Sector</th>
                <SortTh col="market_cap" numeric>Market Cap</SortTh>
                <SortTh col="price" numeric>Close Price</SortTh>
                <SortTh col="status">Shariah</SortTh>
                <SortTh col="debt_ratio" numeric>Debt Ratio</SortTh>
                <SortTh col="income_purity" numeric>Income Purity</SortTh>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((s, idx) => {
                const cfg = STATUS_CONFIG[s.screening.status] || STATUS_CONFIG.REQUIRES_REVIEW;
                const b = s.screening.breakdown;
                const globalIdx = pageStart + idx + 1;
                return (
                  <tr
                    key={s.symbol}
                    data-stock-idx={idx}
                    className={`${styles.row} ${focusedIdx === idx ? styles.rowFocused : ""}`}
                    onClick={() => router.push(`/stocks/${encodeURIComponent(s.symbol)}`)}
                    tabIndex={0}
                  >
                    <td className={styles.tdNum}>{globalIdx}.</td>
                    <td className={styles.tdName}>
                      <StockPreviewPopup
                        stock={s}
                        price={quotes[s.symbol]?.last_price ?? s.price}
                        changePct={quotes[s.symbol]?.change_percent ?? null}
                      >
                        <span
                          className={styles.avatar}
                          style={{ background: getAvatarColor(s.screening.status) }}
                        >
                          {s.symbol.slice(0, 2)}
                        </span>
                        <div className={styles.nameBlock}>
                          <span className={styles.stockName}>{s.name}</span>
                          <span className={styles.stockSymbol}>{s.symbol}</span>
                        </div>
                      </StockPreviewPopup>
                    </td>
                    <td className={styles.tdSector}>{s.sector}</td>
                    <td className={styles.tdRight}>{formatMcap(s.market_cap)}</td>
                    <td className={styles.tdRight}>
                      {formatPrice(quotes[s.symbol]?.last_price ?? s.price)}
                      {quotes[s.symbol]?.change_percent != null && (
                        <span className={(quotes[s.symbol].change_percent ?? 0) >= 0 ? styles.up : styles.down}>
                          {" "}{(quotes[s.symbol].change_percent ?? 0) >= 0 ? "+" : ""}
                          {(quotes[s.symbol].change_percent ?? 0).toFixed(2)}%
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[cfg.cls]}`}>{cfg.label}</span>
                    </td>
                    <td className={styles.tdRight}>{formatPct(b.debt_to_36m_avg_market_cap_ratio)}</td>
                    <td className={styles.tdRight}>{formatPct(b.non_permissible_income_ratio)}</td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={8} className={styles.emptyRow}>
                    No stocks match your filters. <button type="button" className={styles.clearAll} onClick={resetAllFilters}>Reset filters</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Ad placement */}
        {currentPage === 1 && sorted.length > PAGE_SIZE && <AdUnit format="banner" />}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={currentPage === 1}
              onClick={() => { setCurrentPage((p) => p - 1); setFocusedIdx(-1); listRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }}
            >
              &lsaquo; Prev
            </button>
            {renderPageNumbers().map((p, i) =>
              p === "..." ? (
                <span key={`dots-${i}`} className={styles.pageDots}>&hellip;</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={`${styles.pageBtn} ${currentPage === p ? styles.pageBtnActive : ""}`}
                  onClick={() => { setCurrentPage(p); setFocusedIdx(-1); listRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              className={styles.pageBtn}
              disabled={currentPage === totalPages}
              onClick={() => { setCurrentPage((p) => p + 1); setFocusedIdx(-1); listRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }}
            >
              Next &rsaquo;
            </button>
          </div>
        )}
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

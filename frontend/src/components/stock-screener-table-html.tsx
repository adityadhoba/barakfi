"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { useToast } from "@/components/toast";
import { StockLogo } from "@/components/stock-logo";
import { useBatchQuotes } from "@/hooks/use-batch-quotes";
import { useIsMobileSidebarBreakpoint } from "@/hooks/use-is-mobile";
import { useScreening } from "@/contexts/screening-context";
import { formatMcapShort, resolveDisplayCurrency } from "@/lib/currency-format";
import { exchangeForBatchQuote } from "@/lib/exchange-for-quotes";
import { INDEX_OPTIONS, matchesIndex } from "@/lib/index-membership";
import { PRIMARY_METHODOLOGY_VERSION } from "@/lib/methodology-version";
import type { ScreeningResult, Stock } from "@/lib/api";
import styles from "@/app/screener-html.module.css";

type ScreenedStock = Stock & { screening: ScreeningResult };
type SortKey = "symbol" | "price" | "market_cap" | "status" | "debt_ratio" | "income_purity";
type SortDir = "asc" | "desc";
type FilterGroupKey = "status" | "sector" | "marketCap" | "universe" | "score" | "debt" | "interest";

const PAGE_SIZE = 20;

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

const STATUS_BADGE_LABEL: Record<string, string> = {
  HALAL: "Shariah Compliant",
  CAUTIOUS: "Req. Review",
  NON_COMPLIANT: "Not Compliant",
};

const STATUS_CLASS_MAP: Record<string, string> = {
  HALAL: styles.statusHalal,
  CAUTIOUS: styles.statusReview,
  NON_COMPLIANT: styles.statusFail,
};

function formatPrice(value: number, currency?: string) {
  const locale = currency === "GBP" ? "en-GB" : currency === "USD" ? "en-US" : "en-IN";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function getSortValue(s: ScreenedStock, key: SortKey): number | string {
  switch (key) {
    case "symbol":
      return s.symbol;
    case "price":
      return s.price;
    case "market_cap":
      return s.market_cap;
    case "status":
      return STATUS_ORDER[s.screening.status] ?? 9;
    case "debt_ratio":
      return s.screening.breakdown.debt_to_36m_avg_market_cap_ratio;
    case "income_purity":
      return s.screening.breakdown.non_permissible_income_ratio;
  }
}

function sortLabel(sortKey: SortKey) {
  switch (sortKey) {
    case "market_cap":
      return "Market Cap";
    case "price":
      return "Price";
    case "symbol":
      return "Name";
    case "status":
      return "Status";
    case "debt_ratio":
      return "Debt Ratio";
    case "income_purity":
      return "Income Purity";
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
      `${(b.debt_to_36m_avg_market_cap_ratio * 100).toFixed(2)}%`,
      `${(b.non_permissible_income_ratio * 100).toFixed(2)}%`,
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

function renderStatusDotClass(statusKey: string) {
  if (statusKey === "HALAL") return `${styles.filterListDot} ${styles.statusDotHalal}`;
  if (statusKey === "CAUTIOUS") return `${styles.filterListDot} ${styles.statusDotReview}`;
  if (statusKey === "NON_COMPLIANT") return `${styles.filterListDot} ${styles.statusDotFail}`;
  return styles.filterListDot;
}

function StatusChipDot({ statusKey }: { statusKey: string }) {
  if (statusKey === "HALAL") return <span className={`${styles.statusDot} ${styles.statusDotHalalFilled}`} aria-hidden />;
  if (statusKey === "CAUTIOUS") return <span className={`${styles.statusDot} ${styles.statusDotReviewFilled}`} aria-hidden />;
  if (statusKey === "NON_COMPLIANT") return <span className={`${styles.statusDot} ${styles.statusDotFailFilled}`} aria-hidden />;
  return null;
}

type Props = { screenedStocks: ScreenedStock[] };

export function StockScreenerTableHtml({ screenedStocks }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { unlockDetails } = useScreening();
  const isMobileLayout = useIsMobileSidebarBreakpoint();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [mcapFilter, setMcapFilter] = useState("all");
  const [indexFilter, setIndexFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("market_cap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState<Record<FilterGroupKey, boolean>>({
    status: true,
    sector: true,
    marketCap: true,
    universe: true,
    score: false,
    debt: false,
    interest: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [initialized, setInitialized] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState("");
  const [isSavingFilter, setIsSavingFilter] = useState(false);
  const [pendingSymbol, setPendingSymbol] = useState<string | null>(null);

  const deferredQuery = useDeferredValue(query);
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSidebarOpen(!isMobileLayout);
  }, [isMobileLayout]);

  const exchangeBySymbol = useMemo(() => {
    const map: Record<string, string> = {};
    for (const stock of screenedStocks) {
      map[stock.symbol] = exchangeForBatchQuote(stock.exchange, stock.currency);
    }
    return map;
  }, [screenedStocks]);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "HALAL" || status === "CAUTIOUS" || status === "NON_COMPLIANT") setStatusFilter(status);
    const sector = searchParams.get("sector");
    if (sector) {
      const decoded = decodeURIComponent(sector);
      const known = new Set(screenedStocks.map((stock) => stock.sector));
      if (known.has(decoded)) setSectorFilter(decoded);
    }
    const q = searchParams.get("q");
    if (q) setQuery(decodeURIComponent(q));
    const sort = searchParams.get("sort");
    if (sort && ["symbol", "price", "market_cap", "status", "debt_ratio", "income_purity"].includes(sort)) {
      setSortKey(sort as SortKey);
    }
    const dir = searchParams.get("dir");
    if (dir === "asc" || dir === "desc") setSortDir(dir);
    const mcap = searchParams.get("mcap");
    if (mcap && MCAP_OPTIONS.some((option) => option.key === mcap)) setMcapFilter(mcap);
    const index = searchParams.get("index");
    if (index && INDEX_OPTIONS.some((option) => option.key === index)) setIndexFilter(index);
    setInitialized(true);
  }, [screenedStocks, searchParams]);

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
    const next = params.toString() ? `/screener?${params.toString()}` : "/screener";
    router.replace(next, { scroll: false });
  }, [initialized, indexFilter, mcapFilter, query, router, sectorFilter, sortDir, sortKey, statusFilter]);

  const sectorCounts = useMemo(() => {
    const counts: Record<string, number> = { All: screenedStocks.length };
    for (const stock of screenedStocks) counts[stock.sector] = (counts[stock.sector] || 0) + 1;
    return counts;
  }, [screenedStocks]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: screenedStocks.length, HALAL: 0, CAUTIOUS: 0, NON_COMPLIANT: 0 };
    for (const stock of screenedStocks) counts[stock.screening.status] = (counts[stock.screening.status] || 0) + 1;
    return counts;
  }, [screenedStocks]);

  const sectors = useMemo(
    () => ["All", ...Object.keys(sectorCounts).filter((key) => key !== "All" && key !== "Unknown").sort()],
    [sectorCounts],
  );

  const mcapOption = MCAP_OPTIONS.find((option) => option.key === mcapFilter) ?? MCAP_OPTIONS[0];

  const filtered = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    return screenedStocks.filter((stock) => {
      if (normalizedQuery) {
        const aliasHit = (stock.search_aliases || []).some((alias) => alias.toLowerCase().includes(normalizedQuery));
        if (
          !stock.symbol.toLowerCase().includes(normalizedQuery) &&
          !stock.name.toLowerCase().includes(normalizedQuery) &&
          !stock.sector.toLowerCase().includes(normalizedQuery) &&
          !aliasHit
        ) {
          return false;
        }
      }
      if (statusFilter !== "all" && stock.screening.status !== statusFilter) return false;
      if (sectorFilter !== "All" && stock.sector !== sectorFilter) return false;
      if (mcapFilter !== "all" && (stock.market_cap < mcapOption.min || stock.market_cap >= mcapOption.max)) return false;
      if (indexFilter !== "all" && !matchesIndex(stock.symbol, indexFilter, stock.index_memberships)) return false;
      return true;
    });
  }, [deferredQuery, indexFilter, mcapFilter, mcapOption.max, mcapOption.min, screenedStocks, sectorFilter, statusFilter]);

  const sorted = useMemo(() => {
    const next = [...filtered];
    next.sort((a, b) => {
      const valueA = getSortValue(a, sortKey);
      const valueB = getSortValue(b, sortKey);
      if (typeof valueA === "number" && typeof valueB === "number") {
        return sortDir === "asc" ? valueA - valueB : valueB - valueA;
      }
      return sortDir === "asc"
        ? String(valueA).localeCompare(String(valueB))
        : String(valueB).localeCompare(String(valueA));
    });
    return next;
  }, [filtered, sortDir, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, sorted.length);
  const pageItems = sorted.slice(pageStart, pageEnd);
  const quoteSymbols = useMemo(() => pageItems.map((stock) => stock.symbol), [pageItems]);
  const quotes = useBatchQuotes(quoteSymbols, exchangeBySymbol, 180000);

  useEffect(() => {
    setCurrentPage(1);
    setFocusedIdx(-1);
  }, [sorted.length]);

  useEffect(() => {
    if (focusedIdx < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-stock-idx]");
    items[focusedIdx]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedIdx]);

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
    toast(result.message, "error");
    if (result.kind === "limit_exhausted" && result.redirectUrl) {
      router.push(result.redirectUrl);
    }
  }, [router, toast, unlockDetails]);

  const handleKeyNav = useCallback((event: KeyboardEvent) => {
    const tagName = (event.target as HTMLElement).tagName;
    if (tagName === "INPUT" || tagName === "TEXTAREA") return;
    if (event.key === "j" || event.key === "ArrowDown") {
      event.preventDefault();
      setFocusedIdx((previous) => Math.min(previous + 1, pageItems.length - 1));
      return;
    }
    if (event.key === "k" || event.key === "ArrowUp") {
      event.preventDefault();
      setFocusedIdx((previous) => Math.max(previous - 1, 0));
      return;
    }
    if (event.key === "Enter" && focusedIdx >= 0 && focusedIdx < pageItems.length) {
      event.preventDefault();
      void handleSeeWhy(pageItems[focusedIdx].symbol);
    }
  }, [focusedIdx, handleSeeWhy, pageItems]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyNav);
    return () => document.removeEventListener("keydown", handleKeyNav);
  }, [handleKeyNav]);

  function handleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDir(nextKey === "symbol" ? "asc" : "desc");
  }

  function toggleGroup(key: FilterGroupKey) {
    setGroupOpen((current) => ({ ...current, [key]: !current[key] }));
  }

  function renderPageNumbers(): (number | "...")[] {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i += 1) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }

  function goToPage(page: number) {
    setCurrentPage(page);
    setFocusedIdx(-1);
    listRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function resetAllFilters() {
    setQuery("");
    setStatusFilter("all");
    setSectorFilter("All");
    setMcapFilter("all");
    setIndexFilter("all");
    setSortKey("market_cap");
    setSortDir("desc");
  }

  const filterCount = [
    statusFilter !== "all",
    sectorFilter !== "All",
    mcapFilter !== "all",
    indexFilter !== "all",
    query.trim() !== "",
  ].filter(Boolean).length;

  async function handleSaveFilter() {
    if (!saveFilterName.trim()) return;
    setIsSavingFilter(true);
    try {
      const statusMap: Record<string, string> = {
        all: "all",
        HALAL: "halal",
        CAUTIOUS: "cautious",
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
        <span className={styles.sortIcon}>{active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
      </th>
    );
  }

  return (
    <div className={`${styles.screenerLayout} ${sidebarOpen ? "" : styles.screenerLayoutCollapsed}`}>
      {isMobileLayout && sidebarOpen ? (
        <button
          type="button"
          className={styles.sidebarOverlay}
          aria-label="Close filters"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside className={`${styles.sidebar} ${sidebarOpen ? "" : styles.sidebarCollapsed}`}>
        <div className={styles.filterGroup}>
          <button type="button" className={styles.filterToggle} onClick={() => toggleGroup("status")}>
            Shariah Status
            <span className={`${styles.filterToggleIcon} ${groupOpen.status ? styles.filterToggleIconOpen : ""}`}>▾</span>
          </button>
          {groupOpen.status ? (
            <div className={styles.filterBody}>
              {STATUS_OPTIONS.map((option) => {
                const active = statusFilter === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    className={`${styles.filterListItem} ${active ? styles.filterListItemActive : ""}`}
                    onClick={() => setStatusFilter(option.key)}
                  >
                    <span className={renderStatusDotClass(option.key)} aria-hidden />
                    <span>{option.label}</span>
                    {option.key === "all" ? <span className={styles.filterListCount}>{statusCounts.all}</span> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className={styles.filterGroup}>
          <button type="button" className={styles.filterToggle} onClick={() => toggleGroup("sector")}>
            Sector
            <span className={`${styles.filterToggleIcon} ${groupOpen.sector ? styles.filterToggleIconOpen : ""}`}>▾</span>
          </button>
          {groupOpen.sector ? (
            <div className={styles.filterBody}>
              <div className={styles.sectorList}>
                {sectors.map((sector) => {
                  const active = sectorFilter === sector;
                  return (
                    <button
                      key={sector}
                      type="button"
                      className={`${styles.filterListItem} ${active ? styles.filterListItemActive : ""}`}
                      onClick={() => setSectorFilter(sector)}
                    >
                      <span className={styles.filterListDot} aria-hidden />
                      <span>{sector === "All" ? "All Sectors" : sector}</span>
                      <span className={styles.filterListCount}>{sectorCounts[sector] || 0}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className={styles.filterGroup}>
          <button type="button" className={styles.filterToggle} onClick={() => toggleGroup("marketCap")}>
            Market Cap
            <span className={`${styles.filterToggleIcon} ${groupOpen.marketCap ? styles.filterToggleIconOpen : ""}`}>▾</span>
          </button>
          {groupOpen.marketCap ? (
            <div className={styles.filterBody}>
              {MCAP_OPTIONS.map((option) => {
                const active = mcapFilter === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    className={`${styles.filterListItem} ${active ? styles.filterListItemActive : ""}`}
                    onClick={() => setMcapFilter(option.key)}
                  >
                    <span className={styles.filterListDot} aria-hidden />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className={styles.filterGroup}>
          <button type="button" className={styles.filterToggle} onClick={() => toggleGroup("universe")}>
            Stock Universe
            <span className={`${styles.filterToggleIcon} ${groupOpen.universe ? styles.filterToggleIconOpen : ""}`}>▾</span>
          </button>
          {groupOpen.universe ? (
            <div className={styles.filterBody}>
              {INDEX_OPTIONS.map((option) => {
                const active = indexFilter === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    className={`${styles.filterListItem} ${active ? styles.filterListItemActive : ""}`}
                    onClick={() => setIndexFilter(option.key)}
                  >
                    <span className={styles.filterListDot} aria-hidden />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className={styles.filterGroup}>
          <button type="button" className={styles.filterToggle} onClick={() => toggleGroup("score")}>
            Compliance Score
            <span className={`${styles.filterToggleIcon} ${groupOpen.score ? styles.filterToggleIconOpen : ""}`}>▾</span>
          </button>
          {groupOpen.score ? (
            <div className={styles.filterPremium}>
              <span>Filter by score</span>
              <span className={styles.premiumTag}>Premium</span>
            </div>
          ) : null}
        </div>

        <div className={styles.filterGroup}>
          <button type="button" className={styles.filterToggle} onClick={() => toggleGroup("debt")}>
            Debt Ratio
            <span className={`${styles.filterToggleIcon} ${groupOpen.debt ? styles.filterToggleIconOpen : ""}`}>▾</span>
          </button>
          {groupOpen.debt ? (
            <div className={styles.filterPremium}>
              <span>Filter by ratio</span>
              <span className={styles.premiumTag}>Premium</span>
            </div>
          ) : null}
        </div>

        <div className={styles.filterGroup}>
          <button type="button" className={styles.filterToggle} onClick={() => toggleGroup("interest")}>
            Interest Income %
            <span className={`${styles.filterToggleIcon} ${groupOpen.interest ? styles.filterToggleIconOpen : ""}`}>▾</span>
          </button>
          {groupOpen.interest ? (
            <div className={styles.filterPremium}>
              <span>Filter by %</span>
              <span className={styles.premiumTag}>Premium</span>
            </div>
          ) : null}
        </div>
      </aside>

      <div className={styles.mainContent}>
        <div className={styles.contentHeader}>
          <div className={styles.contentHeaderLeft}>
            <h1 className={styles.pageTitle}>Stock Screener</h1>
            <p className={styles.resultSummary}>
              {sorted.length > 0 ? `${pageStart + 1}–${pageEnd}` : "0"} of {sorted.length} stocks
            </p>
          </div>

          <div className={styles.contentHeaderRight}>
            <div className={styles.searchBox}>
              <span className={styles.searchIcon} aria-hidden>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </span>
              <input
                id="stock-search"
                ref={searchInputRef}
                type="search"
                className={styles.stockSearchField}
                placeholder="Search — RELIANCE, TCS, Infosys..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search stocks"
              />
            </div>
            <button
              type="button"
              className={styles.headerBtn}
              onClick={() => {
                exportToCsv(sorted);
                toast(`Exported ${sorted.length} stocks`, "success");
              }}
            >
              ↓ Export
            </button>
            <Link href="/compare" className={styles.headerBtn}>
              Compare
            </Link>
            <button type="button" className={styles.headerBtn} onClick={() => setShowSaveModal(true)}>
              Save
            </button>
            {isMobileLayout ? (
              <button type="button" className={styles.sidebarToggleMobile} onClick={() => setSidebarOpen(true)}>
                <SlidersHorizontal size={14} />
                Filters
                {filterCount > 0 ? <span className={styles.filterBadge}>{filterCount}</span> : null}
              </button>
            ) : null}
          </div>
        </div>

        <div className={styles.quickFilters}>
          <span className={styles.quickFiltersLabel}>Status</span>
          {STATUS_OPTIONS.map((option) => {
            const active = statusFilter === option.key;
            return (
              <button
                key={option.key}
                type="button"
                className={`${styles.quickFilterChip} ${active ? styles.quickFilterChipActive : ""}`}
                onClick={() => setStatusFilter(option.key)}
              >
                <StatusChipDot statusKey={option.key} />
                {option.key === "all" ? "All" : option.label.replace("Shariah ", "")}
              </button>
            );
          })}
        </div>

        <div ref={listRef} className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={`${styles.th} ${styles.thNum}`}>#</th>
                <SortTh col="symbol">Name</SortTh>
                <th className={styles.th}>Sector</th>
                <SortTh col="market_cap" numeric>
                  Market Cap
                </SortTh>
                <SortTh col="price" numeric>
                  Price
                </SortTh>
                <th className={styles.th}>Status</th>
                <th className={`${styles.th} ${styles.thAction}`} />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((stock, index) => {
                const globalIndex = pageStart + index + 1;
                const lastPrice = quotes[stock.symbol]?.last_price ?? stock.price;
                const statusClass = STATUS_CLASS_MAP[stock.screening.status] ?? styles.statusReview;
                return (
                  <tr
                    key={stock.symbol}
                    data-stock-idx={index}
                    className={`${styles.row} ${focusedIdx === index ? styles.rowFocused : ""}`}
                    tabIndex={0}
                    onClick={() => void handleSeeWhy(stock.symbol)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void handleSeeWhy(stock.symbol);
                      }
                    }}
                  >
                    <td className={styles.tdNum}>{globalIndex}</td>
                    <td className={styles.tdName}>
                      <StockLogo symbol={stock.symbol} size={28} exchange={stock.exchange} />
                      <div className={styles.nameBlock}>
                        <span className={styles.stockName}>{stock.symbol}</span>
                        <span className={styles.stockSymbol}>{stock.name}</span>
                      </div>
                    </td>
                    <td className={styles.tdSector}>{stock.sector || "Unknown"}</td>
                    <td className={styles.tdRight}>
                      <span className={styles.capValue}>
                        {stock.market_cap === 0 ? "Pending" : formatMcapShort(stock.market_cap, resolveDisplayCurrency(stock.exchange, stock.currency))}
                      </span>
                    </td>
                    <td className={styles.tdRight}>
                      <span className={styles.priceValue}>{formatPrice(lastPrice, stock.currency)}</span>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${statusClass}`}>
                        {STATUS_BADGE_LABEL[stock.screening.status] || stock.screening.status}
                      </span>
                    </td>
                    <td className={styles.tdAction}>
                      <button
                        type="button"
                        className={styles.screenRowBtn}
                        disabled={pendingSymbol === stock.symbol}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleSeeWhy(stock.symbol);
                        }}
                      >
                        {pendingSymbol === stock.symbol ? "Opening..." : "See Why →"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyRow}>
                    No stocks match your filters.
                    <button type="button" className={styles.emptyReset} onClick={resetAllFilters}>
                      Reset filters
                    </button>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            Showing {sorted.length > 0 ? `${pageStart + 1}–${pageEnd}` : "0"} of {sorted.length} stocks · Sorted by {sortLabel(sortKey)}
          </span>
          <div className={styles.pageNumbers}>
            <button type="button" className={styles.pageNavBtn} disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>
              ← Prev
            </button>
            {renderPageNumbers().map((page, index) =>
              page === "..." ? (
                <span key={`dots-${index}`} className={styles.pageDots}>
                  …
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  className={`${styles.pageNum} ${currentPage === page ? styles.pageNumActive : ""}`}
                  onClick={() => goToPage(page)}
                  aria-current={currentPage === page ? "page" : undefined}
                >
                  {page}
                </button>
              ),
            )}
            <button type="button" className={styles.pageNavBtn} disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}>
              Next →
            </button>
          </div>
        </div>

        <div className={styles.screenerDisclaimer}>
          <span className={styles.disclaimerLine}>
            <span className={styles.versionTag}>v{PRIMARY_METHODOLOGY_VERSION}</span>
            <span>Educational screening · Not a religious ruling or financial advice ·</span>
            <Link href="/methodology" className={styles.screenerDisclaimerLink}>
              Methodology
            </Link>
          </span>
          <span>Updated quarterly after results · NSE &amp; BSE</span>
        </div>
      </div>

      {showSaveModal ? (
        <div className={styles.modalOverlay} onClick={() => setShowSaveModal(false)}>
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <h3>Save Current Screen</h3>
            <p className={styles.modalSub}>
              {sorted.length} results · {filterCount > 0 ? `${filterCount} filter${filterCount > 1 ? "s" : ""}` : "No filters"}
            </p>
            <input
              className={styles.modalInput}
              type="text"
              placeholder='e.g. "Large cap halal IT stocks"'
              value={saveFilterName}
              onChange={(event) => setSaveFilterName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleSaveFilter();
              }}
              autoFocus
              maxLength={80}
            />
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancel} onClick={() => setShowSaveModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalSubmit}
                disabled={isSavingFilter || !saveFilterName.trim()}
                onClick={() => void handleSaveFilter()}
              >
                {isSavingFilter ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

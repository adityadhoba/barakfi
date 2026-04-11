"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { StockLogo } from "@/components/stock-logo";
import { useMobileNav } from "@/components/mobile-nav-context";
import { useBatchQuotes } from "@/hooks/use-batch-quotes";
import { exchangeForBatchQuote } from "@/lib/exchange-for-quotes";
import { formatMoney, resolveDisplayCurrency } from "@/lib/currency-format";
import { rankStocksForQuery } from "@/lib/stock-search-rank";
import { SearchMatchHighlight } from "@/components/search-match-highlight";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

type StockHit = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  market_cap?: number;
  exchange?: string;
  currency?: string;
};

const RECENT_KEY = "barakfi_recent_searches";
const MAX_RECENT = 5;
const AUTOCOMPLETE_LIMIT = 5;
const DEBOUNCE_MS = 300;

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function addRecentSearch(symbol: string) {
  try {
    const existing = getRecentSearches().filter((s) => s !== symbol);
    existing.unshift(symbol);
    localStorage.setItem(RECENT_KEY, JSON.stringify(existing.slice(0, MAX_RECENT)));
  } catch { /* silent */ }
}

export function TopbarSearch() {
  const router = useRouter();
  const { searchOpen, closeSearch } = useMobileNav();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [stocks, setStocks] = useState<StockHit[]>([]);
  const [focusIdx, setFocusIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debouncedValue = useDebouncedValue(value, DEBOUNCE_MS);
  const debouncedQuery = debouncedValue.trim();

  const fetched = useRef(false);
  const fetchStocks = useCallback(async () => {
    if (fetched.current) return;
    fetched.current = true;
    try {
      const res = await fetch("/api/stocks");
      if (res.ok) {
        const data = await res.json();
        setStocks(
          (data as StockHit[]).map((s) => ({
            symbol: s.symbol,
            name: s.name,
            sector: s.sector,
            price: s.price,
            market_cap: s.market_cap,
            exchange: s.exchange,
            currency: s.currency,
          }))
        );
      }
    } catch { /* silent */ }
  }, []);

  const q = value.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (debouncedQuery.length === 0) return [];
    return rankStocksForQuery(stocks, debouncedQuery, AUTOCOMPLETE_LIMIT);
  }, [debouncedQuery, stocks]);

  const recentSymbols = useMemo(() => getRecentSearches(), []);
  const recentStocks = useMemo(() => {
    if (!stocks.length) return [];
    return recentSymbols
      .map((sym) => stocks.find((s) => s.symbol === sym))
      .filter((s): s is StockHit => s != null);
  }, [recentSymbols, stocks]);

  const trendingStocks = useMemo(() => {
    if (!stocks.length) return [];
    return [...stocks]
      .sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0))
      .slice(0, 5);
  }, [stocks]);

  const showEmpty = (open || searchOpen) && q.length === 0 && stocks.length > 0;
  const typingPending = q.length > 0 && debouncedQuery !== value.trim();
  const showResults =
    (open || searchOpen) &&
    (filtered.length > 0 || typingPending || (q.length > 0 && stocks.length > 0));
  const showDropdown = showEmpty || showResults;

  const dropdownQuoteSymbols = useMemo(() => {
    if (!showDropdown || stocks.length === 0) return [];
    if (q.length > 0) return filtered.map((s) => s.symbol);
    const out: string[] = [];
    const seen = new Set<string>();
    for (const s of recentStocks) {
      if (!seen.has(s.symbol)) {
        seen.add(s.symbol);
        out.push(s.symbol);
      }
    }
    for (const s of trendingStocks) {
      if (!seen.has(s.symbol)) {
        seen.add(s.symbol);
        out.push(s.symbol);
      }
    }
    return out;
  }, [showDropdown, stocks.length, q.length, filtered, recentStocks, trendingStocks]);

  const searchExchangeBySymbol = useMemo(() => {
    const m: Record<string, string> = {};
    for (const sym of dropdownQuoteSymbols) {
      const row = stocks.find((s) => s.symbol === sym);
      if (row) m[sym] = exchangeForBatchQuote(row.exchange, row.currency);
    }
    return m;
  }, [dropdownQuoteSymbols, stocks]);

  const searchQuotes = useBatchQuotes(dropdownQuoteSymbols, searchExchangeBySymbol);

  const allDropdownItems = useMemo(
    () =>
      q.length > 0
        ? filtered
        : [...recentStocks, ...trendingStocks.filter((t) => !recentSymbols.includes(t.symbol))],
    [q.length, filtered, recentStocks, trendingStocks, recentSymbols]
  );

  const navigate = useCallback(
    (symbol: string) => {
      addRecentSearch(symbol);
      setValue("");
      setOpen(false);
      setFocusIdx(-1);
      closeSearch();
      inputRef.current?.blur();
      router.push(`/stocks/${encodeURIComponent(symbol)}`);
    },
    [router, closeSearch]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (focusIdx >= 0 && focusIdx < allDropdownItems.length) {
        navigate(allDropdownItems[focusIdx].symbol);
        return;
      }
      const trimmed = value.trim();
      if (trimmed) {
        setValue("");
        setOpen(false);
        closeSearch();
        inputRef.current?.blur();
        router.push(`/screener?q=${encodeURIComponent(trimmed)}`);
      }
    },
    [value, router, focusIdx, allDropdownItems, navigate, closeSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusIdx((prev) => Math.min(prev + 1, allDropdownItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusIdx((prev) => Math.max(prev - 1, -1));
      } else if (e.key === "Escape") {
        setOpen(false);
        setFocusIdx(-1);
        closeSearch();
        inputRef.current?.blur();
      }
    },
    [allDropdownItems.length, closeSearch]
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocusIdx(-1);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setFocusIdx(-1);
  }, [debouncedQuery]);

  useEffect(() => {
    if (!searchOpen) return;
    setOpen(true);
    void fetchStocks();
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(t);
      document.body.style.overflow = prev;
    };
  }, [searchOpen, fetchStocks]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }
      if (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key === "k")) {
        e.preventDefault();
        if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
          inputRef.current?.focus();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  let dropdownIdx = 0;

  return (
    <div ref={wrapRef} className={`topbarSearch ${searchOpen ? "topbarSearchOverlay" : ""}`}>
      {searchOpen && (
        <button
          type="button"
          className="topbarSearchOverlayClose"
          onClick={() => {
            closeSearch();
            setOpen(false);
            setFocusIdx(-1);
          }}
          aria-label="Close search"
        >
          ✕
        </button>
      )}
      <form onSubmit={handleSubmit} role="search">
        <span className="topbarSearchIcon" aria-hidden>&#x2315;</span>
        <input
          ref={inputRef}
          className="topbarSearchInput"
          type="search"
          placeholder="Search stocks... (/ or ⌘K)"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            fetchStocks();
          }}
          onKeyDown={handleKeyDown}
          aria-label="Search stocks"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          autoComplete="off"
          role="combobox"
          aria-controls="search-listbox"
          aria-activedescendant={focusIdx >= 0 ? `search-opt-${focusIdx}` : undefined}
        />
        <kbd className="topbarSearchKbd">/</kbd>
      </form>

      {showDropdown && (
        <ul className="searchDropdown" id="search-listbox" role="listbox">
          {q.length > 0 ? (
            <>
              {typingPending && filtered.length === 0 ? (
                <li className="searchDropdownStatus">Searching…</li>
              ) : filtered.length > 0 ? (
                filtered.map((stock, i) => (
                  <li
                    key={stock.symbol}
                    id={`search-opt-${i}`}
                    role="option"
                    aria-selected={i === focusIdx}
                    className={`searchDropdownItem ${i === focusIdx ? "searchDropdownItemFocused" : ""}`}
                    onMouseEnter={() => setFocusIdx(i)}
                    onMouseDown={(e) => { e.preventDefault(); navigate(stock.symbol); }}
                  >
                    <StockLogo symbol={stock.symbol} size={28} />
                    <div className="searchDropdownLeft">
                      <span className="searchDropdownName">
                        <SearchMatchHighlight text={stock.name} query={debouncedQuery} />
                      </span>
                      <span className="searchDropdownSymbol">
                        <SearchMatchHighlight text={stock.symbol} query={debouncedQuery} />
                      </span>
                    </div>
                    <div className="searchDropdownRight">
                      <span className="searchDropdownPrice">
                        {formatMoney(
                          searchQuotes[stock.symbol]?.last_price ?? stock.price,
                          resolveDisplayCurrency(stock.exchange, stock.currency),
                        )}
                      </span>
                      <span className="searchDropdownSector">{stock.sector}</span>
                    </div>
                  </li>
                ))
              ) : (
                <li className="searchDropdownEmpty">
                  No stocks match &ldquo;{value.trim()}&rdquo;
                </li>
              )}
            </>
          ) : (
            <>
              {recentStocks.length > 0 && (
                <>
                  <li className="searchDropdownSection">Recent</li>
                  {recentStocks.map((stock) => {
                    const idx = dropdownIdx++;
                    return (
                      <li
                        key={`recent-${stock.symbol}`}
                        id={`search-opt-${idx}`}
                        role="option"
                        aria-selected={idx === focusIdx}
                        className={`searchDropdownItem ${idx === focusIdx ? "searchDropdownItemFocused" : ""}`}
                        onMouseEnter={() => setFocusIdx(idx)}
                        onMouseDown={(e) => { e.preventDefault(); navigate(stock.symbol); }}
                      >
                        <StockLogo symbol={stock.symbol} size={28} />
                        <div className="searchDropdownLeft">
                          <span className="searchDropdownSymbol">{stock.symbol}</span>
                          <span className="searchDropdownName">{stock.name}</span>
                        </div>
                        <div className="searchDropdownRight">
                          <span className="searchDropdownPrice">
                        {formatMoney(
                          searchQuotes[stock.symbol]?.last_price ?? stock.price,
                          resolveDisplayCurrency(stock.exchange, stock.currency),
                        )}
                      </span>
                          <span className="searchDropdownSector">{stock.sector}</span>
                        </div>
                      </li>
                    );
                  })}
                </>
              )}
              <li className="searchDropdownSection">Trending</li>
              {trendingStocks
                .filter((t) => !recentSymbols.includes(t.symbol))
                .map((stock) => {
                  const idx = dropdownIdx++;
                  return (
                    <li
                      key={`trending-${stock.symbol}`}
                      id={`search-opt-${idx}`}
                      role="option"
                      aria-selected={idx === focusIdx}
                      className={`searchDropdownItem ${idx === focusIdx ? "searchDropdownItemFocused" : ""}`}
                      onMouseEnter={() => setFocusIdx(idx)}
                      onMouseDown={(e) => { e.preventDefault(); navigate(stock.symbol); }}
                    >
                      <StockLogo symbol={stock.symbol} size={28} />
                      <div className="searchDropdownLeft">
                        <span className="searchDropdownSymbol">{stock.symbol}</span>
                        <span className="searchDropdownName">{stock.name}</span>
                      </div>
                      <div className="searchDropdownRight">
                        <span className="searchDropdownPrice">
                        {formatMoney(
                          searchQuotes[stock.symbol]?.last_price ?? stock.price,
                          resolveDisplayCurrency(stock.exchange, stock.currency),
                        )}
                      </span>
                        <span className="searchDropdownSector">{stock.sector}</span>
                      </div>
                    </li>
                  );
                })}
            </>
          )}
          <li className="searchDropdownHint">
            <kbd>&uarr;</kbd><kbd>&darr;</kbd> navigate &middot; <kbd>Enter</kbd> select &middot; <kbd>Esc</kbd> close
          </li>
        </ul>
      )}
    </div>
  );
}

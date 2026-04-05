"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useRef, useDeferredValue, useMemo } from "react";
import { StockLogo } from "@/components/stock-logo";

type StockHit = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  market_cap?: number;
};

const RECENT_KEY = "barakfi_recent_searches";
const MAX_RECENT = 5;

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function TopbarSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [stocks, setStocks] = useState<StockHit[]>([]);
  const [focusIdx, setFocusIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const deferredValue = useDeferredValue(value);

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
            market_cap: (s as Record<string, unknown>).market_cap as number | undefined,
          }))
        );
      }
    } catch { /* silent */ }
  }, []);

  const q = deferredValue.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (q.length === 0) return [];
    return stocks
      .filter(
        (s) =>
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.sector.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [q, stocks]);

  const recentSymbols = useMemo(() => getRecentSearches(), [open]); // eslint-disable-line react-hooks/exhaustive-deps
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

  const showEmpty = open && q.length === 0 && stocks.length > 0;
  const showResults = open && (filtered.length > 0 || (q.length > 0 && stocks.length > 0));
  const showDropdown = showEmpty || showResults;

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
      inputRef.current?.blur();
      router.push(`/stocks/${encodeURIComponent(symbol)}`);
    },
    [router]
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
        inputRef.current?.blur();
        router.push(`/screener?q=${encodeURIComponent(trimmed)}`);
      }
    },
    [value, router, focusIdx, allDropdownItems, navigate]
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
        inputRef.current?.blur();
      }
    },
    [allDropdownItems.length]
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
  }, [deferredValue]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }
      if (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key === "k")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  let dropdownIdx = 0;

  return (
    <div ref={wrapRef} className="topbarSearch">
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
              {filtered.length > 0 ? (
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
                      <span className="searchDropdownSymbol">{stock.symbol}</span>
                      <span className="searchDropdownName">{stock.name}</span>
                    </div>
                    <div className="searchDropdownRight">
                      <span className="searchDropdownPrice">{formatCurrency(stock.price)}</span>
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
                          <span className="searchDropdownPrice">{formatCurrency(stock.price)}</span>
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
                        <span className="searchDropdownPrice">{formatCurrency(stock.price)}</span>
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

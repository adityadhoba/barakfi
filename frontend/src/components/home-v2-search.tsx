"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { rankStocksForQuery } from "@/lib/stock-search-rank";
import styles from "./home-v2.module.css";

type StockHit = {
  symbol: string;
  name: string;
  sector: string;
};

type Props = {
  trendingSymbols: string[];
};

export function HomeV2Search({ trendingSymbols }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [stocks, setStocks] = useState<StockHit[]>([]);
  const [focusIdx, setFocusIdx] = useState(-1);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  const deferredQuery = useDeferredValue(query);
  const filteredSuggestions = useMemo(() => rankStocksForQuery(stocks, deferredQuery, 8), [stocks, deferredQuery]);

  const loadStocks = useCallback(async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    try {
      const res = await fetch("/api/stocks", { credentials: "same-origin" });
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setStocks(list);
    } catch {
      // silent fallback
    }
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocusIdx(-1);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const navigate = useCallback(
    (raw: string) => {
      const symbol = raw.trim().toUpperCase();
      if (!symbol) return;
      setOpen(false);
      setFocusIdx(-1);
      setQuery("");
      router.push(`/screening/${encodeURIComponent(symbol)}`);
    },
    [router]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (focusIdx >= 0 && filteredSuggestions[focusIdx]) {
      navigate(filteredSuggestions[focusIdx].symbol);
      return;
    }
    if (query.trim()) navigate(query);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx((i) => Math.min(i + 1, filteredSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setFocusIdx(-1);
    }
  };

  return (
    <div ref={wrapRef} className={styles.searchWrap}>
      <div className={styles.searchLabel}>Search any stock</div>
      <form className={styles.searchBox} onSubmit={onSubmit}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="search"
          placeholder="Search by name or ticker — e.g. INFY, Reliance…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            void loadStocks();
          }}
          onFocus={() => {
            setOpen(true);
            void loadStocks();
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
        <button className={styles.searchBtn} type="submit">
          Search
        </button>
      </form>

      {open && filteredSuggestions.length > 0 && (
        <ul className={styles.searchDropdown}>
          {filteredSuggestions.map((s, i) => (
            <li key={s.symbol}>
              <button
                type="button"
                className={`${styles.searchDropdownItem} ${i === focusIdx ? styles.searchDropdownItemActive : ""}`}
                onMouseEnter={() => setFocusIdx(i)}
                onMouseDown={() => navigate(s.symbol)}
              >
                <span className={styles.searchSymbol}>{s.symbol}</span>
                <span className={styles.searchName}>{s.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.searchTags}>
        {trendingSymbols.map((sym) => (
          <button className={styles.tag} key={sym} type="button" onClick={() => navigate(sym)}>
            {sym}
          </button>
        ))}
      </div>
    </div>
  );
}

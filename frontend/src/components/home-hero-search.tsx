"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./home-hero-search.module.css";

interface StockItem {
  symbol: string;
  name: string;
  sector: string;
}

interface Props {
  trendingSymbols: string[];
}

export function HomeHeroSearch({ trendingSymbols }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [focusIdx, setFocusIdx] = useState(-1);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false);

  const loadStocks = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    try {
      const response = await fetch("/api/stocks", { credentials: "same-origin" });
      if (!response.ok) return;
      const data = await response.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setStocks(list);
    } catch {
      // ignore
    }
  }, []);

  const filteredSuggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return stocks
      .filter(
        (s) =>
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [query, stocks]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const navigate = useCallback(
    (symbol: string) => {
      setOpen(false);
      router.push(`/screening/${encodeURIComponent(symbol.trim().toUpperCase())}`);
    },
    [router]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (focusIdx >= 0 && filteredSuggestions[focusIdx]) {
      navigate(filteredSuggestions[focusIdx].symbol);
    } else if (query.trim()) {
      navigate(query);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx((i) => Math.min(i + 1, filteredSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          placeholder="Search TCS, Reliance, Infosys..."
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
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <button type="submit" className={styles.cta}>
          Check Now
        </button>
      </form>

      {open && filteredSuggestions.length > 0 && (
        <ul className={styles.dropdown}>
          {filteredSuggestions.map((s, i) => (
            <li key={s.symbol}>
              <button
                className={`${styles.dropItem} ${i === focusIdx ? styles.dropItemActive : ""}`}
                onMouseDown={() => navigate(s.symbol)}
                onMouseEnter={() => setFocusIdx(i)}
                type="button"
              >
                <span className={styles.dropSymbol}>{s.symbol}</span>
                <span className={styles.dropName}>{s.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {trendingSymbols.length > 0 && (
        <div className={styles.trending}>
          <span className={styles.trendingLabel}>Trending:</span>
          {trendingSymbols.map((sym) => (
            <button
              key={sym}
              className={styles.trendingChip}
              onClick={() => navigate(sym)}
              type="button"
            >
              {sym}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

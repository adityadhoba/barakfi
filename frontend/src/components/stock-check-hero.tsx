"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useRef, useMemo, useId } from "react";
import { rankStocksForQuery } from "@/lib/stock-search-rank";
import { MOCK_STOCK_HITS } from "@/lib/stock-search-mock";
import { SearchMatchHighlight } from "@/components/search-match-highlight";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import styles from "./stock-check-hero.module.css";

type StockHit = { symbol: string; name: string; sector: string };

const DEBOUNCE_MS = 300;
const SUGGEST_LIMIT = 5;

function Spinner({ label }: { label: string }) {
  return (
    <span className={styles.spinnerWrap}>
      <span className={styles.spinner} aria-hidden />
      <span className={styles.spinnerLabel}>{label}</span>
    </span>
  );
}

export function StockCheckHero() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [stocks, setStocks] = useState<StockHit[]>([]);
  const [universeLoading, setUniverseLoading] = useState(false);
  const [universeError, setUniverseError] = useState<string | null>(null);
  const [focusIdx, setFocusIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const deferred = useDebouncedValue(value, DEBOUNCE_MS);
  const loadStarted = useRef(false);

  const applyStockList = useCallback((data: StockHit[]) => {
    const mapped = data.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      sector: s.sector || "",
    }));
    setStocks(mapped);
    console.log("[StockCheckHero] stock universe applied, count:", mapped.length);
  }, []);

  const loadStocks = useCallback(async () => {
    if (loadStarted.current) return;
    loadStarted.current = true;
    setUniverseLoading(true);
    setUniverseError(null);
    try {
      const res = await fetch("/api/stocks");
      if (res.ok) {
        const data = (await res.json()) as StockHit[];
        if (Array.isArray(data) && data.length > 0) {
          applyStockList(data);
          setUniverseLoading(false);
          return;
        }
        setUniverseError("Stock list was empty. Showing sample symbols.");
        console.warn("[StockCheckHero] /api/stocks returned empty — using mock list");
      } else {
        setUniverseError(`Could not load stocks (${res.status}). Showing sample symbols.`);
        console.warn("[StockCheckHero] /api/stocks failed:", res.status);
      }
    } catch (err) {
      setUniverseError("Network error while loading stocks. Showing sample symbols.");
      console.warn("[StockCheckHero] /api/stocks error", err);
    }
    applyStockList(MOCK_STOCK_HITS as StockHit[]);
    setUniverseLoading(false);
  }, [applyStockList]);

  const q = deferred.trim();
  const typingPending = value.trim() !== q;
  const filtered = useMemo(() => {
    if (!q) return [];
    return rankStocksForQuery(stocks, q, SUGGEST_LIMIT);
  }, [q, stocks]);

  const maxIdx = filtered.length - 1;
  const activeIdx =
    focusIdx >= 0 && maxIdx >= 0 ? Math.min(focusIdx, maxIdx) : focusIdx < 0 ? -1 : -1;

  const goCheck = useCallback(
    (symbol: string) => {
      const sym = symbol.trim().toUpperCase();
      if (!sym) return;
      setValue("");
      setOpen(false);
      setFocusIdx(-1);
      router.push(`/check/${encodeURIComponent(sym)}`);
    },
    [router],
  );

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocusIdx(-1);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const trimmed = value.trim();
  const hasQuery = trimmed.length > 0;
  const showDropdown =
    open && hasQuery && (stocks.length > 0 || universeLoading || typingPending);
  const showSuggestions = showDropdown;

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          if (universeLoading) return;
          if (activeIdx >= 0 && activeIdx < filtered.length) {
            goCheck(filtered[activeIdx].symbol);
            return;
          }
          const t = trimmed.toUpperCase();
          if (t) goCheck(t);
        }}
      >
        <input
          ref={inputRef}
          type="search"
          className={styles.input}
          placeholder="Search Reliance, TCS, INFY, Tesla…"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setFocusIdx(-1);
            setOpen(true);
            void loadStocks();
          }}
          onFocus={() => {
            setOpen(true);
            void loadStocks();
          }}
          onKeyDown={(e) => {
            if (!showSuggestions) {
              if (e.key === "Escape") {
                setOpen(false);
                inputRef.current?.blur();
              }
              return;
            }
            if (universeLoading && maxIdx < 0) {
              if (e.key === "Escape") {
                setOpen(false);
                inputRef.current?.blur();
              }
              return;
            }
            if (maxIdx < 0 && !typingPending) {
              if (e.key === "Escape") {
                setOpen(false);
                inputRef.current?.blur();
              }
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              if (maxIdx < 0) return;
              setFocusIdx((i) => (i < 0 ? 0 : Math.min(i + 1, maxIdx)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setFocusIdx((i) => (i <= 0 ? -1 : i - 1));
            } else if (e.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          aria-label="Search stock symbol or company name"
          aria-busy={typingPending || (universeLoading && stocks.length === 0)}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showSuggestions}
          autoComplete="off"
        />
        <button type="submit" className={styles.btn} disabled={universeLoading}>
          {universeLoading ? (
            <>
              <span className={styles.btnSpinner} aria-hidden />
              <span>Loading…</span>
            </>
          ) : (
            "Check halal status"
          )}
        </button>
      </form>

      {universeError ? (
        <p className={styles.errorBanner} role="alert">
          {universeError}
        </p>
      ) : null}

      {showSuggestions && (
        <ul className={styles.dropdown} id={listboxId} role="listbox">
          {universeLoading && stocks.length === 0 ? (
            <li className={styles.hint}>
              <Spinner label="Loading suggestions…" />
            </li>
          ) : typingPending ? (
            <li className={styles.hint}>
              <Spinner label="Searching…" />
            </li>
          ) : filtered.length > 0 ? (
            filtered.map((s, i) => (
              <li key={s.symbol}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === activeIdx}
                  className={`${styles.item} ${i === activeIdx ? styles.itemFocus : ""} ${i === 0 ? styles.itemBest : ""}`}
                  onMouseEnter={() => setFocusIdx(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => goCheck(s.symbol)}
                >
                  <span className={styles.nameLine}>
                    <SearchMatchHighlight text={s.name} query={q} />
                  </span>
                  <span className={styles.symLine}>
                    <SearchMatchHighlight text={s.symbol} query={q} />
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className={styles.empty}>No results found</li>
          )}
        </ul>
      )}
    </div>
  );
}

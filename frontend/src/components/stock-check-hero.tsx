"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useRef, useDeferredValue, useMemo, useId } from "react";
import { rankStocksForQuery } from "@/lib/stock-search-rank";
import { SearchMatchHighlight } from "@/components/search-match-highlight";
import styles from "./stock-check-hero.module.css";

type StockHit = { symbol: string; name: string; sector: string };

type Props = {
  /** Larger input + slate styling for the minimal homepage */
  variant?: "default" | "hero";
  placeholder?: string;
  submitLabel?: string;
};

export function StockCheckHero({
  variant = "default",
  placeholder = "Search Reliance, TCS, INFY, Tesla…",
  submitLabel = "Check halal status",
}: Props) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [stocks, setStocks] = useState<StockHit[]>([]);
  const [focusIdx, setFocusIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const deferred = useDeferredValue(value);
  const fetched = useRef(false);

  const loadStocks = useCallback(async () => {
    if (fetched.current) return;
    fetched.current = true;
    try {
      const res = await fetch("/api/stocks");
      if (res.ok) {
        const data = (await res.json()) as StockHit[];
        setStocks(
          data.map((s) => ({ symbol: s.symbol, name: s.name, sector: s.sector || "" })),
        );
      }
    } catch { /* silent */ }
  }, []);

  const q = deferred.trim();
  const filtered = useMemo(() => {
    if (!q) return [];
    return rankStocksForQuery(stocks, q, 8);
  }, [q, stocks]);

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

  const wrapClass = variant === "hero" ? `${styles.wrap} ${styles.wrapHero}` : styles.wrap;
  const formClass = variant === "hero" ? `${styles.form} ${styles.formHero}` : styles.form;
  const inputClass = variant === "hero" ? `${styles.input} ${styles.inputHero}` : styles.input;
  const btnClass = variant === "hero" ? `${styles.btn} ${styles.btnHero}` : styles.btn;
  const dropdownClass = variant === "hero" ? `${styles.dropdown} ${styles.dropdownHero}` : styles.dropdown;

  return (
    <div ref={wrapRef} className={wrapClass}>
      <form
        className={formClass}
        onSubmit={(e) => {
          e.preventDefault();
          if (focusIdx >= 0 && focusIdx < filtered.length) {
            goCheck(filtered[focusIdx].symbol);
            return;
          }
          const t = value.trim().toUpperCase();
          if (t) goCheck(t);
        }}
      >
        <input
          ref={inputRef}
          type="search"
          className={inputClass}
          placeholder={placeholder}
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
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setFocusIdx((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setFocusIdx((i) => Math.max(i - 1, -1));
            } else if (e.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          aria-label="Search stock symbol or company name"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open && q.length > 0 && stocks.length > 0}
          autoComplete="off"
        />
        <button type="submit" className={btnClass}>
          {submitLabel}
        </button>
      </form>

      {open && q.length > 0 && stocks.length > 0 && (
        <ul className={dropdownClass} id={listboxId} role="listbox">
          {filtered.length > 0 ? (
            filtered.map((s, i) => (
              <li key={s.symbol}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === focusIdx}
                  className={`${styles.item} ${i === focusIdx ? styles.itemFocus : ""} ${i === 0 ? styles.itemBest : ""}`}
                  onMouseEnter={() => setFocusIdx(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => goCheck(s.symbol)}
                >
                  <span className={styles.sym}>
                    <SearchMatchHighlight text={s.symbol} query={q} />
                  </span>
                  <span className={styles.name}>
                    <SearchMatchHighlight text={s.name} query={q} />
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className={styles.empty}>No match for &ldquo;{value.trim()}&rdquo;</li>
          )}
        </ul>
      )}
    </div>
  );
}

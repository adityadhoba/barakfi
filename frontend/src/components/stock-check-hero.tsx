"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useDeferredValue,
  useMemo,
  useId,
  type FormEvent,
} from "react";
import { rankStocksForQuery } from "@/lib/stock-search-rank";
import { SearchMatchHighlight } from "@/components/search-match-highlight";
import { fetchCheckStockFromRoute, type CheckStockClientResult } from "@/lib/check-stock-client";
import styles from "./stock-check-hero.module.css";

type StockHit = { symbol: string; name: string; sector: string };

type Props = {
  /** If false, keeps last successful payload in state and does not navigate (e.g. embed). */
  navigateOnSuccess?: boolean;
};

export function StockCheckHero({ navigateOnSuccess = true }: Props) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [stocks, setStocks] = useState<StockHit[]>([]);
  const [focusIdx, setFocusIdx] = useState(-1);
  const [checkLoading, setCheckLoading] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [lastCheckResult, setLastCheckResult] = useState<CheckStockClientResult | null>(null);
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
    } catch {
      /* silent */
    }
  }, []);

  const q = deferred.trim();
  const filtered = useMemo(() => {
    if (!q) return [];
    return rankStocksForQuery(stocks, q, 8);
  }, [q, stocks]);

  const runCheck = useCallback(
    async (symbol: string) => {
      const sym = symbol.trim().toUpperCase();
      if (!sym) return;

      setCheckError(null);
      setCheckLoading(true);
      console.log("[StockCheckHero] calling /api/check-stock for symbol:", sym);

      const outcome = await fetchCheckStockFromRoute(sym);

      setCheckLoading(false);

      if (!outcome.ok) {
        console.warn("[StockCheckHero] check-stock error", outcome.status, outcome.message);
        setLastCheckResult(null);
        setCheckError(outcome.message);
        return;
      }

      console.log("[StockCheckHero] check-stock success, stored in state:", outcome.data);
      setLastCheckResult(outcome.data);
      setCheckError(null);
      setValue("");
      setOpen(false);
      setFocusIdx(-1);

      if (navigateOnSuccess) {
        router.push(`/check/${encodeURIComponent(sym)}`);
      }
    },
    [navigateOnSuccess, router],
  );

  const onSubmitForm = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (checkLoading) return;

      let sym = value.trim().toUpperCase();
      if (focusIdx >= 0 && focusIdx < filtered.length) {
        sym = filtered[focusIdx].symbol.trim().toUpperCase();
      }
      if (!sym) return;

      console.log("[StockCheckHero] form submit, symbol:", sym);
      await runCheck(sym);
    },
    [checkLoading, filtered, focusIdx, runCheck, value],
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

  const showSuggestions = open && q.length > 0 && stocks.length > 0;

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <form className={styles.form} onSubmit={onSubmitForm}>
        <input
          ref={inputRef}
          type="search"
          className={styles.input}
          placeholder="Search Reliance, TCS, INFY, Tesla…"
          value={value}
          disabled={checkLoading}
          onChange={(e) => {
            setValue(e.target.value);
            setFocusIdx(-1);
            setCheckError(null);
            setLastCheckResult(null);
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
          aria-busy={checkLoading}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showSuggestions}
          autoComplete="off"
        />
        <button type="submit" className={styles.btn} disabled={checkLoading}>
          {checkLoading ? "Checking…" : "Check halal status"}
        </button>
      </form>

      {checkError ? (
        <p className={styles.error} role="alert">
          {checkError}
        </p>
      ) : null}

      {lastCheckResult && !navigateOnSuccess ? (
        <div className={styles.resultPreview} role="status" aria-live="polite">
          <div className={styles.previewRow}>
            <span className={styles.previewName}>{lastCheckResult.name}</span>
            <span className={styles.previewSym}>{lastCheckResult.symbol}</span>
          </div>
          <div className={styles.previewMeta}>
            <span className={styles.previewScore}>{lastCheckResult.score}/100</span>
            <span className={styles.previewStatus}>{lastCheckResult.status}</span>
          </div>
          <p className={styles.previewSummary}>{lastCheckResult.summary}</p>
          <Link href={`/check/${encodeURIComponent(lastCheckResult.symbol)}`} className={styles.previewLink}>
            Open full result →
          </Link>
        </div>
      ) : null}

      {showSuggestions && (
        <ul className={styles.dropdown} id={listboxId} role="listbox">
          {filtered.length > 0 ? (
            filtered.map((s, i) => (
              <li key={s.symbol}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === focusIdx}
                  disabled={checkLoading}
                  className={`${styles.item} ${i === focusIdx ? styles.itemFocus : ""} ${i === 0 ? styles.itemBest : ""}`}
                  onMouseEnter={() => setFocusIdx(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={async () => {
                    console.log("[StockCheckHero] suggestion selected:", s.symbol);
                    await runCheck(s.symbol);
                  }}
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

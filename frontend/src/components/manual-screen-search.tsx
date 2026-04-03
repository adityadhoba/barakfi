"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { StockLogo } from "@/components/stock-logo";
import styles from "./manual-screen-search.module.css";

type ScreeningResult = {
  symbol: string;
  name: string;
  status: string;
  reasons: string[];
  breakdown: Record<string, unknown>;
};

type MultiResult = {
  consensus_status: string;
  methodologies: Record<string, ScreeningResult>;
  summary: {
    halal_count: number;
    cautious_count: number;
    non_compliant_count: number;
    total: number;
  };
};

type ManualScreenResult = {
  symbol: string;
  name: string;
  is_prescreened: boolean;
  screening: ScreeningResult;
  multi: MultiResult;
};

const STATUS_LABELS: Record<string, string> = {
  HALAL: "Halal",
  CAUTIOUS: "Cautious",
  NON_COMPLIANT: "Non-Compliant",
};

const STATUS_CLASSES: Record<string, string> = {
  HALAL: "statusHalal",
  CAUTIOUS: "statusCautious",
  NON_COMPLIANT: "statusFail",
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8001/api";

export function ManualScreenSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ManualScreenResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleScreen = useCallback(async () => {
    const symbol = query.trim().toUpperCase().replace(/\.NS$/, "");
    if (!symbol) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);

      const response = await fetch(`${apiBaseUrl}/screen/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.detail || `Could not find stock: ${symbol}`);
        return;
      }

      const data: ManualScreenResult = await response.json();
      setResult(data);
    } catch {
      setError("Request timed out or failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleScreen();
  };

  return (
    <div className={styles.container}>
      <div className={styles.searchBox}>
        <div className={styles.inputWrap}>
          <svg className={styles.searchIcon} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="Enter any NSE stock symbol (e.g., RELIANCE, TCS)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
        </div>
        <button
          type="button"
          className={styles.screenBtn}
          onClick={handleScreen}
          disabled={loading || !query.trim()}
        >
          {loading ? (
            <span className={styles.spinner} />
          ) : (
            <>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Screen
            </>
          )}
        </button>
      </div>

      {error && (
        <div className={styles.errorBox}>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className={styles.resultCard}>
          <div className={styles.resultHeader}>
            <StockLogo symbol={result.symbol} size={40} status={result.screening.status} />
            <div className={styles.resultIdentity}>
              <span className={styles.resultName}>{result.name}</span>
              <span className={styles.resultSymbol}>
                {result.symbol}
                {result.is_prescreened && (
                  <span className={styles.prescreenedBadge}>Pre-screened</span>
                )}
                {!result.is_prescreened && (
                  <span className={styles.liveBadge}>Live screening</span>
                )}
              </span>
            </div>
            <span className={`${styles.statusBadge} ${styles[STATUS_CLASSES[result.screening.status] || "statusCautious"]}`}>
              {STATUS_LABELS[result.screening.status] || result.screening.status}
            </span>
          </div>

          {/* Multi-methodology summary */}
          <div className={styles.methodSummary}>
            <span className={styles.methodLabel}>Screened by {result.multi.summary.total} methodologies</span>
            <div className={styles.methodDots}>
              {Object.entries(result.multi.methodologies).map(([code, m]) => (
                <span
                  key={code}
                  className={`${styles.methodDot} ${styles[STATUS_CLASSES[m.status] || "statusCautious"]}`}
                  title={`${code}: ${STATUS_LABELS[m.status]}`}
                />
              ))}
            </div>
            <span className={styles.methodCount}>
              {result.multi.summary.halal_count}/{result.multi.summary.total} pass
            </span>
          </div>

          {/* Reasons */}
          {result.screening.reasons.length > 0 && (
            <div className={styles.reasons}>
              {result.screening.reasons.slice(0, 4).map((r, i) => (
                <p className={styles.reason} key={i}>
                  {result.screening.status === "HALAL" ? "\u2713" : "\u2022"} {r}
                </p>
              ))}
            </div>
          )}

          <Link href={`/stocks/${encodeURIComponent(result.symbol)}`} className={styles.viewDetailsBtn}>
            View full details &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}

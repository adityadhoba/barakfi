"use client";

import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import styles from "./compare-table.module.css";
import { StockLogo } from "./stock-logo";
import type { ScreeningResult, Stock } from "@/lib/api";
import { screeningUiLabel } from "@/lib/screening-status";
import {
  formatMoney,
  formatMcapShort,
  resolveDisplayCurrency,
  resolveMarketLabel,
} from "@/lib/currency-format";
import { useBatchQuotes } from "@/hooks/use-batch-quotes";
import { exchangeForBatchQuote } from "@/lib/exchange-for-quotes";

type ScreenedStock = Stock & { screening: ScreeningResult };
type CompareLimitState = {
  status: "limit_exhausted";
  message: string;
  actions: string[];
  redirect_url: string;
  resets_at?: string;
};

type Props = {
  allStocks: Stock[];
  initialSymbols?: string[];
  mode?: "select" | "results";
};

const STATUS_CLASS: Record<string, string> = {
  HALAL: "statusHalal",
  CAUTIOUS: "statusReview",
  NON_COMPLIANT: "statusFail",
};

function normalizeSymbols(symbols: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const symbol of symbols) {
    const clean = symbol.trim().toUpperCase();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= 3) break;
  }
  return out;
}

function getIstDateString() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

function formatPct(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function normalizeCompareLimitState(value: unknown): CompareLimitState | null {
  if (
    value &&
    typeof value === "object" &&
    "status" in value &&
    (value as { status?: unknown }).status === "limit_exhausted"
  ) {
    const payload = value as Record<string, unknown>;
    return {
      status: "limit_exhausted",
      message:
        typeof payload.message === "string"
          ? payload.message
          : "You’ve reached today’s compare limit.",
      actions: Array.isArray(payload.actions)
        ? payload.actions.filter((item): item is string => typeof item === "string")
        : ["Come back tomorrow", "Join Early Access"],
      redirect_url:
        typeof payload.redirect_url === "string" ? payload.redirect_url : "/premium",
      resets_at: typeof payload.resets_at === "string" ? payload.resets_at : undefined,
    };
  }
  return null;
}

function buildDefaultCompareLimitState(resetsAt?: string): CompareLimitState {
  return {
    status: "limit_exhausted",
    message: "You’ve reached today’s compare limit.",
    actions: ["Come back tomorrow", "Join Early Access"],
    redirect_url: "/premium",
    resets_at: resetsAt,
  };
}

function ratioClass(value: number, threshold: number): string {
  if (value <= threshold * 0.7) return styles.ratioGood;
  if (value <= threshold) return styles.ratioWarn;
  return styles.ratioBad;
}

function ratioColor(value: number, threshold: number): string {
  if (value <= threshold * 0.7) return "var(--emerald)";
  if (value <= threshold) return "var(--gold)";
  return "var(--red)";
}

function buildCompareStocks(
  symbols: string[],
  allStocks: Stock[],
  screeningResults: ScreeningResult[],
): ScreenedStock[] {
  const screeningMap = new Map(
    screeningResults.map((screening) => [screening.symbol.toUpperCase(), screening]),
  );

  return symbols
    .map((symbol) => {
      const stock = allStocks.find((candidate) => candidate.symbol.toUpperCase() === symbol);
      const screening = screeningMap.get(symbol);
      if (!stock || !screening) return null;
      return { ...stock, screening };
    })
    .filter((stock): stock is ScreenedStock => stock != null);
}

function RatioBar({
  value,
  threshold,
  max,
}: {
  value: number;
  threshold: number;
  max: number;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const color = ratioColor(value, threshold);
  return (
    <div className={styles.ratioBarWrap}>
      <div className={styles.ratioBarTrack}>
        <div
          className={styles.ratioBarFill}
          style={{ width: `${pct}%`, background: color }}
        />
        <div
          className={styles.ratioBarThreshold}
          style={{ left: `${(threshold / max) * 100}%` }}
        />
      </div>
      <span className={ratioClass(value, threshold)}>{formatPct(value)}</span>
    </div>
  );
}

function SelectionCard({
  stock,
  onRemove,
}: {
  stock: Stock;
  onRemove: (symbol: string) => void;
}) {
  return (
    <div className={styles.selectedCard}>
      <div className={styles.selectedCardMain}>
        <StockLogo symbol={stock.symbol} size={34} exchange={stock.exchange} />
        <div className={styles.selectedCardMeta}>
          <span className={styles.selectedCardSymbol}>{stock.symbol}</span>
          <span className={styles.selectedCardName}>{stock.name}</span>
        </div>
      </div>
      <button
        type="button"
        className={styles.removeBtn}
        onClick={() => onRemove(stock.symbol)}
        aria-label={`Remove ${stock.symbol}`}
      >
        &times;
      </button>
    </div>
  );
}

function CompareTableSkeleton() {
  return (
    <div className={styles.tableWrap}>
      <div className={styles.resultsSkeleton}>
        <div className={styles.resultsSkeletonRow} />
        <div className={styles.resultsSkeletonRow} />
        <div className={styles.resultsSkeletonRow} />
        <div className={styles.resultsSkeletonRow} />
        <div className={styles.resultsSkeletonRow} />
      </div>
    </div>
  );
}

function CompareLoadingState() {
  return (
    <div className={styles.loadingState}>
      <div className={styles.loadingPulse} />
      <h3 className={styles.loadingTitle}>Building your comparison</h3>
      <p className={styles.loadingDesc}>
        We’re pulling the latest screening details for the selected stocks.
      </p>
    </div>
  );
}

function CompareLimitReachedState({
  limitState,
  onEditSelection,
}: {
  limitState: CompareLimitState;
  onEditSelection?: () => void;
}) {
  const resetLabel = limitState.resets_at
    ? new Date(limitState.resets_at).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      })
    : null;

  return (
    <div className={styles.limitCard} role="alert">
      <div className={styles.limitIconWrap}>
        <svg
          width="28"
          height="28"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 3c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z"
          />
        </svg>
      </div>
      <div className={styles.limitContent}>
        <h3 className={styles.limitTitle}>{limitState.message}</h3>
        <p className={styles.limitDesc}>
          Compare sessions are limited each IST day.{" "}
          {resetLabel ? `Your compare access resets after ${resetLabel}.` : "Please try again tomorrow."}
        </p>
        <div className={styles.limitActions}>
          <button type="button" className={styles.secondaryBtn} disabled>
            {limitState.actions[0] || "Come back tomorrow"}
          </button>
          <Link href={limitState.redirect_url} className={styles.compareBtn}>
            {limitState.actions[1] || "Join Early Access"}
          </Link>
          {onEditSelection ? (
            <button type="button" className={styles.secondaryBtn} onClick={onEditSelection}>
              Edit selection
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function CompareTable({
  allStocks,
  initialSymbols = [],
  mode = "select",
}: Props) {
  const router = useRouter();
  const { userId } = useAuth();
  const requestedSymbols = useMemo(() => normalizeSymbols(initialSymbols), [initialSymbols]);

  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(requestedSymbols);
  const [query, setQuery] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const [compareStocks, setCompareStocks] = useState<ScreenedStock[]>([]);
  const [loading, setLoading] = useState(mode === "results" && requestedSymbols.length > 0);
  const [showFullPageLoader, setShowFullPageLoader] = useState(
    mode === "results" && requestedSymbols.length > 0,
  );
  const [compareLimitState, setCompareLimitState] = useState<CompareLimitState | null>(null);
  const [checkingQuota, setCheckingQuota] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  const activeSymbols = mode === "results" ? requestedSymbols : selectedSymbols;

  const exchangeBySymbol = useMemo(
    () =>
      Object.fromEntries(
        compareStocks.map((stock) => [
          stock.symbol,
          exchangeForBatchQuote(stock.exchange, stock.currency),
        ]),
      ),
    [compareStocks],
  );
  const quotes = useBatchQuotes(
    compareStocks.map((stock) => stock.symbol),
    exchangeBySymbol,
  );

  const selectedStocks = useMemo(
    () =>
      selectedSymbols
        .map((symbol) =>
          allStocks.find((stock) => stock.symbol.toUpperCase() === symbol.toUpperCase()),
        )
        .filter((stock): stock is Stock => stock != null),
    [allStocks, selectedSymbols],
  );

  const suggestions = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return [];
    return allStocks
      .filter(
        (stock) =>
          !selectedSymbols.includes(stock.symbol) &&
          (stock.symbol.toLowerCase().includes(q) || stock.name.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [allStocks, deferredQuery, selectedSymbols]);

  useEffect(() => {
    if (mode !== "results") return;
    if (requestedSymbols.length === 0) {
      setLoading(false);
      setShowFullPageLoader(false);
      setCompareStocks([]);
      return;
    }

    const controller = new AbortController();
    const loadingTimer = window.setTimeout(() => {
      setShowFullPageLoader(false);
    }, 2000);

    const cacheKey = `barakfi_compare:${getIstDateString()}:${requestedSymbols.join(",")}`;
    const cached =
      typeof window !== "undefined" ? window.sessionStorage.getItem(cacheKey) : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { results?: ScreeningResult[] };
        if (Array.isArray(parsed.results)) {
          setCompareStocks(buildCompareStocks(requestedSymbols, allStocks, parsed.results));
          setLoading(false);
          setShowFullPageLoader(false);
          window.clearTimeout(loadingTimer);
          return () => {
            controller.abort();
          };
        }
      } catch {
        window.sessionStorage.removeItem(cacheKey);
      }
    }

    async function loadResults() {
      try {
        setLoading(true);
        setCompareLimitState(null);
        setError(null);
        const response = await fetch("/api/compare/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestedSymbols),
          signal: controller.signal,
          credentials: "same-origin",
        });

        const body: unknown = await response.json().catch(() => ({}));
        const payload =
          body && typeof body === "object" && "data" in body
            ? (body as { data?: unknown }).data
            : body;

        const limitPayload = normalizeCompareLimitState(payload);

        if (response.status === 429 && limitPayload) {
          setCompareLimitState(limitPayload);
          setCompareStocks([]);
          return;
        }

        if (!response.ok) {
          const detail =
            payload && typeof payload === "object" && "detail" in payload
              ? (payload as { detail?: string }).detail
              : null;
          const message =
            payload && typeof payload === "object" && "message" in payload
              ? (payload as { message?: string }).message
              : null;
          const envelopeMessage =
            body &&
            typeof body === "object" &&
            "error" in body &&
            (body as { error?: unknown }).error &&
            typeof (body as { error?: unknown }).error === "object" &&
            "message" in ((body as { error?: unknown }).error as Record<string, unknown>)
              ? (
                  (body as { error?: { message?: unknown } }).error?.message as
                    | string
                    | undefined
                )
              : null;
          const resolvedMessage = detail || message || envelopeMessage;
          setError(resolvedMessage || "We couldn’t load the comparison right now.");
          setCompareStocks([]);
          return;
        }

        const results = Array.isArray(payload) ? (payload as ScreeningResult[]) : [];
        setCompareStocks(buildCompareStocks(requestedSymbols, allStocks, results));
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(cacheKey, JSON.stringify({ results }));
        }
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "We couldn’t load the comparison right now.";
        setError(message);
        setCompareStocks([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadResults();

    return () => {
      controller.abort();
      window.clearTimeout(loadingTimer);
    };
  }, [allStocks, mode, requestedSymbols]);

  function addStock(symbol: string) {
    setSelectedSymbols((previous) => normalizeSymbols([...previous, symbol]));
    setQuery("");
    setShowPicker(false);
  }

  function removeSelected(symbol: string) {
    setSelectedSymbols((previous) => previous.filter((candidate) => candidate !== symbol));
  }

  function runCompare() {
    if (selectedSymbols.length < 2) return;
    const queryString = selectedSymbols.join(",");

    if (!userId) {
      setAuthDialogOpen(true);
      return;
    }

    setCheckingQuota(true);
    setCompareLimitState(null);
    setError(null);

    void (async () => {
      try {
        const response = await fetch("/api/quota", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (response.ok) {
          const body: unknown = await response.json().catch(() => ({}));
          const payload =
            body && typeof body === "object" && "data" in body
              ? (body as { data?: Record<string, unknown> }).data
              : body;
          const compareRemaining =
            payload && typeof payload === "object" && "compare_remaining" in payload
              ? Number((payload as { compare_remaining?: unknown }).compare_remaining ?? 0)
              : null;
          const resetsAt =
            payload && typeof payload === "object" && "resets_at" in payload
              ? String((payload as { resets_at?: unknown }).resets_at ?? "")
              : undefined;
          if (compareRemaining != null && compareRemaining <= 0) {
            setCompareLimitState(buildDefaultCompareLimitState(resetsAt));
            return;
          }
        }

        router.push(`/compare/results?symbols=${queryString}`);
      } catch {
        router.push(`/compare/results?symbols=${queryString}`);
      } finally {
        setCheckingQuota(false);
      }
    })();
  }

  function editSelection() {
    const queryString = activeSymbols.join(",");
    router.push(queryString ? `/compare?symbols=${queryString}` : "/compare");
  }

  const rows = useMemo(
    (): { label: string; values: (stock: ScreenedStock) => ReactNode }[] => [
      {
        label: "Shariah Status",
        values: (stock) => (
          <span
            className={`${styles.statusBadge} ${styles[STATUS_CLASS[stock.screening.status] || "statusReview"]}`}
          >
            {screeningUiLabel(stock.screening.status)}
          </span>
        ),
      },
      {
        label: "Market",
        values: (stock) => (
          <span className={styles.marketPill}>
            {resolveMarketLabel(stock.exchange, stock.currency)}
          </span>
        ),
      },
      {
        label: "Price",
        values: (stock) =>
          formatMoney(
            quotes[stock.symbol]?.last_price ?? stock.price,
            resolveDisplayCurrency(stock.exchange, stock.currency),
          ),
      },
      {
        label: "Market Cap",
        values: (stock) =>
          formatMcapShort(
            stock.market_cap,
            resolveDisplayCurrency(stock.exchange, stock.currency),
          ),
      },
      {
        label: "Sector",
        values: (stock) => <span className={styles.sectorBadge}>{stock.sector}</span>,
      },
      {
        label: "Debt Ratio",
        values: (stock) => (
          <RatioBar
            value={stock.screening.breakdown.debt_to_36m_avg_market_cap_ratio}
            threshold={0.33}
            max={0.6}
          />
        ),
      },
      {
        label: "Current Debt Ratio",
        values: (stock) => (
          <RatioBar
            value={stock.screening.breakdown.debt_to_market_cap_ratio}
            threshold={0.33}
            max={0.6}
          />
        ),
      },
      {
        label: "Non-Permissible Income",
        values: (stock) => (
          <RatioBar
            value={stock.screening.breakdown.non_permissible_income_ratio}
            threshold={0.05}
            max={0.15}
          />
        ),
      },
      {
        label: "Interest Income",
        values: (stock) => (
          <RatioBar
            value={stock.screening.breakdown.interest_income_ratio}
            threshold={0.05}
            max={0.15}
          />
        ),
      },
      {
        label: "Receivables Ratio",
        values: (stock) => (
          <RatioBar
            value={stock.screening.breakdown.receivables_to_market_cap_ratio}
            threshold={0.33}
            max={0.6}
          />
        ),
      },
      {
        label: "Cash & IB / Assets",
        values: (stock) => (
          <RatioBar
            value={stock.screening.breakdown.cash_and_interest_bearing_to_assets_ratio}
            threshold={0.33}
            max={0.6}
          />
        ),
      },
      {
        label: "Revenue",
        values: (stock) =>
          formatMoney(stock.revenue, resolveDisplayCurrency(stock.exchange, stock.currency)),
      },
      {
        label: "Total Debt",
        values: (stock) =>
          formatMoney(stock.debt, resolveDisplayCurrency(stock.exchange, stock.currency)),
      },
      {
        label: "Total Assets",
        values: (stock) =>
          formatMoney(
            stock.total_assets,
            resolveDisplayCurrency(stock.exchange, stock.currency),
          ),
      },
    ],
    [quotes],
  );

  if (mode === "select") {
    return (
      <div className={styles.compareContainer}>
        <div className={styles.selectionPanel}>
          <div className={styles.pickerWrap}>
            <div className={styles.pickerInput}>
              <svg
                className={styles.pickerIcon}
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                type="search"
                placeholder={
                  selectedSymbols.length >= 3
                    ? "Remove a stock to add another"
                    : "Search stocks to compare..."
                }
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setShowPicker(true);
                }}
                onFocus={() => setShowPicker(true)}
                aria-label="Search stocks to compare"
                disabled={selectedSymbols.length >= 3}
              />
            </div>
            {showPicker && selectedSymbols.length < 3 && suggestions.length > 0 && (
              <div className={styles.pickerDropdown}>
                {suggestions.map((stock) => (
                  <button
                    key={stock.symbol}
                    type="button"
                    className={styles.pickerItem}
                    onClick={() => addStock(stock.symbol)}
                  >
                    <StockLogo symbol={stock.symbol} size={28} exchange={stock.exchange} />
                    <span className={styles.pickerSymbol}>{stock.symbol}</span>
                    <span className={styles.pickerName}>{stock.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.selectionSummary}>
            <div>
              <h3 className={styles.selectionTitle}>Selected stocks</h3>
              <p className={styles.selectionDesc}>
                Pick up to 3 names, then run the comparison when you’re ready.
              </p>
            </div>
            <div className={styles.selectionCount}>{selectedSymbols.length}/3 selected</div>
          </div>

          {selectedStocks.length > 0 ? (
            <div className={styles.selectedGrid}>
              {selectedStocks.map((stock) => (
                <SelectionCard
                  key={stock.symbol}
                  stock={stock}
                  onRemove={removeSelected}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIconWrap}>
                <svg
                  width="32"
                  height="32"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="var(--emerald)"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                  />
                </svg>
              </div>
              <h3 className={styles.emptyTitle}>Choose stocks before comparing</h3>
              <p className={styles.emptyDesc}>
                Search above to add between 2 and 3 stocks. We’ll only use your compare quota
                after you click Compare.
              </p>
              <p className={styles.emptyAssist}>
                Tip: type a symbol like <code>RELIANCE</code> or <code>TCS</code> to begin.
              </p>
            </div>
          )}

          <div className={styles.selectionActions}>
            <span className={styles.selectionHint}>
              Daily compare sessions are limited, so selections stay editable until you launch the
              comparison.
            </span>
            <button
              type="button"
              className={styles.compareBtn}
              disabled={selectedSymbols.length < 2 || checkingQuota}
              onClick={runCompare}
            >
              {checkingQuota
                ? "Checking limit..."
                : `Compare ${selectedSymbols.length >= 2 ? `${selectedSymbols.length} Stocks` : "Stocks"}`}
            </button>
          </div>
        </div>

        {compareLimitState ? (
          <CompareLimitReachedState limitState={compareLimitState} />
        ) : null}

        <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sign in to run the comparison</DialogTitle>
              <DialogDescription>
                You can search and select stocks without an account. Starting a compare session uses your daily quota
                and requires a free BarakFi sign-in.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button variant="outline" asChild>
                <Link
                  href={`/sign-up?redirect_url=${encodeURIComponent(
                    `/compare/results?symbols=${selectedSymbols.join(",")}`,
                  )}`}
                  onClick={() => setAuthDialogOpen(false)}
                >
                  Create account
                </Link>
              </Button>
              <Button asChild>
                <Link
                  href={`/sign-in?redirect_url=${encodeURIComponent(
                    `/compare/results?symbols=${selectedSymbols.join(",")}`,
                  )}`}
                  onClick={() => setAuthDialogOpen(false)}
                >
                  Sign in
                </Link>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className={styles.compareContainer}>
      <div className={styles.selectionPanel}>
        <div className={styles.selectionSummary}>
          <div>
            <h3 className={styles.selectionTitle}>Current comparison</h3>
            <p className={styles.selectionDesc}>
              This run checks the selected stocks side by side. Change the set first if you want a
              different mix.
            </p>
          </div>
          <button type="button" className={styles.secondaryBtn} onClick={editSelection}>
            Edit selection
          </button>
        </div>

        <div className={styles.selectedGrid}>
          {activeSymbols.map((symbol) => {
            const stock = allStocks.find(
              (candidate) => candidate.symbol.toUpperCase() === symbol.toUpperCase(),
            );
            if (!stock) return null;
            return (
              <div key={stock.symbol} className={styles.selectedCardStatic}>
                <StockLogo symbol={stock.symbol} size={30} exchange={stock.exchange} />
                <div className={styles.selectedCardMeta}>
                  <span className={styles.selectedCardSymbol}>{stock.symbol}</span>
                  <span className={styles.selectedCardName}>{stock.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {compareLimitState ? (
        <CompareLimitReachedState limitState={compareLimitState} onEditSelection={editSelection} />
      ) : null}

      {error ? (
        <div className={styles.resultsAlert} role="alert">
          {error}
        </div>
      ) : null}

      {loading && showFullPageLoader ? <CompareLoadingState /> : null}

      {loading && !showFullPageLoader ? <CompareTableSkeleton /> : null}

      {!loading && compareStocks.length === 0 && !compareLimitState && !error ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconWrap}>
            <svg
              width="32"
              height="32"
              fill="none"
              viewBox="0 0 24 24"
              stroke="var(--emerald)"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
          </div>
          <h3 className={styles.emptyTitle}>We couldn’t build this comparison</h3>
          <p className={styles.emptyDesc}>
            One or more symbols didn’t return screening data. Adjust the selection and try again.
          </p>
          <p className={styles.emptyAssist}>
            Tip: try a high-liquidity name like <code>RELIANCE</code>, <code>TCS</code>, or{" "}
            <code>INFY</code>.
          </p>
          <button type="button" className={styles.compareBtn} onClick={editSelection}>
            Edit selection
          </button>
        </div>
      ) : null}

      {!loading && compareStocks.length > 0 && !compareLimitState ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.labelCol}>Metric</th>
                {compareStocks.map((stock) => (
                  <th key={stock.symbol} className={styles.stockCol}>
                    <div className={styles.stockHeader}>
                      <Link
                        href={`/screening/${encodeURIComponent(stock.symbol)}`}
                        className={styles.stockLink}
                      >
                        <StockLogo
                          symbol={stock.symbol}
                          size={36}
                          status={stock.screening.status}
                          exchange={stock.exchange}
                        />
                        <div className={styles.stockMeta}>
                          <span className={styles.stockSymbol}>{stock.symbol}</span>
                          <span className={styles.stockName}>{stock.name}</span>
                        </div>
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td className={styles.labelCell}>{row.label}</td>
                  {compareStocks.map((stock) => (
                    <td key={stock.symbol} className={styles.valueCell}>
                      {row.values(stock)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useBatchQuotes } from "@/hooks/use-batch-quotes";
import { StockLogo } from "@/components/stock-logo";
import type { ScreeningResult, Stock } from "@/lib/api";
import { exchangeMapFromRows, livePriceFromQuoteOrDb } from "@/lib/live-price";
import { formatMcapShort, resolveDisplayCurrency } from "@/lib/currency-format";
import styles from "./home-dashboard.module.css";

type Row = Stock & { screening?: ScreeningResult };

function formatPrice(value: number, currency: string = "INR") {
  const cur = currency || "INR";
  const locale = cur === "INR" ? "en-IN" : cur === "GBP" ? "en-GB" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: cur,
    maximumFractionDigits: 0,
  }).format(value);
}

export function HomeTopStocksLive({ rows }: { rows: Row[] }) {
  const symbols = useMemo(() => rows.map((r) => r.symbol), [rows]);
  const exchangeBySymbol = useMemo(() => exchangeMapFromRows(rows), [rows]);
  const quotes = useBatchQuotes(symbols, exchangeBySymbol);

  return (
    <div className={styles.stockGrid}>
      {rows.map((row) => {
        const scr = row.screening;
        const displayPx = livePriceFromQuoteOrDb(quotes, row);
        const cur = resolveDisplayCurrency(row.exchange, row.currency);
        return (
          <Link className={styles.stockItem} href={`/screening/${encodeURIComponent(row.symbol)}`} key={row.symbol}>
            <div className={styles.stockItemTop}>
              <StockLogo
                symbol={row.symbol}
                size={36}
                status={scr?.status}
                exchange={row.exchange}
              />
              <div className={styles.stockIdentity}>
                <span className={styles.stockSymbol}>{row.symbol}</span>
                <span className={styles.stockName}>{row.name}</span>
              </div>
            </div>
            <div className={styles.stockItemBottom}>
              <div className={styles.stockPrice}>{formatPrice(displayPx, row.currency || "INR")}</div>
              <div className={styles.stockMcap}>{formatMcapShort(row.market_cap, cur)}</div>
            </div>
            {scr && (
              <div className={styles.stockStatus}>
                <span
                  className={`${styles.statusDot} ${
                    scr.status === "HALAL"
                      ? styles.statusDotHalal
                      : scr.status === "CAUTIOUS"
                        ? styles.statusDotReview
                        : styles.statusDotFail
                  }`}
                />
                {scr.status === "HALAL" ? "Halal" : scr.status === "CAUTIOUS" ? "Doubtful" : "Haram"}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}

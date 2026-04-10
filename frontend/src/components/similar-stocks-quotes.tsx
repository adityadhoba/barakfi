"use client";

import Link from "next/link";
import { useBatchQuotes } from "@/hooks/use-batch-quotes";
import { StockLogo } from "@/components/stock-logo";
import type { Stock } from "@/lib/api";
import { exchangeForBatchQuote } from "@/lib/exchange-for-quotes";
import styles from "@/app/screener.module.css";

type PeerRow = {
  symbol: string;
  name: string;
  status: string;
  score: number;
  debt: number;
  nonHalal: number;
};

const STATUS_BADGE: Record<string, string> = {
  HALAL: "badgeHalal",
  CAUTIOUS: "badgeReview",
  NON_COMPLIANT: "badgeFail",
};

const STATUS_LABELS: Record<string, string> = {
  HALAL: "Halal",
  CAUTIOUS: "Cautious",
  NON_COMPLIANT: "Non-Compliant",
};

type Props = {
  peers: Stock[];
  peerComparison: PeerRow[];
  formatCurrency: (value: number, currency?: string) => string;
  formatMcap: (value: number, currency?: string) => string;
};

export function SimilarStocksQuotes({ peers, peerComparison, formatCurrency, formatMcap }: Props) {
  const symbols = peers.map((p) => p.symbol);
  const exchangeBySymbol = Object.fromEntries(
    peers.map((p) => [p.symbol, exchangeForBatchQuote(p.exchange, p.currency)]),
  );
  const quotes = useBatchQuotes(symbols, exchangeBySymbol);

  return (
    <div className={styles.similarGrid}>
      {peers.map((s, idx) => {
        const peerData = peerComparison[idx];
        const q = quotes[s.symbol];
        const cur = s.currency || "INR";
        return (
          <Link className={styles.similarCard} href={`/stocks/${s.symbol}`} key={s.symbol}>
            <div className={styles.similarCardTop}>
              <StockLogo symbol={s.symbol} size={34} status={peerData?.status} exchange={s.exchange} />
              <div className={styles.similarIdentity}>
                <span className={styles.similarSymbol}>{s.symbol}</span>
                <span className={styles.similarName}>{s.name}</span>
              </div>
              {peerData && (
                <span className={`${styles.badge} ${styles[STATUS_BADGE[peerData.status] || "badgeReview"]} ${styles.similarBadge}`}>
                  {STATUS_LABELS[peerData.status] || peerData.status}
                </span>
              )}
            </div>
            <div className={styles.similarCardBottom}>
              <div>
                <span className={styles.similarPrice}>{formatCurrency(q?.last_price ?? s.price, cur)}</span>
                {q?.change_percent != null && (
                  <span
                    className={q.change_percent >= 0 ? styles.quoteChangeUp : styles.quoteChangeDown}
                    style={{ fontSize: "0.75rem", marginLeft: 4 }}
                  >
                    {q.change_percent >= 0 ? "+" : ""}
                    {q.change_percent.toFixed(2)}%
                  </span>
                )}
              </div>
              <span className={styles.similarMcap}>{formatMcap(s.market_cap, cur)}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

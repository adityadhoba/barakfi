"use client";

import Link from "next/link";
import { useBatchQuotes } from "@/hooks/use-batch-quotes";
import { StockLogo } from "@/components/stock-logo";
import type { Stock } from "@/lib/api";
import { exchangeForBatchQuote } from "@/lib/exchange-for-quotes";
import { formatMoney, formatMcapShort, resolveDisplayCurrency } from "@/lib/currency-format";
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
  CAUTIOUS: "Doubtful",
  NON_COMPLIANT: "Haram",
};

type Props = {
  peers: Stock[];
  peerComparison: PeerRow[];
};

function parseChangePercent(v: number | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function SimilarStocksQuotes({ peers, peerComparison }: Props) {
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
        const cur = resolveDisplayCurrency(s.exchange, s.currency);
        const chPct = parseChangePercent(q?.change_percent);
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
                <span className={styles.similarPrice}>{formatMoney(q?.last_price ?? s.price, cur)}</span>
                {chPct != null && (
                  <span
                    className={chPct >= 0 ? styles.quoteChangeUp : styles.quoteChangeDown}
                    style={{ fontSize: "0.75rem", marginLeft: 4 }}
                  >
                    {chPct >= 0 ? "+" : ""}
                    {chPct.toFixed(2)}%
                  </span>
                )}
              </div>
              <span className={styles.similarMcap}>{formatMcapShort(s.market_cap, cur)}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

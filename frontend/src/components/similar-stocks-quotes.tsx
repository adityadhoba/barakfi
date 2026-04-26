"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useBatchQuotes } from "@/hooks/use-batch-quotes";
import { StockLogo } from "@/components/stock-logo";
import { LockedVerdict } from "@/components/locked-verdict";
import type { Stock } from "@/lib/api";
import { exchangeForBatchQuote } from "@/lib/exchange-for-quotes";
import { formatMoney, formatMcapShort, resolveDisplayCurrency } from "@/lib/currency-format";
import { screeningUiLabel } from "@/lib/screening-status";
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || peers.length === 0) return;
    const cardWidth = el.scrollWidth / peers.length;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setActiveIndex(Math.min(idx, peers.length - 1));
  }, [peers.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const scrollToCard = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / peers.length;
    el.scrollTo({ left: cardWidth * idx, behavior: "smooth" });
  };

  return (
    <>
      <div className={styles.similarGrid} ref={scrollRef}>
        {peers.map((s, idx) => {
          const peerData = peerComparison[idx];
          const q = quotes[s.symbol];
          const cur = resolveDisplayCurrency(s.exchange, s.currency);
          const chPct = parseChangePercent(q?.change_percent);
          return (
            <Link
              className={styles.similarCard}
              href={`/screening/${encodeURIComponent(s.symbol)}`}
              key={s.symbol}
            >
              <div className={styles.similarCardTop}>
                <StockLogo symbol={s.symbol} size={34} exchange={s.exchange} />
                <div className={styles.similarIdentity}>
                  <span className={styles.similarSymbol}>{s.symbol}</span>
                  <span className={styles.similarName}>{s.name}</span>
                </div>
                {peerData && (
                  <LockedVerdict symbol={s.symbol} compact>
                    <span className={`${styles.badge} ${styles[STATUS_BADGE[peerData.status] || "badgeReview"]} ${styles.similarBadge}`}>
                      {screeningUiLabel(peerData.status)}
                    </span>
                  </LockedVerdict>
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
      {peers.length > 1 && (
        <div className={styles.carouselDots} aria-hidden="true">
          {peers.map((_, i) => (
            <button
              key={i}
              className={`${styles.carouselDot} ${i === activeIndex ? styles.carouselDotActive : ""}`}
              onClick={() => scrollToCard(i)}
              aria-label={`Go to stock ${i + 1}`}
              tabIndex={-1}
            />
          ))}
        </div>
      )}
    </>
  );
}

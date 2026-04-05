"use client";

import Link from "next/link";
import { StockLogo } from "@/components/stock-logo";
import styles from "@/app/trending/trending.module.css";

type Props = {
  href: string;
  rank: number;
  symbol: string;
  name: string;
  exchange: string;
  priceLabel: string;
  mcapLabel: string;
};

export function TrendingStockRow({ href, rank, symbol, name, exchange, priceLabel, mcapLabel }: Props) {
  return (
    <Link href={href} className={styles.card}>
      <div className={styles.cardRank}>{rank}</div>
      <StockLogo symbol={symbol} size={40} exchange={exchange} />
      <div className={styles.cardBody}>
        <div className={styles.cardSymbol}>{symbol}</div>
        <div className={styles.cardName}>{name}</div>
      </div>
      <div className={styles.cardRight}>
        <div className={styles.cardPrice}>{priceLabel}</div>
        <div className={styles.cardMcap}>{mcapLabel}</div>
      </div>
      <span className={styles.cardExchange}>{exchange}</span>
    </Link>
  );
}

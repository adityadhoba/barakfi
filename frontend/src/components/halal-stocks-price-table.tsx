"use client";

import Link from "next/link";
import { useBatchQuotes } from "@/hooks/use-batch-quotes";
import { StockLogo } from "@/components/stock-logo";
import { exchangeForBatchQuote } from "@/lib/exchange-for-quotes";
import { formatMoney, resolveDisplayCurrency } from "@/lib/currency-format";
import styles from "@/app/halal-stocks/halal-stocks.module.css";
import type { Stock } from "@/lib/api";

function formatMcap(value: number) {
  if (value >= 1e7) return `\u20B9${(value / 1e7).toFixed(0)} Cr`;
  if (value >= 1e5) return `\u20B9${(value / 1e5).toFixed(1)} L`;
  return formatMoney(value, "INR");
}

type Props = { stocks: Stock[] };

export function HalalStocksPriceTable({ stocks }: Props) {
  const symbols = stocks.map((s) => s.symbol);
  const exchangeBySymbol = Object.fromEntries(
    stocks.map((s) => [s.symbol, exchangeForBatchQuote(s.exchange, s.currency)]),
  );
  const quotes = useBatchQuotes(symbols, exchangeBySymbol);

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Company</th>
            <th>Sector</th>
            <th className={styles.thRight}>Price</th>
            <th className={styles.thRight}>Market Cap</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((s, i) => {
            const cur = resolveDisplayCurrency(s.exchange, s.currency);
            const live = quotes[s.symbol]?.last_price;
            return (
              <tr key={s.symbol}>
                <td className={styles.tdNum}>{i + 1}</td>
                <td>
                  <Link href={`/stocks/${encodeURIComponent(s.symbol)}`} className={styles.stockLink}>
                    <StockLogo symbol={s.symbol} size={28} status="HALAL" />
                    <div className={styles.stockInfo}>
                      <strong>{s.name}</strong>
                      <span>{s.symbol}</span>
                    </div>
                  </Link>
                </td>
                <td className={styles.tdSector}>{s.sector}</td>
                <td className={styles.tdRight}>{formatMoney(live ?? s.price, cur)}</td>
                <td className={styles.tdRight}>{formatMcap(s.market_cap)}</td>
                <td>
                  <span className={styles.halalBadge}>Halal</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

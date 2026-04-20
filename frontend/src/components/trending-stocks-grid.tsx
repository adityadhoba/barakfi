"use client";

import { useBatchQuotes } from "@/hooks/use-batch-quotes";
import { TrendingStockRow } from "@/components/trending-stock-row";
import type { TrendingStock } from "@/lib/api";
import { exchangeForBatchQuote } from "@/lib/exchange-for-quotes";
import { formatMoney, resolveDisplayCurrency } from "@/lib/currency-format";
import styles from "@/app/trending/trending.module.css";

type Props = { stocks: TrendingStock[] };

export function TrendingStocksGrid({ stocks }: Props) {
  const symbols = stocks.map((s) => s.symbol);
  const exchangeBySymbol = Object.fromEntries(
    stocks.map((s) => [s.symbol, exchangeForBatchQuote(s.exchange, s.currency)]),
  );
  const quotes = useBatchQuotes(symbols, exchangeBySymbol);

  return (
    <div className={styles.grid}>
      {stocks.map((stock, i) => {
        const cur = resolveDisplayCurrency(stock.exchange, stock.currency);
        const live = quotes[stock.symbol]?.last_price;
        const priceLabel = formatMoney(live ?? stock.price, cur);
        return (
          <TrendingStockRow
            key={stock.symbol}
            href={`/stocks/${stock.symbol}`}
            rank={i + 1}
            symbol={stock.symbol}
            name={stock.name}
            exchange={stock.exchange}
            priceLabel={priceLabel}
          />
        );
      })}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { useBatchQuotes } from "@/hooks/use-batch-quotes";
import { exchangeMapFromRows, portfolioMarketValueApproxInr, type LivePriceRow } from "@/lib/live-price";
import ws from "./workspace-hero.module.css";

function formatCurrencyInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

type Holding = {
  quantity: number;
  stock: LivePriceRow;
};

export function WorkspacePortfolioValue({ holdings }: { holdings: Holding[] }) {
  const symbols = useMemo(() => holdings.map((h) => h.stock.symbol), [holdings]);
  const exchangeBySymbol = useMemo(
    () => exchangeMapFromRows(holdings.map((h) => h.stock)),
    [holdings],
  );
  const quotes = useBatchQuotes(symbols, exchangeBySymbol);

  const total = useMemo(
    () => portfolioMarketValueApproxInr(holdings, quotes),
    [holdings, quotes],
  );

  return (
    <span className={ws.metricChipValue} title="Approx. INR total using live LTP where available">
      {formatCurrencyInr(total)}
    </span>
  );
}

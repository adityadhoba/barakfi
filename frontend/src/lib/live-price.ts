import { exchangeForBatchQuote } from "@/lib/exchange-for-quotes";

export type QuoteLike = { last_price: number | null };

/** Row with DB `price` fallback (stocks, holdings, trending rows, etc.). */
export type LivePriceRow = {
  symbol: string;
  exchange?: string | null;
  currency?: string | null;
  price: number;
};

/** Static FX to INR for a single portfolio headline (approximate). */
const USD_INR = 83;
const GBP_INR = 105;

export function livePriceFromQuoteOrDb(
  quotes: Record<string, QuoteLike>,
  row: LivePriceRow,
): number {
  const q = quotes[row.symbol]?.last_price;
  if (q != null && q > 0) return q;
  return row.price;
}

export function exchangeMapFromRows(rows: LivePriceRow[]): Record<string, string> {
  return Object.fromEntries(
    rows.map((r) => [r.symbol, exchangeForBatchQuote(r.exchange, r.currency)]),
  );
}

export function valueApproxInInr(amount: number, currency: string | undefined | null): number {
  const c = (currency || "INR").toUpperCase();
  if (c === "USD") return amount * USD_INR;
  if (c === "GBP") return amount * GBP_INR;
  return amount;
}

/** Sum holding values in approximate INR for the workspace header chip. */
export function portfolioMarketValueApproxInr(
  holdings: Array<{ quantity: number; stock: LivePriceRow }>,
  quotes: Record<string, QuoteLike>,
): number {
  let sum = 0;
  for (const h of holdings) {
    const px = livePriceFromQuoteOrDb(quotes, h.stock);
    const line = h.quantity * px;
    sum += valueApproxInInr(line, h.stock.currency);
  }
  return sum;
}

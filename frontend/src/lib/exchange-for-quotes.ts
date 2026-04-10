import { resolveDisplayCurrency } from "@/lib/currency-format";

/** Maps stock exchange/currency to the batch quote API pair exchange (SYM:EXC). */
export function exchangeForBatchQuote(
  exchange: string | undefined | null,
  currency: string | undefined | null,
): string {
  const cur = resolveDisplayCurrency(exchange, currency);
  if (cur === "USD") return "US";
  if (cur === "GBP") return "LSE";
  return exchange?.trim() || "NSE";
}

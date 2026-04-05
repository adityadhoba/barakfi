/**
 * Format money and market labels by stock exchange (NSE/BSE → INR, US → USD, LSE → GBP).
 */

export function currencyForExchange(exchange: string | undefined | null): "INR" | "USD" | "GBP" {
  const ex = (exchange || "NSE").toUpperCase();
  if (ex === "US" || ex === "NYSE" || ex === "NASDAQ") return "USD";
  if (ex === "LSE" || ex === "LON") return "GBP";
  return "INR";
}

export function marketLabelForExchange(exchange: string | undefined | null): string {
  const ex = (exchange || "NSE").toUpperCase();
  if (ex === "NSE" || ex === "BSE") return "India";
  if (ex === "US" || ex === "NYSE" || ex === "NASDAQ") return "US";
  if (ex === "LSE" || ex === "LON") return "UK";
  return ex;
}

/**
 * Prefer explicit `currency` from API when it is USD/GBP (fixes wrong `exchange` in DB).
 * When currency is INR, still honor US/LSE exchange for labeling.
 */
export function resolveDisplayCurrency(
  exchange: string | undefined | null,
  currency: string | undefined | null,
): "INR" | "USD" | "GBP" {
  const cur = (currency || "").toUpperCase();
  if (cur === "USD" || cur === "GBP") return cur;
  if (cur === "INR") {
    const ex = (exchange || "NSE").toUpperCase();
    if (ex === "US" || ex === "NYSE" || ex === "NASDAQ") return "USD";
    if (ex === "LSE" || ex === "LON") return "GBP";
    return "INR";
  }
  return currencyForExchange(exchange);
}

/** Market pill: exchange first; fall back to currency when exchange looks wrong. */
export function resolveMarketLabel(
  exchange: string | undefined | null,
  currency: string | undefined | null,
): string {
  const ex = (exchange || "NSE").toUpperCase();
  if (ex === "NSE" || ex === "BSE") return "India";
  if (ex === "US" || ex === "NYSE" || ex === "NASDAQ") return "US";
  if (ex === "LSE" || ex === "LON") return "UK";
  const cur = (currency || "").toUpperCase();
  if (cur === "USD") return "US";
  if (cur === "GBP") return "UK";
  if (cur === "INR") return "India";
  return ex;
}

export function formatMoney(value: number, currency: "INR" | "USD" | "GBP"): string {
  const locale = currency === "INR" ? "en-IN" : currency === "GBP" ? "en-GB" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

/** Market cap in local units (Cr/L for INR; B/M for USD/GBP). */
export function formatMcapShort(value: number, currency: "INR" | "USD" | "GBP"): string {
  if (currency === "INR") {
    if (value >= 1e7) return `₹${(value / 1e7).toFixed(0)} Cr`;
    if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)} L`;
    return formatMoney(value, "INR");
  }
  const sym = currency === "GBP" ? "£" : "$";
  if (value >= 1e9) return `${sym}${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${sym}${(value / 1e6).toFixed(1)}M`;
  return formatMoney(value, currency);
}

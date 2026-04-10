/**
 * How fundamentals are stored (matches `fetch_real_data._convert_value` / seed data):
 * - NSE/BSE: Indian Rupees in **Crores** (1 Cr = ₹10^7)
 * - US / LSE: **Millions** in listing currency (USD or GBP)
 */

export function formatInrCrores(value: number): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 })} Cr`;
}

export function formatUsdMillions(value: number): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 0 })}M`;
}

export function formatGbpMillions(value: number): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `£${value.toLocaleString("en-GB", { maximumFractionDigits: 2, minimumFractionDigits: 0 })}M`;
}

/** Single line item from Stock row (mcap, revenue, debt, assets, …). */
export function formatFundamentalAmount(value: number, currency: string = "INR"): string {
  const c = (currency || "INR").toUpperCase();
  if (c === "INR") return formatInrCrores(value);
  if (c === "USD") return formatUsdMillions(value);
  if (c === "GBP") return formatGbpMillions(value);
  return `${value.toLocaleString()} (${c})`;
}

/**
 * Cap tier from DB market_cap using India crores (NSE/BSE).
 * Approximate retail buckets; not a regulatory classification.
 */
export function capTierLabelInrCrores(marketCapCr: number): "Large Cap" | "Mid Cap" | "Small Cap" {
  if (!Number.isFinite(marketCapCr) || marketCapCr <= 0) return "Small Cap";
  if (marketCapCr >= 20_000) return "Large Cap";
  if (marketCapCr >= 2_000) return "Mid Cap";
  return "Small Cap";
}

/** US listings: `market_cap` stored in USD millions (see fetch_real_data). */
export function capTierLabelUsdMillions(mcapM: number): "Large Cap" | "Mid Cap" | "Small Cap" {
  if (!Number.isFinite(mcapM) || mcapM <= 0) return "Small Cap";
  if (mcapM >= 10_000) return "Large Cap"; // ~$10B+
  if (mcapM >= 1_000) return "Mid Cap";
  return "Small Cap";
}

/** LSE listings: `market_cap` stored in GBP millions. */
export function capTierLabelGbpMillions(mcapM: number): "Large Cap" | "Mid Cap" | "Small Cap" {
  if (!Number.isFinite(mcapM) || mcapM <= 0) return "Small Cap";
  if (mcapM >= 5_000) return "Large Cap";
  if (mcapM >= 500) return "Mid Cap";
  return "Small Cap";
}

export function capTierLabel(marketCap: number, currency: string = "INR"): "Large Cap" | "Mid Cap" | "Small Cap" {
  const c = (currency || "INR").toUpperCase();
  if (c === "USD") return capTierLabelUsdMillions(marketCap);
  if (c === "GBP") return capTierLabelGbpMillions(marketCap);
  return capTierLabelInrCrores(marketCap);
}

export function fundamentalsUnitNote(currency: string = "INR"): string {
  const c = (currency || "INR").toUpperCase();
  if (c === "INR") {
    return "Fundamentals are shown in ₹ Crores (1 Cr = ₹1,00,00,000), matching our database. Refresh via your data pipeline for the latest filings.";
  }
  if (c === "USD") return "Fundamentals are in USD millions per our database. Refresh via your data pipeline for the latest filings.";
  if (c === "GBP") return "Fundamentals are in GBP millions per our database. Refresh via your data pipeline for the latest filings.";
  return "Fundamentals use the currency stored with this listing.";
}

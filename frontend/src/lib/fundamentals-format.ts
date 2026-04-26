/**
 * How fundamentals are stored (matches `fetch_real_data._convert_value` / seed data):
 * - NSE/BSE: Indian Rupees in **Crores** (1 Cr = ₹10^7)
 * - US / LSE: **Millions** in listing currency (USD or GBP)
 */

/** 1 lakh crore = 1,00,000 crore (compact label used above ~₹1L Cr magnitude). */
const INR_LAKH_CRORE = 100_000;

export function formatInrCrores(value: number): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 })} Cr`;
}

/**
 * Shorter INR crores for dense UI (key metrics strip, long tables).
 * Uses "L Cr" (lakhs of crores) when value ≥ 1,00,000 Cr to avoid overflow.
 */
export function formatInrCroresCompact(value: number): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= INR_LAKH_CRORE) {
    const l = value / INR_LAKH_CRORE;
    return `₹${l.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 })} L Cr`;
  }
  if (value >= 10_000) {
    return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0, minimumFractionDigits: 0 })} Cr`;
  }
  return formatInrCrores(value);
}

/** Like formatFundamentalAmount but uses compact INR crores when currency is INR. */
export function formatFundamentalAmountCompact(value: number, currency: string = "INR"): string {
  const c = (currency || "INR").toUpperCase();
  if (c === "INR") return formatInrCroresCompact(value);
  return formatFundamentalAmount(value, currency);
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
 * Compact display used in dense stock-detail metric cards.
 * For INR values stored in crores:
 * - >= 1,00,000 Cr shown as L Cr (lakh crore)
 * - otherwise shown as Cr
 */
export function formatFundamentalAmountCompact(value: number, currency: string = "INR"): string {
  const c = (currency || "INR").toUpperCase();
  if (!Number.isFinite(value)) return "—";
  if (c !== "INR") return formatFundamentalAmount(value, c);
  if (Math.abs(value) >= 100_000) {
    const lakhCrore = value / 100_000;
    return `₹${lakhCrore.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })} L Cr`;
  }
  return formatInrCrores(value);
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

/** User-facing line for stock detail when API returns ISO timestamp. */
export function formatFundamentalsAsOfLine(iso: string | null | undefined): string | null {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Fundamentals as of ${d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })} IST`;
}

export function formatFundamentalsLastUpdatedIst(iso: string | null | undefined): string | null {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  })} IST`;
}

/**
 * Returns true when all critical financial fields are missing or zero.
 * Used to show a "Data Pending" banner for newly seeded stocks.
 */
export function isFundamentalsEmpty(stock: {
  total_assets?: number | null;
  revenue?: number | null;
  debt?: number | null;
  total_business_income?: number | null;
  market_cap?: number | null;
  data_quality?: string | null;
}): boolean {
  // If data_quality is explicitly high or medium, trust it
  if (stock.data_quality === "high" || stock.data_quality === "medium") return false;
  const critical = [
    stock.total_assets,
    stock.revenue,
    stock.debt,
    stock.total_business_income,
    stock.market_cap,
  ];
  return critical.every((v) => !v || v === 0);
}

export function fundamentalsUnitNote(currency: string = "INR"): string {
  const c = (currency || "INR").toUpperCase();
  if (c === "INR") {
    return "Fundamentals are shown in ₹ Crores (1 Cr = ₹1,00,00,000), matching our database. Large values may appear as lakhs of crores (L Cr). Interest income and some balance-sheet lines depend on filing detail; when NSE JSON omits them, ratios may show 0% or require review until the next sync or supplemental source. Market cap refreshes on the fundamentals job schedule, not every price tick.";
  }
  if (c === "USD") return "Fundamentals are in USD millions per our database. Refresh via your data pipeline for the latest filings.";
  if (c === "GBP") return "Fundamentals are in GBP millions per our database. Refresh via your data pipeline for the latest filings.";
  return "Fundamentals use the currency stored with this listing.";
}

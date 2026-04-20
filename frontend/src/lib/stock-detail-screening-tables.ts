/**
 * Shared builders for stock screening tables (primary profile + multi-methodology).
 * Used by the full stock detail page and the fast /check/[symbol] result view.
 */

import type { MultiMethodologyResult, ScreeningResult } from "@/lib/api";
import type { StockDetailMethodologyRow, StockDetailRatioRow } from "@/components/stock-detail-tables-collapsible";

const METHODOLOGY_ORDER = ["sp_shariah", "aaoifi", "ftse_maxis", "khatkhatay"] as const;

const METHODOLOGY_NAMES: Record<string, string> = {
  sp_shariah: "S&P Shariah Indices",
  aaoifi: "AAOIFI Standards",
  ftse_maxis: "FTSE Yasaar (Maxis)",
  khatkhatay: "Khatkhatay Independent Norms",
};

/** Product language for methodology table rows */
const ENGINE_TO_PRODUCT: Record<string, string> = {
  HALAL: "Shariah Compliant",
  CAUTIOUS: "Requires Review",
  NON_COMPLIANT: "Not Compliant",
};

function formatRatio(value: number): string {
  if (!Number.isFinite(value) || value > 9.99) return "—";
  return `${(value * 100).toFixed(2)}%`;
}

type BreakdownExtras = {
  debt_ratio_value?: number;
  debt_ratio_threshold?: number;
  receivables_ratio_value?: number;
  receivables_ratio_threshold?: number;
  cash_ib_ratio_threshold?: number;
};

export function buildPrimaryRatioTableRows(screening: ScreeningResult): StockDetailRatioRow[] {
  const b = screening.breakdown;
  const rows: StockDetailRatioRow[] = [
    { label: "Debt level (36m avg mcap)", value: formatRatio(b.debt_to_36m_avg_market_cap_ratio), limit: formatRatio(0.33) },
    { label: "Current debt (vs mcap)", value: formatRatio(b.debt_to_market_cap_ratio), limit: formatRatio(0.33) },
    { label: "Non-permissible income", value: formatRatio(b.non_permissible_income_ratio), limit: formatRatio(0.05) },
    { label: "Interest income", value: formatRatio(b.interest_income_ratio), limit: formatRatio(0.05) },
    { label: "Receivables (vs mcap)", value: formatRatio(b.receivables_to_market_cap_ratio), limit: formatRatio(0.33) },
    { label: "Cash & interest-bearing / assets", value: formatRatio(b.cash_and_interest_bearing_to_assets_ratio), limit: formatRatio(0.33) },
  ];
  if (b.fixed_assets_to_total_assets_ratio != null) {
    rows.push({
      label: "Fixed assets / total assets",
      value: formatRatio(b.fixed_assets_to_total_assets_ratio),
      limit: "—",
    });
  }
  return rows;
}

export function buildMethodologyTableRowsFromMulti(multi: MultiMethodologyResult): StockDetailMethodologyRow[] {
  const rows: StockDetailMethodologyRow[] = [];
  for (const code of METHODOLOGY_ORDER) {
    const result = multi.methodologies[code];
    if (!result) continue;
    const br = result.breakdown as typeof result.breakdown & BreakdownExtras;
    const debtVal = br.debt_ratio_value ?? 0;
    const debtLim = br.debt_ratio_threshold ?? 0.33;
    const recvVal = br.receivables_ratio_value ?? br.receivables_to_market_cap_ratio;
    const recvLim = br.receivables_ratio_threshold ?? 0.33;
    const cashLim = br.cash_ib_ratio_threshold ?? 0.33;
    rows.push({
      methodology: METHODOLOGY_NAMES[code] ?? code,
      status: result.status,
      statusLabel: ENGINE_TO_PRODUCT[result.status] ?? result.status,
      debt: `${formatRatio(debtVal)} / ${formatRatio(debtLim)}`,
      nonPermIncome: `${formatRatio(br.non_permissible_income_ratio)} / ${formatRatio(0.05)}`,
      interestIncome: `${formatRatio(br.interest_income_ratio)} / ${formatRatio(0.05)}`,
      receivables: `${formatRatio(recvVal)} / ${formatRatio(recvLim)}`,
      cashIb: `${formatRatio(br.cash_and_interest_bearing_to_assets_ratio)} / ${formatRatio(cashLim)}`,
      sector: br.sector_allowed ? "Permitted" : "Excluded",
    });
  }
  return rows;
}

export function methodologyTableCaption(multi: MultiMethodologyResult): string {
  const consensus = multi.consensus_status;
  const label = ENGINE_TO_PRODUCT[consensus] ?? consensus;
  return `Consensus: ${label} — ${multi.summary.halal_count} of ${multi.summary.total} methodologies pass. Debt and receivables can differ by methodology because denominators differ (S&P uses 36m average market cap; others use total assets).`;
}

/** Three ratio lines for /check full details (values from API breakdown only). */
export function buildCheckSimpleRatioRows(screening: ScreeningResult): { label: string; value: string }[] {
  const b = screening.breakdown;
  return [
    {
      label: "Debt ratio",
      value: `${formatRatio(b.debt_to_36m_avg_market_cap_ratio)} (36-month avg mcap) · ${formatRatio(b.debt_to_market_cap_ratio)} (current mcap)`,
    },
    { label: "Non-permissible income", value: formatRatio(b.non_permissible_income_ratio) },
    { label: "Receivables", value: formatRatio(b.receivables_to_market_cap_ratio) },
  ];
}

export type CheckMethodologyPassRow = { code: string; label: string; outcome: "pass" | "fail" | "review" };

const CHECK_FULL_DETAILS_METHODS: { code: string; label: string }[] = [
  { code: "aaoifi", label: "AAOIFI" },
  { code: "sp_shariah", label: "S&P" },
  { code: "ftse_maxis", label: "FTSE" },
];

/** Pass / Fail / Review from multi-methodology payload (no re-screening). */
export function buildCheckMethodologyPassRows(multi: MultiMethodologyResult | null): CheckMethodologyPassRow[] {
  return CHECK_FULL_DETAILS_METHODS.map(({ code, label }) => {
    const result = multi?.methodologies?.[code];
    if (!result) {
      return { code, label, outcome: "review" as const };
    }
    if (result.status === "HALAL") return { code, label, outcome: "pass" };
    if (result.status === "NON_COMPLIANT") return { code, label, outcome: "fail" };
    return { code, label, outcome: "review" };
  });
}

/** Short product bullets for /check result (2–3 lines, no raw ratios). */
export function buildCheckSummaryBullets(screening: ScreeningResult): {
  bullets: string[];
  variant: "pass" | "fail" | "review";
} {
  const b = screening.breakdown;
  const engine = screening.status;

  if (engine === "NON_COMPLIANT") {
    const bullets = screening.reasons.slice(0, 3).map(shortenHardReason);
    return { bullets: bullets.length ? bullets : ["Does not meet screening criteria"], variant: "fail" };
  }

  if (engine === "CAUTIOUS") {
    const fromFlags = screening.manual_review_flags.slice(0, 2).map(shortenManualFlag);
    const positive = pickPositiveBullets(b, 3 - fromFlags.length);
    const merged = [...fromFlags, ...positive].slice(0, 3);
    return { bullets: merged.length ? merged : ["Manual review suggested"], variant: "review" };
  }

  const positive = pickPositiveBullets(b, 3);
  return {
    bullets: positive.length ? positive : ["Meets primary screening criteria"],
    variant: "pass",
  };
}

function pickPositiveBullets(b: ScreeningResult["breakdown"], max: number): string[] {
  const out: string[] = [];
  const debtOk =
    b.debt_to_36m_avg_market_cap_ratio < 0.33 && b.debt_to_market_cap_ratio < 0.33;
  if (debtOk) out.push("Low debt");
  if (b.non_permissible_income_ratio < 0.05) out.push("Minimal non-permissible income");
  if (out.length >= max) return out.slice(0, max);
  if (b.sector_allowed) out.push("Permitted business sector");
  if (out.length >= max) return out.slice(0, max);
  if (b.interest_income_ratio < 0.05) out.push("Interest income within limits");
  if (out.length >= max) return out.slice(0, max);
  if (b.receivables_to_market_cap_ratio < 0.33) out.push("Receivables within limits");
  if (out.length >= max) return out.slice(0, max);
  if (b.cash_and_interest_bearing_to_assets_ratio < 0.33) out.push("Cash & interest-bearing assets within limits");
  return out.slice(0, max);
}

function shortenHardReason(r: string): string {
  const lower = r.toLowerCase();
  if (lower.includes("debt")) return "Debt above screening limit";
  if (lower.includes("non-permissible")) return "Non-permissible income too high";
  if (lower.includes("interest income")) return "Interest income too high";
  if (lower.includes("receivables")) return "Receivables above screening limit";
  if (lower.includes("cash & interest") || lower.includes("cash and interest"))
    return "Cash & interest-bearing assets too high";
  if (lower.includes("sector") || lower.includes("prohibited activities")) return "Sector not permissible";
  const one = r.split(".")[0]?.trim() ?? r;
  return one.length > 88 ? `${one.slice(0, 85)}…` : one;
}

function shortenManualFlag(f: string): string {
  if (f.includes("Missing or zero")) return "Some financial data incomplete";
  if (f.includes("Fixed-asset")) return "Fixed-asset data needs review";
  const one = f.split(".")[0]?.trim() ?? f;
  return one.length > 88 ? `${one.slice(0, 85)}…` : one;
}

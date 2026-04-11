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
  HALAL: "Halal",
  CAUTIOUS: "Doubtful",
  NON_COMPLIANT: "Haram",
};

function formatRatio(value: number): string {
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
  return `Consensus: ${label} — ${multi.summary.halal_count} of ${multi.summary.total} methodologies pass.`;
}

/** Minimal ratio rows for /check “View details” (debt, non-halal income, receivables). */
export type CheckSimpleRatioRow = { label: string; value: string; limit: string };

export function buildCheckPageSimpleRatioRows(screening: ScreeningResult): CheckSimpleRatioRow[] {
  const b = screening.breakdown;
  const debtVal = b.debt_ratio_value ?? b.debt_to_36m_avg_market_cap_ratio;
  const debtLim = b.debt_ratio_threshold ?? 0.33;
  const recvVal = b.receivables_ratio_value ?? b.receivables_to_market_cap_ratio;
  const recvLim = b.receivables_ratio_threshold ?? 0.33;
  const nonHalalValue = `${formatRatio(b.non_permissible_income_ratio)} non-perm. · ${formatRatio(b.interest_income_ratio)} interest`;
  return [
    { label: "Debt ratio", value: formatRatio(debtVal), limit: formatRatio(debtLim) },
    { label: "Non-halal income", value: nonHalalValue, limit: formatRatio(0.05) },
    { label: "Receivables", value: formatRatio(recvVal), limit: formatRatio(recvLim) },
  ];
}

export type CheckMethodologyPassRow = {
  code: string;
  label: string;
  engineStatus: "HALAL" | "CAUTIOUS" | "NON_COMPLIANT" | string;
};

const CHECK_PAGE_METHOD_ORDER: { code: "aaoifi" | "sp_shariah" | "ftse_maxis"; label: string }[] = [
  { code: "aaoifi", label: "AAOIFI" },
  { code: "sp_shariah", label: "S&P" },
  { code: "ftse_maxis", label: "FTSE" },
];

/** AAOIFI, S&P, FTSE only — for simplified Pass/Fail table on /check. */
export function buildCheckPageMethodologyPassRows(multi: MultiMethodologyResult | null): CheckMethodologyPassRow[] {
  return CHECK_PAGE_METHOD_ORDER.map(({ code, label }) => {
    const result = multi?.methodologies[code];
    return {
      code,
      label,
      engineStatus: result?.status ?? "CAUTIOUS",
    };
  });
}

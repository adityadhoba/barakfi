export const SCREENING_UI_STATUS_LABELS: Record<string, string> = {
  HALAL: "Shariah Compliant",
  CAUTIOUS: "Requires Review",
  NON_COMPLIANT: "Not Compliant",
};

/** Discovery/SEO-facing words only. Do not use for in-product verdict badges. */
export const SCREENING_DISCOVERY_STATUS_LABELS: Record<string, string> = {
  HALAL: "Halal",
  CAUTIOUS: "Doubtful",
  NON_COMPLIANT: "Haram",
};

export const SCREENING_STATUS_TOOLTIP =
  "Based on standard Shariah screening criteria: sector activity, debt, liquidity, and impure-income checks.";

export const SCREENING_LEGAL_DISCLAIMER =
  "This classification is based on publicly available data and standard Shariah screening methodologies. It is not a religious ruling, fatwa, certification, financial advice, or investment recommendation.";

export function screeningUiLabel(status: string): string {
  return SCREENING_UI_STATUS_LABELS[status] || status;
}

export function screeningDiscoveryLabel(status: string): string {
  return SCREENING_DISCOVERY_STATUS_LABELS[status] || status;
}

/** Backward-compatible alias. Prefer screeningDiscoveryLabel for new code. */
export function screeningEditorialLabel(status: string): string {
  return screeningDiscoveryLabel(status);
}

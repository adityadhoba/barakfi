export const SCREENING_UI_STATUS_LABELS: Record<string, string> = {
  HALAL: "Shariah Compliant",
  CAUTIOUS: "Requires Review",
  NON_COMPLIANT: "Not Compliant",
};

export const SCREENING_EDITORIAL_STATUS_LABELS: Record<string, string> = {
  HALAL: "Halal",
  CAUTIOUS: "Doubtful",
  NON_COMPLIANT: "Haram",
};

export const SCREENING_STATUS_TOOLTIP =
  "Based on standard Shariah screening criteria: sector activity, debt, liquidity, and impure-income checks.";

export function screeningUiLabel(status: string): string {
  return SCREENING_UI_STATUS_LABELS[status] || status;
}

export function screeningEditorialLabel(status: string): string {
  return SCREENING_EDITORIAL_STATUS_LABELS[status] || status;
}

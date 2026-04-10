/**
 * Engine/API screening codes vs product-facing labels shown in the UI.
 * Engine: HALAL | CAUTIOUS | NON_COMPLIANT
 * UI:      Halal | Doubtful | Haram
 */
export type ScreeningEngineStatus = "HALAL" | "CAUTIOUS" | "NON_COMPLIANT";

export const SCREENING_STATUS_LABELS: Record<ScreeningEngineStatus, string> = {
  HALAL: "Halal",
  CAUTIOUS: "Doubtful",
  NON_COMPLIANT: "Haram",
};

/** Default when status is missing or not one of the three engine codes. */
export const SCREENING_STATUS_LABEL_FALLBACK = "Doubtful";

export function screeningStatusLabel(
  status: string | null | undefined,
  fallback: string = SCREENING_STATUS_LABEL_FALLBACK,
): string {
  if (!status) return fallback;
  const key = status.toUpperCase() as ScreeningEngineStatus;
  if (key in SCREENING_STATUS_LABELS) {
    return SCREENING_STATUS_LABELS[key];
  }
  return fallback;
}

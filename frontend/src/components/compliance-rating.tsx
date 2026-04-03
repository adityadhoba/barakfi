"use client";

import { useMemo } from "react";

const LABELS: Record<number, string> = {
  5: "Excellent",
  4: "Good",
  3: "Acceptable",
  2: "Borderline",
  1: "Non-Compliant",
};

const COLORS: Record<number, string> = {
  5: "var(--emerald)",
  4: "var(--emerald)",
  3: "var(--gold)",
  2: "var(--gold)",
  1: "var(--red)",
};

export function ComplianceRating({ rating, size = 16 }: { rating: number | null | undefined; size?: number }) {
  const stars = useMemo(() => {
    const r = rating ?? 0;
    return Array.from({ length: 5 }, (_, i) => i < r);
  }, [rating]);

  if (!rating) return <span style={{ color: "var(--text-tertiary)", fontSize: size * 0.75 }}>N/A</span>;

  const color = COLORS[rating] ?? "var(--text-tertiary)";
  const label = LABELS[rating] ?? "";

  return (
    <span title={`${rating}/5 — ${label}`} style={{ display: "inline-flex", gap: 1, alignItems: "center" }}>
      {stars.map((filled, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={filled ? color : "var(--text-muted)"} strokeWidth={1.5}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span style={{ fontSize: size * 0.7, marginLeft: 4, color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
    </span>
  );
}

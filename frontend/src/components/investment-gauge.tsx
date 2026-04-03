"use client";

export function InvestmentGauge({
  label,
  value,
  suffix = "",
  min = 0,
  max = 100,
  thresholds = { good: 60, warn: 30 },
}: {
  label: string;
  value: number | null;
  suffix?: string;
  min?: number;
  max?: number;
  thresholds?: { good: number; warn: number };
}) {
  const pct = value != null ? Math.min(Math.max((value - min) / (max - min), 0), 1) : 0;
  const angle = -90 + pct * 180;
  const color = value == null
    ? "var(--text-muted)"
    : value >= thresholds.good
      ? "var(--emerald)"
      : value >= thresholds.warn
        ? "var(--gold)"
        : "var(--red)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={80} height={48} viewBox="0 0 100 55">
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--line)" strokeWidth={6} strokeLinecap="round" />
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={`${pct * 126} 126`}
        />
        <line x1="50" y1="50" x2="50" y2="15" stroke={color} strokeWidth={2} strokeLinecap="round"
          transform={`rotate(${angle} 50 50)`} />
        <circle cx="50" cy="50" r="3" fill={color} />
      </svg>
      <div style={{ fontSize: "0.95rem", fontWeight: 700, color }}>{value != null ? `${value}${suffix}` : "N/A"}</div>
      <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );
}

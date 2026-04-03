const EXCHANGE_LABELS: Record<string, { label: string; flag: string }> = {
  NSE: { label: "NSE", flag: "🇮🇳" },
  BSE: { label: "BSE", flag: "🇮🇳" },
  US: { label: "US", flag: "🇺🇸" },
  NYSE: { label: "NYSE", flag: "🇺🇸" },
  NASDAQ: { label: "NASDAQ", flag: "🇺🇸" },
  LSE: { label: "LSE", flag: "🇬🇧" },
  TSE: { label: "TSE", flag: "🇯🇵" },
  XETRA: { label: "XETRA", flag: "🇩🇪" },
  ASX: { label: "ASX", flag: "🇦🇺" },
};

export function CountryBadge({ exchange, size = "sm" }: { exchange: string; size?: "sm" | "md" }) {
  const info = EXCHANGE_LABELS[exchange] ?? { label: exchange, flag: "🌍" };
  const fontSize = size === "md" ? "0.78rem" : "0.68rem";
  const pad = size === "md" ? "2px 8px" : "1px 6px";

  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        padding: pad, borderRadius: 4,
        background: "var(--bg-soft)", fontSize,
        fontWeight: 500, color: "var(--text-secondary)",
      }}
    >
      <span>{info.flag}</span>
      <span>{info.label}</span>
    </span>
  );
}

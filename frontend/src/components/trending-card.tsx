import Link from "next/link";
import { StockLogo } from "./stock-logo";

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  HALAL: { bg: "var(--emerald-dim)", fg: "var(--emerald)" },
  CAUTIOUS: { bg: "var(--gold-dim)", fg: "var(--gold)" },
  NON_COMPLIANT: { bg: "var(--red-dim)", fg: "var(--red)" },
};

type Props = {
  symbol: string;
  name: string;
  price: number;
  priceChangePct: number | null;
  complianceStatus: string;
  complianceRating?: number | null;
  exchange: string;
};

export function TrendingCard({
  symbol,
  name,
  price,
  priceChangePct,
  complianceStatus,
  exchange,
}: Props) {
  const status = STATUS_COLORS[complianceStatus] ?? STATUS_COLORS.CAUTIOUS;
  const isPositive = (priceChangePct ?? 0) >= 0;

  return (
    <Link
      href={`/stocks/${symbol}`}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px", borderRadius: "var(--radius-lg)",
        background: "var(--bg-elevated)", border: "1px solid var(--line)",
        textDecoration: "none", color: "inherit",
        transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--emerald)"; (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--line)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
    >
      <StockLogo symbol={symbol} size={36} status={complianceStatus} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{symbol}</span>
          <span style={{ fontSize: "0.65rem", padding: "1px 5px", borderRadius: 4, background: status.bg, color: status.fg, fontWeight: 600 }}>
            {complianceStatus.replace("_", " ")}
          </span>
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
          {exchange === "US" ? "$" : exchange === "LSE" ? "£" : "₹"}{price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
        </div>
        {priceChangePct != null && (
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: isPositive ? "var(--emerald)" : "var(--red)" }}>
            {isPositive ? "+" : ""}{priceChangePct.toFixed(2)}%
          </div>
        )}
      </div>
    </Link>
  );
}

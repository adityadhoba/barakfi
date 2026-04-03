import type { Metadata } from "next";
import Link from "next/link";
import { getETFs } from "@/lib/api";
import { CountryBadge } from "@/components/country-badge";
import { StockLogo } from "@/components/stock-logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Halal ETFs — Shariah Compliant Exchange-Traded Funds | Barakfi",
  description:
    "Screen ETFs for Shariah compliance. See which exchange-traded funds hold predominantly halal stocks and meet Islamic finance standards.",
  keywords: [
    "halal etf", "shariah compliant etf", "islamic etf", "halal index fund",
    "shariah etf screening", "muslim etf investing",
  ],
};

export default async function ETFsPage() {
  const etfs = await getETFs();

  return (
    <main className="shellPage">
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 64px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 800, marginBottom: 6 }}>
            Halal ETFs
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: 600 }}>
            Exchange-traded funds screened for Shariah compliance. We analyze top holdings to determine overall halal percentage.
          </p>
        </div>

        {etfs.length === 0 ? (
          <div style={{
            padding: "48px 24px", textAlign: "center",
            background: "var(--bg-elevated)", borderRadius: "var(--radius-xl)",
            border: "1px solid var(--line)",
          }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>📊</div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 8 }}>ETF Screening Coming Soon</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", maxWidth: 400, margin: "0 auto" }}>
              We are building ETF screening capabilities. ETFs will be analyzed by examining their underlying holdings for Shariah compliance.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {etfs.map((etf) => (
              <Link
                key={etf.symbol}
                href={`/stocks/${etf.symbol}`}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: 16, background: "var(--bg-elevated)",
                  borderRadius: "var(--radius-lg)", border: "1px solid var(--line)",
                  textDecoration: "none", color: "inherit",
                  transition: "border-color var(--transition-fast)",
                }}
              >
                <StockLogo symbol={etf.symbol} size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{etf.symbol}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-tertiary)" }}>{etf.name}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <CountryBadge exchange={etf.exchange} />
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, marginTop: 4 }}>
                    {etf.exchange === "US" ? "$" : "₹"}{etf.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

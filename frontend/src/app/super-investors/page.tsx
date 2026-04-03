import type { Metadata } from "next";
import Link from "next/link";
import { getSuperInvestors } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Super Investors — Track Halal Holdings of Top Investors | Barakfi",
  description:
    "See which stocks the world's top investors hold and check their Shariah compliance. Track Warren Buffett, Cathie Wood, and more.",
  keywords: [
    "super investor halal", "warren buffett halal stocks", "13f halal screening",
    "top investor shariah compliance", "halal portfolio tracking",
  ],
};

export default async function SuperInvestorsPage() {
  const investors = await getSuperInvestors();

  return (
    <main className="shellPage">
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 64px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 800, marginBottom: 6 }}>
            Super Investors
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: 650 }}>
            Track the portfolios of the world&apos;s most successful investors. We cross-reference their holdings with Shariah screening to show which positions are halal.
          </p>
        </div>

        {investors.length === 0 ? (
          <div style={{
            padding: "48px 24px", textAlign: "center",
            background: "var(--bg-elevated)", borderRadius: "var(--radius-xl)",
            border: "1px solid var(--line)", color: "var(--text-tertiary)",
          }}>
            Investor data is being compiled. Check back soon.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {investors.map((inv) => (
              <Link
                key={inv.slug}
                href={`/super-investors/${inv.slug}`}
                style={{
                  display: "block", padding: 24,
                  background: "var(--bg-elevated)", borderRadius: "var(--radius-xl)",
                  border: "1px solid var(--line)", textDecoration: "none", color: "inherit",
                  transition: "border-color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%",
                    background: "var(--emerald-dim)", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: "1.2rem", fontWeight: 800, color: "var(--emerald)",
                  }}>
                    {inv.name.charAt(0)}
                  </div>
                  <div>
                    <h2 style={{ fontSize: "1rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>
                      {inv.name}
                    </h2>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-tertiary)" }}>{inv.firm}</p>
                  </div>
                </div>
                <p style={{
                  fontSize: "0.82rem", color: "var(--text-secondary)",
                  lineHeight: 1.5, marginBottom: 16,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {inv.bio}
                </p>
                <div style={{ display: "flex", gap: 12 }}>
                  <span style={{
                    padding: "4px 10px", borderRadius: "var(--radius-full)",
                    background: "var(--blue-dim)", color: "var(--blue)",
                    fontSize: "0.72rem", fontWeight: 600,
                  }}>
                    {inv.holdings_count} holdings tracked
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

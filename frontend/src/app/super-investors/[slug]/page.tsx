import type { Metadata } from "next";
import Link from "next/link";
import { getSuperInvestor } from "@/lib/api";
import { ComplianceRating } from "@/components/compliance-rating";
import { DonutChart } from "@/components/donut-chart";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const inv = await getSuperInvestor(slug);
  const name = inv?.name ?? slug;
  return {
    title: `${name} — Halal Portfolio Analysis | Barakfi`,
    description: `See ${name}'s portfolio screened for Shariah compliance. ${inv?.halal_pct ?? 0}% of holdings are halal.`,
  };
}

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  HALAL: { bg: "var(--emerald-dim)", fg: "var(--emerald)" },
  CAUTIOUS: { bg: "var(--gold-dim)", fg: "var(--gold)" },
  NON_COMPLIANT: { bg: "var(--red-dim)", fg: "var(--red)" },
  UNKNOWN: { bg: "var(--bg-soft)", fg: "var(--text-tertiary)" },
};

export default async function SuperInvestorDetailPage({ params }: Props) {
  const { slug } = await params;
  const inv = await getSuperInvestor(slug);

  if (!inv) {
    return (
      <main className="shellPage">
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>Investor not found</h1>
          <Link href="/super-investors" style={{ color: "var(--emerald)", fontWeight: 600, marginTop: 16, display: "inline-block" }}>
            ← Back to Super Investors
          </Link>
        </div>
      </main>
    );
  }

  const statusCounts = { HALAL: 0, CAUTIOUS: 0, NON_COMPLIANT: 0, UNKNOWN: 0 };
  for (const h of inv.holdings) {
    const key = h.compliance_status as keyof typeof statusCounts;
    if (key in statusCounts) statusCounts[key]++;
    else statusCounts.UNKNOWN++;
  }

  return (
    <main className="shellPage">
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 64px" }}>
        <Link href="/super-investors" style={{ color: "var(--text-tertiary)", fontSize: "0.8rem", textDecoration: "none", fontWeight: 500 }}>
          ← All Super Investors
        </Link>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginTop: 16, marginBottom: 32, flexWrap: "wrap" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "var(--emerald-dim)", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: "1.5rem", fontWeight: 800, color: "var(--emerald)",
          }}>
            {inv.name.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 800, marginBottom: 4 }}>
              {inv.name}
            </h1>
            <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)", marginBottom: 8 }}>{inv.firm}</p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", maxWidth: 500, lineHeight: 1.5 }}>{inv.bio}</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Holdings Tracked", value: String(inv.total_holdings) },
            { label: "Halal Holdings", value: `${inv.halal_pct}%`, color: "var(--emerald)" },
            { label: "Halal Count", value: `${inv.halal_count} / ${inv.total_holdings}` },
          ].map((stat) => (
            <div key={stat.label} style={{
              padding: "20px 24px", background: "var(--bg-elevated)",
              borderRadius: "var(--radius-lg)", border: "1px solid var(--line)",
            }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                {stat.label}
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: stat.color ?? "var(--text)" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 24, alignItems: "start" }}>
          <div style={{
            padding: 20, background: "var(--bg-elevated)",
            borderRadius: "var(--radius-lg)", border: "1px solid var(--line)",
          }}>
            <DonutChart
              size={140}
              segments={[
                { label: "Halal", value: statusCounts.HALAL, color: "var(--emerald)" },
                { label: "Cautious", value: statusCounts.CAUTIOUS, color: "var(--gold)" },
                { label: "Non-Compliant", value: statusCounts.NON_COMPLIANT, color: "var(--red)" },
                { label: "Unknown", value: statusCounts.UNKNOWN, color: "var(--text-muted)" },
              ].filter((s) => s.value > 0)}
            />
          </div>

          <div style={{
            background: "var(--bg-elevated)", borderRadius: "var(--radius-xl)",
            border: "1px solid var(--line)", overflow: "hidden",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Stock", "Shares", "Value", "% Portfolio", "Status", "Rating"].map((h) => (
                    <th key={h} style={{
                      padding: "10px 14px", textAlign: "left",
                      fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: "0.04em", color: "var(--text-tertiary)",
                      borderBottom: "1px solid var(--line)",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inv.holdings.map((h) => {
                  const st = STATUS_STYLE[h.compliance_status] ?? STATUS_STYLE.UNKNOWN;
                  return (
                    <tr key={h.symbol} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>{h.symbol}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>{h.company_name}</div>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: "0.82rem" }}>
                        {h.shares.toLocaleString()}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: "0.82rem", fontWeight: 600 }}>
                        ${(h.value / 1e9).toFixed(1)}B
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: "0.82rem" }}>
                        {h.pct_portfolio.toFixed(1)}%
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 4, fontSize: "0.7rem",
                          fontWeight: 600, background: st.bg, color: st.fg,
                        }}>
                          {h.compliance_status.replace("_", " ")}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <ComplianceRating rating={h.compliance_rating} size={12} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

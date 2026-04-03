import type { Metadata } from "next";
import Link from "next/link";
import { getCollection } from "@/lib/api";
import { StockLogo } from "@/components/stock-logo";
import { ComplianceRating } from "@/components/compliance-rating";
import { CountryBadge } from "@/components/country-badge";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollection(slug);
  const name = collection?.name ?? slug;
  return {
    title: `${name} — Halal Stock Collection | Barakfi`,
    description: collection?.description ?? `Browse stocks in the ${name} collection on Barakfi.`,
  };
}

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  HALAL: { bg: "var(--emerald-dim)", fg: "var(--emerald)" },
  CAUTIOUS: { bg: "var(--gold-dim)", fg: "var(--gold)" },
  NON_COMPLIANT: { bg: "var(--red-dim)", fg: "var(--red)" },
};

export default async function CollectionDetailPage({ params }: Props) {
  const { slug } = await params;
  const collection = await getCollection(slug);

  if (!collection) {
    return (
      <main className="shellPage">
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>Collection not found</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 8 }}>
            This collection does not exist or has been removed.
          </p>
          <Link href="/collections" style={{ color: "var(--emerald)", fontWeight: 600, marginTop: 16, display: "inline-block" }}>
            ← Back to collections
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="shellPage">
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 64px" }}>
        <Link href="/collections" style={{ color: "var(--text-tertiary)", fontSize: "0.8rem", textDecoration: "none", fontWeight: 500 }}>
          ← All Collections
        </Link>

        <div style={{ marginTop: 16, marginBottom: 32 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 800, marginBottom: 6 }}>
            {collection.name}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: 600 }}>
            {collection.description}
          </p>
        </div>

        <div style={{
          background: "var(--bg-elevated)", borderRadius: "var(--radius-xl)",
          border: "1px solid var(--line)", overflow: "hidden",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Stock", "Exchange", "Sector", "Price", "Status", "Rating"].map((h) => (
                  <th key={h} style={{
                    padding: "12px 16px", textAlign: "left",
                    fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.04em", color: "var(--text-tertiary)",
                    borderBottom: "1px solid var(--line)", background: "var(--bg-elevated)",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {collection.stocks.map((s) => {
                const st = STATUS_STYLE[s.compliance_status] ?? STATUS_STYLE.CAUTIOUS;
                return (
                  <tr key={s.symbol} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <Link href={`/stocks/${s.symbol}`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
                        <StockLogo symbol={s.symbol} size={32} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{s.symbol}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{s.name}</div>
                        </div>
                      </Link>
                    </td>
                    <td style={{ padding: "12px 16px" }}><CountryBadge exchange={s.exchange} /></td>
                    <td style={{ padding: "12px 16px", fontSize: "0.82rem", color: "var(--text-secondary)" }}>{s.sector}</td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem", fontWeight: 600 }}>
                      {s.exchange === "US" ? "$" : s.exchange === "LSE" ? "£" : "₹"}{s.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: "0.72rem",
                        fontWeight: 600, background: st.bg, color: st.fg,
                      }}>
                        {s.compliance_status.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <ComplianceRating rating={s.compliance_rating} size={14} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

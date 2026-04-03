import type { Metadata } from "next";
import Link from "next/link";
import { getCollections } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Halal Stock Collections — Curated Shariah Compliant Lists | Barakfi",
  description:
    "Explore curated collections of Shariah-compliant stocks. Browse halal tech giants, blue chips, clean energy, healthcare, and more.",
  keywords: [
    "halal stock collections", "shariah compliant stock lists", "curated halal stocks",
    "islamic investment portfolios", "halal blue chips", "halal tech stocks",
  ],
};

const ICON_MAP: Record<string, string> = {
  laptop: "💻", shield: "🛡️", leaf: "🌿", heart: "❤️",
  "shopping-bag": "🛍️", flag: "🏴", building: "🏗️", coins: "💰",
};

export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <main className="shellPage">
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 64px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 800, marginBottom: 6 }}>
            Halal Stock Collections
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: 600 }}>
            Curated groups of Shariah-compliant stocks organized by theme, sector, and geography.
          </p>
        </div>

        {collections.length === 0 ? (
          <div style={{
            padding: "48px 24px", textAlign: "center",
            background: "var(--bg-elevated)", borderRadius: "var(--radius-xl)",
            border: "1px solid var(--line)", color: "var(--text-tertiary)",
          }}>
            Collections are being curated. Check back soon.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {collections.map((c) => (
              <Link
                key={c.slug}
                href={`/collections/${c.slug}`}
                style={{
                  display: "block", padding: 24,
                  background: "var(--bg-elevated)", borderRadius: "var(--radius-xl)",
                  border: "1px solid var(--line)", textDecoration: "none", color: "inherit",
                  transition: "border-color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "var(--emerald)";
                  el.style.transform = "translateY(-2px)";
                  el.style.boxShadow = "var(--shadow-lg)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "var(--line)";
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "none";
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: 12 }}>
                  {ICON_MAP[c.icon] || "📊"}
                </div>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-display)" }}>
                  {c.name}
                </h2>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
                  {c.description}
                </p>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "4px 10px", borderRadius: "var(--radius-full)",
                  background: "var(--emerald-dim)", color: "var(--emerald)",
                  fontSize: "0.75rem", fontWeight: 600,
                }}>
                  {c.stock_count} stocks
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Islamic Finance News — Halal Investing Updates | Barakfi",
  description:
    "Stay updated with the latest Islamic finance and halal investing news. Market updates, regulatory changes, and industry insights.",
  keywords: [
    "islamic finance news", "halal investing news", "shariah compliance updates",
    "muslim investor news", "halal stock market news",
  ],
};

const NEWS_ITEMS = [
  {
    title: "Global Islamic Finance Assets Expected to Reach $5.9 Trillion by 2026",
    source: "Islamic Financial Services Board",
    date: "2026-03-28",
    category: "Industry",
    summary: "The global Islamic finance industry continues its growth trajectory with increasing demand for Shariah-compliant financial products across Asia, Middle East, and Africa.",
  },
  {
    title: "AAOIFI Updates Shariah Standards for Equity Screening",
    source: "AAOIFI",
    date: "2026-03-15",
    category: "Regulation",
    summary: "The Accounting and Auditing Organisation for Islamic Financial Institutions has released updated guidelines for equity screening methodologies.",
  },
  {
    title: "Halal ETF Market Grows 40% Year-Over-Year",
    source: "Bloomberg",
    date: "2026-03-10",
    category: "Markets",
    summary: "The global halal ETF market has seen unprecedented growth, with new funds launching across Europe and Southeast Asia.",
  },
  {
    title: "India Emerging as Key Market for Islamic Finance Products",
    source: "Economic Times",
    date: "2026-03-05",
    category: "Markets",
    summary: "With a growing Muslim population and increasing financial inclusion, India represents a significant opportunity for halal investment products.",
  },
  {
    title: "Technology Sector Leads Shariah-Compliant Stock Performance",
    source: "S&P Dow Jones Indices",
    date: "2026-02-28",
    category: "Performance",
    summary: "Technology stocks continue to dominate Shariah-compliant indices, benefiting from low debt ratios and minimal non-permissible revenue.",
  },
  {
    title: "New Research Shows Growing Demand for ESG + Shariah Investing",
    source: "Reuters",
    date: "2026-02-20",
    category: "Research",
    summary: "A convergence of Environmental, Social, and Governance (ESG) criteria with Shariah compliance is creating new opportunities for values-based investors.",
  },
];

const CATEGORY_COLORS: Record<string, { bg: string; fg: string }> = {
  Industry: { bg: "var(--emerald-dim)", fg: "var(--emerald)" },
  Regulation: { bg: "var(--blue-dim)", fg: "var(--blue)" },
  Markets: { bg: "var(--purple-dim)", fg: "var(--purple)" },
  Performance: { bg: "var(--gold-dim)", fg: "var(--gold)" },
  Research: { bg: "var(--blue-dim)", fg: "var(--blue)" },
};

export default function NewsPage() {
  return (
    <main className="shellPage">
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 64px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 800, marginBottom: 6 }}>
            Islamic Finance News
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: 600 }}>
            Stay informed with the latest developments in Islamic finance, halal investing, and Shariah-compliant markets worldwide.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {NEWS_ITEMS.map((item, i) => {
            const catColor = CATEGORY_COLORS[item.category] ?? { bg: "var(--bg-soft)", fg: "var(--text-secondary)" };
            return (
              <article
                key={i}
                style={{
                  padding: 24, background: "var(--bg-elevated)",
                  borderRadius: "var(--radius-xl)", border: "1px solid var(--line)",
                  transition: "border-color var(--transition-fast)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 4, fontSize: "0.68rem",
                    fontWeight: 600, background: catColor.bg, color: catColor.fg,
                  }}>
                    {item.category}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>
                    {new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 8, fontFamily: "var(--font-display)", lineHeight: 1.4 }}>
                  {item.title}
                </h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 8 }}>
                  {item.summary}
                </p>
                <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", fontWeight: 500 }}>
                  Source: {item.source}
                </span>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Halal Investing Academy — Learn Islamic Finance | Barakfi",
  description:
    "Learn about halal investing, Shariah screening methodologies, purification, and AAOIFI standards. Free educational resources for Muslim investors.",
  keywords: [
    "halal investing guide", "islamic finance education", "shariah screening explained",
    "AAOIFI standards", "halal stock screening guide", "purification calculator guide",
    "how to invest halal", "islamic investment basics",
  ],
};

const ARTICLES = [
  {
    slug: "what-makes-a-stock-halal",
    title: "What Makes a Stock Halal?",
    description: "Understanding the financial ratios and sector screens that determine whether a stock is Shariah-compliant.",
    category: "Basics",
    readTime: "5 min read",
    icon: "📖",
  },
  {
    slug: "understanding-purification",
    title: "Understanding Purification (Tazkiyah)",
    description: "How to calculate and donate the non-permissible portion of your investment returns.",
    category: "Purification",
    readTime: "4 min read",
    icon: "🧹",
  },
  {
    slug: "aaoifi-standards-explained",
    title: "AAOIFI Standards Explained",
    description: "A deep dive into the Accounting and Auditing Organisation for Islamic Financial Institutions standards.",
    category: "Methodology",
    readTime: "7 min read",
    icon: "📋",
  },
  {
    slug: "sp-shariah-methodology",
    title: "S&P Shariah Indices Methodology",
    description: "How S&P screens stocks for Shariah compliance using market cap-based denominators.",
    category: "Methodology",
    readTime: "6 min read",
    icon: "📊",
  },
  {
    slug: "financial-ratios-for-screening",
    title: "Financial Ratios Used in Screening",
    description: "Debt-to-equity, receivables ratio, non-permissible income — understanding each ratio and its threshold.",
    category: "Technical",
    readTime: "8 min read",
    icon: "🔢",
  },
  {
    slug: "halal-etf-investing",
    title: "Halal ETF Investing Guide",
    description: "Can you invest in ETFs as a Muslim? Understanding how to evaluate exchange-traded funds for compliance.",
    category: "Investing",
    readTime: "5 min read",
    icon: "📈",
  },
  {
    slug: "zakat-on-stocks",
    title: "Calculating Zakat on Stock Investments",
    description: "How to calculate zakat on your equity portfolio, dividends, and unrealized gains.",
    category: "Zakat",
    readTime: "6 min read",
    icon: "🌙",
  },
  {
    slug: "global-halal-markets",
    title: "Global Halal Investment Markets",
    description: "Overview of halal investing opportunities across US, UK, India, Southeast Asia, and MENA markets.",
    category: "Markets",
    readTime: "7 min read",
    icon: "🌍",
  },
];

const CATEGORY_COLORS: Record<string, { bg: string; fg: string }> = {
  Basics: { bg: "var(--emerald-dim)", fg: "var(--emerald)" },
  Purification: { bg: "var(--purple-dim)", fg: "var(--purple)" },
  Methodology: { bg: "var(--blue-dim)", fg: "var(--blue)" },
  Technical: { bg: "var(--gold-dim)", fg: "var(--gold)" },
  Investing: { bg: "var(--emerald-dim)", fg: "var(--emerald)" },
  Zakat: { bg: "var(--purple-dim)", fg: "var(--purple)" },
  Markets: { bg: "var(--blue-dim)", fg: "var(--blue)" },
};

export default function AcademyPage() {
  return (
    <main className="shellPage">
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 64px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 800, marginBottom: 6 }}>
            Halal Investing Academy
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: 600 }}>
            Educational resources to help you understand Shariah-compliant investing, screening methodologies, and Islamic finance principles.
          </p>
        </div>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {ARTICLES.map((article) => {
            const catColor = CATEGORY_COLORS[article.category] ?? { bg: "var(--bg-soft)", fg: "var(--text-secondary)" };
            return (
              <Link
                key={article.slug}
                href={`/academy/${article.slug}`}
                style={{
                  display: "block", padding: 24,
                  background: "var(--bg-elevated)", borderRadius: "var(--radius-xl)",
                  border: "1px solid var(--line)", textDecoration: "none", color: "inherit",
                  transition: "border-color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: "1.5rem" }}>{article.icon}</span>
                  <span style={{
                    padding: "2px 8px", borderRadius: 4, fontSize: "0.68rem",
                    fontWeight: 600, background: catColor.bg, color: catColor.fg,
                  }}>
                    {article.category}
                  </span>
                </div>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 8, fontFamily: "var(--font-display)" }}>
                  {article.title}
                </h2>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 12 }}>
                  {article.description}
                </p>
                <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", fontWeight: 500 }}>
                  {article.readTime}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

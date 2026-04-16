import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const ARTICLES: Record<string, { title: string; content: string }> = {
  "what-is-halal-investing": {
    title: "What is Halal Investing?",
    content: "Halal investing follows Islamic financial principles — avoiding interest (riba), excessive uncertainty (gharar), and prohibited industries like alcohol, gambling, and conventional banking. Stocks are screened against financial ratios to ensure the company's business and finances align with Islamic law.\n\nThe core idea is simple: invest only in companies whose primary business is permissible (halal) and whose financial structure doesn't rely excessively on interest-based debt.\n\nKey principles:\n\n1. Business Activity Screening — The company must not derive significant revenue from prohibited activities.\n\n2. Financial Ratio Screening — Debt, cash holdings, and receivables must be below specific thresholds relative to market capitalization.\n\n3. Income Purification — Even compliant companies may have small amounts of non-permissible income, which investors should donate to charity.",
  },
  "shariah-screening-explained": {
    title: "Shariah Screening Explained",
    content: "Shariah screening is the process of evaluating whether a company's stock is permissible for Muslim investors. Three globally recognized methodologies are used:\n\n1. S&P Shariah Indices — Uses 36-month average market cap as the denominator for financial ratios. Thresholds: debt < 33%, receivables < 49%, cash + interest-bearing securities < 33%.\n\n2. AAOIFI Standards — Uses total assets as the denominator. Stricter thresholds in some areas.\n\n3. FTSE/Maxis — Similar to S&P but with slightly different sector classifications and ratio calculations.\n\nEach stock is tested against 5 key financial ratios plus sector exclusions. A stock must pass ALL criteria to be classified as Halal.",
  },
  "understanding-financial-ratios": {
    title: "Understanding Financial Ratios",
    content: "Five key financial ratios determine Shariah compliance:\n\n1. Debt Ratio — Total debt divided by 36-month average market cap. Must be below 33% (S&P) or 30% (AAOIFI).\n\n2. Receivables Ratio — Accounts receivable divided by market cap. Must be below 49% (S&P) or 45% (AAOIFI).\n\n3. Cash & Interest-Bearing Securities — Cash plus short-term investments divided by market cap. Must be below 33%.\n\n4. Non-Permissible Income — Revenue from prohibited sources must be below 5% of total revenue.\n\n5. Interest Income — Interest earned must be below 5% of total revenue.\n\nCompanies that fail any single ratio are marked as non-compliant.",
  },
  "dividend-purification": {
    title: "Dividend Purification Guide",
    content: "Even Shariah-compliant companies may earn a small percentage of income from non-permissible sources. As an investor, you should purify your dividends by donating this portion to charity.\n\nFormula: Purification Amount = Dividend Received × (Non-Permissible Income / Total Revenue)\n\nFor example, if a company has 2% non-permissible income and you received ₹1,000 in dividends, you should donate ₹20.\n\nUse Barakfi's free Purification Calculator at /tools/purification to calculate your exact amount.",
  },
  "zakat-on-investments": {
    title: "Zakat on Stock Investments",
    content: "Zakat on stocks is calculated at 2.5% of your total zakatable wealth, provided it exceeds the Nisab threshold.\n\nFor stocks held for trading (short-term): Zakat is due on the full market value.\n\nFor stocks held for investment (long-term): Scholars differ — some say zakat on full value, others only on the company's zakatable assets per share.\n\nThe Nisab threshold is approximately 85 grams of gold or 595 grams of silver.\n\nUse Barakfi's free Zakat Calculator at /tools/zakat to compute your zakat obligation.",
  },
  "building-halal-portfolio": {
    title: "Building a Halal Portfolio",
    content: "A well-constructed halal portfolio follows these principles:\n\n1. Diversification — Spread across sectors (IT, pharma, consumer, industrial) and geographies (India, US, UK).\n\n2. Quality Focus — Prefer companies with low debt, strong cash flows, and consistent earnings.\n\n3. Regular Screening — Re-screen your holdings quarterly as financial data changes.\n\n4. Purification — Set aside purification amounts from dividends.\n\n5. Zakat — Calculate and pay zakat annually on your portfolio.\n\n6. Research — Use tools like Barakfi to compare compliance across methodologies before investing.",
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = ARTICLES[slug];
  if (!article) {
    return {
      title: "Article Not Found",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `${article.title} — Barakfi Academy`,
    description: article.content.slice(0, 160),
    alternates: { canonical: `/academy/${slug}` },
    robots: { index: true, follow: true },
  };
}

export default async function AcademyArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = ARTICLES[slug];

  if (!article) {
    notFound();
  }

  return (
    <main className="shellPage">
      <article style={{ maxWidth: 700, margin: "0 auto", padding: "24px 24px 64px" }}>
        <nav style={{ display: "flex", gap: 8, fontSize: "0.8rem", color: "var(--text-tertiary)", marginBottom: 20 }}>
          <Link href="/" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <Link href="/academy" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>Academy</Link>
          <span>/</span>
          <span style={{ color: "var(--text-secondary)" }}>{article.title}</span>
        </nav>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text)", marginBottom: 24 }}>
          {article.title}
        </h1>
        <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.8, whiteSpace: "pre-line" }}>
          {article.content}
        </div>
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
          <Link href="/academy" style={{ color: "var(--emerald)", fontWeight: 600, fontSize: "0.88rem" }}>← Back to Academy</Link>
        </div>
      </article>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

type Props = { params: Promise<{ slug: string }> };

const ARTICLES: Record<string, { title: string; content: string[]; category: string }> = {
  "what-makes-a-stock-halal": {
    title: "What Makes a Stock Halal?",
    category: "Basics",
    content: [
      "Shariah-compliant investing follows Islamic finance principles that prohibit interest (riba), excessive uncertainty (gharar), and investment in businesses involved in prohibited activities.",
      "A stock is considered halal when it passes two main tests: a qualitative business activity screen and a quantitative financial ratio screen.",
      "The business activity screen excludes companies whose primary business involves alcohol, tobacco, gambling, conventional financial services (interest-based banking and insurance), pork products, weapons, and adult entertainment.",
      "The financial ratio screen evaluates several key metrics. The debt-to-market-cap (or total assets) ratio must be below 33%, ensuring the company does not rely excessively on interest-bearing debt. Non-permissible income must be less than 5% of total revenue. Accounts receivable must be below 33-49% of assets depending on the methodology.",
      "Different screening bodies use slightly different thresholds and denominators. S&P uses market capitalization as the denominator for debt ratios, while AAOIFI and FTSE use total assets. This is why a stock might be halal under one methodology but not another.",
      "At Barakfi, we screen every stock against three internationally recognized methodologies — S&P Shariah Indices, AAOIFI Standards, and FTSE Yasaar (Maxis) — giving you the most comprehensive compliance picture possible.",
    ],
  },
  "understanding-purification": {
    title: "Understanding Purification (Tazkiyah)",
    category: "Purification",
    content: [
      "Even halal-compliant companies may earn a small portion of their income from non-permissible sources such as interest on bank deposits or minor business activities that are not fully Shariah-compliant.",
      "Purification (Tazkiyah) is the process of calculating and donating this non-permissible portion of your investment returns to charity. It ensures your investment income remains clean and in line with Islamic principles.",
      "The purification ratio is calculated by dividing the company's non-permissible income by its total income. This percentage is then applied to your dividend income to determine how much you should donate.",
      "For example, if a company has a purification ratio of 2.5% and you received dividends of 10,000 INR, you would donate 250 INR to charity (not to family or personal use — it must be given to those in need without expecting reward).",
      "Purification only applies to dividend income, not capital gains. Most scholars agree that capital gains from selling shares do not require purification since they reflect the market's assessment of the company's overall value rather than its non-permissible income.",
      "Barakfi calculates the purification ratio for every screened stock automatically, making it easy to fulfill this important obligation.",
    ],
  },
  "aaoifi-standards-explained": {
    title: "AAOIFI Standards Explained",
    category: "Methodology",
    content: [
      "The Accounting and Auditing Organisation for Islamic Financial Institutions (AAOIFI) is a Bahrain-based international body that sets Shariah standards for Islamic finance.",
      "AAOIFI's equity screening standard (Shariah Standard No. 21) provides specific financial ratio thresholds that companies must meet to be considered Shariah-compliant.",
      "Under AAOIFI, total interest-bearing debt must not exceed 30% of total assets (stricter than S&P's 33% of market cap). This ensures companies do not rely heavily on conventional interest-based financing.",
      "Non-permissible income must be less than 5% of total revenue, the same threshold used across most major methodologies. This includes income from interest, gambling, alcohol, and other prohibited activities.",
      "Accounts receivable and cash must be carefully evaluated. AAOIFI allows receivables up to 49% of total assets but limits cash and interest-bearing securities to 30% of total assets.",
      "AAOIFI uses total assets as the denominator for all ratio calculations, making it more consistent but potentially more conservative than market-cap-based approaches during bull markets.",
      "Many Islamic banks, takaful companies, and investment funds worldwide follow AAOIFI standards, making it one of the most widely adopted screening methodologies globally.",
    ],
  },
  "sp-shariah-methodology": {
    title: "S&P Shariah Indices Methodology",
    category: "Methodology",
    content: [
      "S&P Dow Jones Indices maintains a family of Shariah-compliant indices that screen thousands of stocks globally using a methodology developed in consultation with Ratings Intelligence Partners.",
      "The S&P methodology uses a two-step screening process. First, companies are screened by sector to exclude those involved in prohibited business activities. Then, remaining companies undergo quantitative financial ratio screening.",
      "A distinctive feature of the S&P methodology is its use of 36-month average market capitalization as the denominator for debt ratios. This smooths out market volatility and provides a more stable screening result.",
      "The key thresholds are: total debt must be less than 33% of 36-month average market cap; accounts receivable must be less than 33% of current market cap; cash and interest-bearing securities must be less than 33% of total assets; and non-permissible income must be less than 5% of total revenue.",
      "The S&P Shariah indices are rebalanced quarterly, with compliance reviews conducted regularly. Stocks that become non-compliant are removed at the next rebalance with a buffer period.",
      "This methodology is used as the basis for many Shariah-compliant ETFs and mutual funds globally, including products by iShares, Franklin Templeton, and SP Funds.",
    ],
  },
  "financial-ratios-for-screening": {
    title: "Financial Ratios Used in Screening",
    category: "Technical",
    content: [
      "Shariah screening relies on several key financial ratios calculated from a company's balance sheet and income statement. Understanding these ratios helps you evaluate compliance yourself.",
      "The Debt Ratio measures how much a company relies on interest-bearing borrowing. It's calculated as total debt divided by either market capitalization (S&P method) or total assets (AAOIFI/FTSE method). The threshold is typically 30-33%.",
      "The Non-Permissible Income Ratio tracks revenue from prohibited sources as a percentage of total revenue. The universal threshold is 5%. This includes interest income, gambling revenue, alcohol sales, and similar prohibited activities.",
      "The Receivables Ratio measures accounts receivable as a proportion of assets or market cap. High receivables can indicate the company is essentially acting as a lender. Thresholds range from 33% (S&P) to 49% (AAOIFI).",
      "The Cash and Interest-Bearing Securities Ratio ensures the company does not hold excessive amounts in interest-bearing instruments. This is measured against total assets with a typical threshold of 30-33%.",
      "The Fixed Assets Ratio is a supplementary check. Companies with very low tangible assets (below 25%) may warrant additional review since their value is primarily in intangible assets and cash, which complicates Shariah compliance assessment.",
    ],
  },
  "halal-etf-investing": {
    title: "Halal ETF Investing Guide",
    category: "Investing",
    content: [
      "Exchange-Traded Funds (ETFs) can be a convenient way for Muslim investors to achieve diversified, Shariah-compliant exposure to global markets.",
      "A halal ETF holds a basket of stocks that have been screened for Shariah compliance. The fund is managed to maintain compliance, with non-compliant stocks removed during regular rebalancing.",
      "When evaluating a halal ETF, look at the percentage of holdings that are Shariah-compliant. The best halal ETFs maintain 95%+ compliance across their holdings.",
      "Consider the screening methodology used by the ETF. Most use either S&P or AAOIFI standards. Some use proprietary methodologies reviewed by a Shariah advisory board.",
      "Halal ETFs are available across major markets including the US (SP Funds, Wahed), Malaysia (Bursa Malaysia), and global markets. Expense ratios are typically competitive with conventional ETFs.",
      "Be aware of purification requirements. Even halal ETFs may hold stocks with small amounts of non-permissible income. Check the fund's purification guidance and donate accordingly.",
    ],
  },
  "zakat-on-stocks": {
    title: "Calculating Zakat on Stock Investments",
    category: "Zakat",
    content: [
      "Zakat is an obligatory form of charity in Islam, typically calculated at 2.5% of eligible wealth held for one lunar year above the nisab (minimum threshold).",
      "For stock investments, the zakat calculation depends on your investment intent. If you hold stocks for long-term investment, scholars recommend paying zakat on the zakatable assets per share (cash + receivables - liabilities) multiplied by the number of shares you own.",
      "If you actively trade stocks (buying and selling frequently), the entire market value of your portfolio may be subject to zakat at 2.5%, similar to business inventory.",
      "Dividends received during the year are added to your total zakatable wealth. Capital gains that are realized (sold) are also included in your zakat calculation.",
      "The nisab threshold is approximately 85 grams of gold or 595 grams of silver. As of early 2026, this translates to roughly 5-6 lakh INR or approximately $7,000 USD, though the exact amount fluctuates with commodity prices.",
      "Barakfi's zakat calculator helps you compute your obligation based on your portfolio value, the trading vs. investment distinction, and current nisab values.",
    ],
  },
  "global-halal-markets": {
    title: "Global Halal Investment Markets",
    category: "Markets",
    content: [
      "The global Islamic finance industry is one of the fastest-growing segments of the financial sector, spanning banking, insurance (takaful), capital markets, and asset management.",
      "Malaysia is the global leader in Islamic finance, with a comprehensive regulatory framework, established Shariah-compliant exchanges, and a wide range of halal investment products.",
      "The GCC countries (Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, Oman) represent the largest pool of Islamic finance assets, driven by wealth from natural resources and strong institutional support.",
      "India, with the world's third-largest Muslim population, is an emerging market for halal investments. While regulatory frameworks for Islamic banking are still developing, the equity market offers substantial opportunities for Shariah-compliant investing.",
      "The United States and United Kingdom have growing halal investment ecosystems, with several Shariah-compliant ETFs, mutual funds, and fintech platforms catering to Muslim investors.",
      "Barakfi screens stocks across multiple global exchanges including NSE (India), NYSE/NASDAQ (US), and LSE (UK), providing a unified platform for halal investors worldwide.",
    ],
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = ARTICLES[slug];
  return {
    title: article ? `${article.title} — Halal Investing Academy | Barakfi` : "Article Not Found | Barakfi",
    description: article?.content[0]?.substring(0, 160) ?? "Article not found.",
  };
}

export default async function AcademyArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = ARTICLES[slug];

  if (!article) {
    return (
      <main className="shellPage">
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "48px 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>Article not found</h1>
          <Link href="/academy" style={{ color: "var(--emerald)", fontWeight: 600, marginTop: 16, display: "inline-block" }}>
            ← Back to Academy
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="shellPage">
      <article style={{ maxWidth: 700, margin: "0 auto", padding: "24px 24px 64px" }}>
        <Link href="/academy" style={{ color: "var(--text-tertiary)", fontSize: "0.8rem", textDecoration: "none", fontWeight: 500 }}>
          ← Academy
        </Link>
        <div style={{ marginTop: 16, marginBottom: 32 }}>
          <span style={{
            padding: "3px 10px", borderRadius: 4, fontSize: "0.72rem",
            fontWeight: 600, background: "var(--emerald-dim)", color: "var(--emerald)",
            marginBottom: 12, display: "inline-block",
          }}>
            {article.category}
          </span>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 800, lineHeight: 1.3 }}>
            {article.title}
          </h1>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {article.content.map((paragraph, i) => (
            <p key={i} style={{ fontSize: "0.92rem", lineHeight: 1.7, color: "var(--text-secondary)" }}>
              {paragraph}
            </p>
          ))}
        </div>
        <div style={{ marginTop: 40, padding: "20px 24px", background: "var(--bg-soft)", borderRadius: "var(--radius-lg)" }}>
          <p style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
            <strong>Disclaimer:</strong> This content is for educational purposes only and does not constitute investment advice or a recommendation to buy or sell any security. Always consult with a qualified financial advisor and Shariah scholar for personalized guidance.
          </p>
        </div>
      </article>
    </main>
  );
}

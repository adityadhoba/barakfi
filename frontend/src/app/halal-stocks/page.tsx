import type { Metadata } from "next";
import Link from "next/link";
import { getStocks, getBulkScreeningResults } from "@/lib/api";
import { StockLogo } from "@/components/stock-logo";
import styles from "./halal-stocks.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Halal Stocks in India 2026 — Complete Shariah-Compliant Stock List | Barakfi",
  description:
    "Browse the complete list of Shariah-compliant (halal) stocks on India's NSE. Screened using S&P Shariah methodology with real-time financial data. Free halal stock screener for Indian Muslim investors.",
  keywords: [
    "halal stocks India",
    "shariah compliant stocks India",
    "halal investment India",
    "Islamic stocks India",
    "shariah stock screener",
    "halal stocks NSE",
    "Muslim friendly investments India",
    "halal equity India",
    "shariah compliant NSE stocks",
    "Islamic finance India",
  ],
  openGraph: {
    title: "Halal Stocks in India 2026 — Complete Shariah-Compliant Stock List",
    description: "Browse all Shariah-compliant stocks on India's NSE. Free halal stock screener powered by S&P methodology.",
    type: "website",
    locale: "en_IN",
    siteName: "Barakfi",
  },
  alternates: {
    canonical: "https://barakfi.in/halal-stocks",
  },
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function formatMcap(value: number) {
  if (value >= 1e7) return `\u20B9${(value / 1e7).toFixed(0)} Cr`;
  if (value >= 1e5) return `\u20B9${(value / 1e5).toFixed(1)} L`;
  return formatPrice(value);
}

export default async function HalalStocksPage() {
  const stocks = await getStocks();
  const symbols = stocks.map((s) => s.symbol);
  const screeningResults = await getBulkScreeningResults(symbols);
  const screeningMap = new Map(screeningResults.map((r) => [r.symbol, r]));

  const halalStocks = stocks
    .filter((s) => screeningMap.get(s.symbol)?.status === "HALAL")
    .sort((a, b) => b.market_cap - a.market_cap);

  const reviewStocks = stocks
    .filter((s) => screeningMap.get(s.symbol)?.status === "REQUIRES_REVIEW")
    .sort((a, b) => b.market_cap - a.market_cap);

  const sectorCounts: Record<string, number> = {};
  for (const s of halalStocks) {
    sectorCounts[s.sector] = (sectorCounts[s.sector] || 0) + 1;
  }
  const topSectors = Object.entries(sectorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Halal Stocks in India",
    description: "Complete list of Shariah-compliant stocks on the Indian NSE, screened using S&P Shariah methodology.",
    numberOfItems: halalStocks.length,
    itemListElement: halalStocks.slice(0, 50).map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${s.name} (${s.symbol})`,
      url: `https://barakfi.in/stocks/${encodeURIComponent(s.symbol)}`,
    })),
  };

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <header className={styles.hero}>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Halal Stocks</span>
        </nav>
        <h1 className={styles.title}>
          Halal Stocks in India <span className={styles.year}>2026</span>
        </h1>
        <p className={styles.subtitle}>
          Complete list of {halalStocks.length} Shariah-compliant stocks on India&apos;s NSE.
          Screened using S&amp;P Shariah methodology with real-time financial data.
          {reviewStocks.length > 0 && ` Plus ${reviewStocks.length} stocks pending review.`}
        </p>
        <div className={styles.ctas}>
          <Link href="/screener" className={styles.ctaPrimary}>Open Full Screener</Link>
          <Link href="/shariah-compliance" className={styles.ctaSecondary}>Our Methodology</Link>
        </div>
      </header>

      {/* Stats Strip */}
      <section className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{halalStocks.length}</span>
          <span className={styles.statLabel}>Halal Stocks</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{reviewStocks.length}</span>
          <span className={styles.statLabel}>Under Review</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{Object.keys(sectorCounts).length}</span>
          <span className={styles.statLabel}>Sectors</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{stocks.length}</span>
          <span className={styles.statLabel}>Total Screened</span>
        </div>
      </section>

      {/* Top Sectors */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Top Halal Sectors</h2>
        <div className={styles.sectorGrid}>
          {topSectors.map(([sector, count]) => (
            <Link key={sector} href={`/screener?status=HALAL&sector=${encodeURIComponent(sector)}`} className={styles.sectorCard}>
              <span className={styles.sectorName}>{sector}</span>
              <span className={styles.sectorCount}>{count} stocks</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Halal Stocks Table */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>All Halal-Compliant Stocks</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Company</th>
                <th>Sector</th>
                <th className={styles.thRight}>Price</th>
                <th className={styles.thRight}>Market Cap</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {halalStocks.map((s, i) => (
                <tr key={s.symbol}>
                  <td className={styles.tdNum}>{i + 1}</td>
                  <td>
                    <Link href={`/stocks/${encodeURIComponent(s.symbol)}`} className={styles.stockLink}>
                      <StockLogo symbol={s.symbol} size={28} status="HALAL" />
                      <div className={styles.stockInfo}>
                        <strong>{s.name}</strong>
                        <span>{s.symbol}</span>
                      </div>
                    </Link>
                  </td>
                  <td className={styles.tdSector}>{s.sector}</td>
                  <td className={styles.tdRight}>{formatPrice(s.price)}</td>
                  <td className={styles.tdRight}>{formatMcap(s.market_cap)}</td>
                  <td>
                    <span className={styles.halalBadge}>Halal</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SEO Content Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>What Are Halal Stocks?</h2>
        <div className={styles.prose}>
          <p>
            Halal stocks are shares of companies that comply with Islamic Shariah principles.
            For a stock to be considered halal (permissible) for investment, the company must
            meet specific financial ratio thresholds and not operate in prohibited industries.
          </p>
          <h3>How We Screen for Halal Compliance</h3>
          <p>
            Barakfi uses the globally recognized <strong>S&amp;P Shariah methodology</strong> to
            screen Indian stocks listed on the NSE. Our screening evaluates six key criteria:
          </p>
          <ul>
            <li><strong>Debt-to-Market Cap Ratio</strong> must be below 33%</li>
            <li><strong>Non-Permissible Income</strong> must be under 5% of revenue</li>
            <li><strong>Interest Income</strong> must be below 5% of total income</li>
            <li><strong>Accounts Receivable</strong> must be under 33% of market cap</li>
            <li><strong>Cash &amp; Interest-Bearing Securities</strong> must be below 33% of assets</li>
            <li>The company must not operate in <strong>prohibited sectors</strong> like alcohol, gambling, or conventional banking</li>
          </ul>
          <h3>Why Halal Investing Matters in India</h3>
          <p>
            India has one of the world&apos;s largest Muslim populations, yet access to reliable
            Shariah-compliant stock screening has been limited. Barakfi bridges this gap by
            providing a free, transparent, and technology-driven halal stock screener specifically
            built for the Indian market. Whether you&apos;re looking for large-cap blue chips or
            emerging mid-cap opportunities, our screener helps you invest with both financial
            wisdom and religious compliance.
          </p>
          <h3>Is Investing in Stocks Halal?</h3>
          <p>
            Investing in stocks is generally considered permissible in Islam, provided the
            companies you invest in comply with Shariah principles. The key is to ensure the
            company&apos;s primary business is halal, its debt levels are within acceptable limits,
            and its income from non-permissible sources is minimal. Scholars from organizations
            like AAOIFI and S&amp;P have developed standardized screening methodologies to make
            this assessment systematic and transparent.
          </p>
        </div>
      </section>

      {/* FAQ Schema */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
        <div className={styles.faqGrid}>
          <div className={styles.faqItem}>
            <h3>How many halal stocks are available in India?</h3>
            <p>
              Currently, {halalStocks.length} out of {stocks.length} screened Indian stocks
              pass our Shariah compliance screening, with {reviewStocks.length} additional
              stocks under review.
            </p>
          </div>
          <div className={styles.faqItem}>
            <h3>How often is the halal stock list updated?</h3>
            <p>
              Our screening data is refreshed whenever new financial data is published by
              companies. Market prices are updated daily during trading sessions.
            </p>
          </div>
          <div className={styles.faqItem}>
            <h3>Can I use Barakfi for free?</h3>
            <p>
              Yes, Barakfi is completely free to use. You can screen stocks, build a watchlist,
              and track your portfolio without any subscription or payment.
            </p>
          </div>
          <div className={styles.faqItem}>
            <h3>Which methodology does Barakfi use?</h3>
            <p>
              We follow the S&amp;P Shariah Indices methodology, one of the most widely adopted
              Islamic equity screening standards globally, supplemented by AAOIFI standards.
            </p>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "How many halal stocks are available in India?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `Currently, ${halalStocks.length} out of ${stocks.length} screened Indian stocks pass Shariah compliance screening, with ${reviewStocks.length} additional stocks under review.`,
                },
              },
              {
                "@type": "Question",
                name: "How often is the halal stock list updated?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Screening data is refreshed whenever new financial data is published by companies. Market prices are updated daily during trading sessions.",
                },
              },
              {
                "@type": "Question",
                name: "Can I use Barakfi for free?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes, Barakfi is completely free to use. You can screen stocks, build a watchlist, and track your portfolio without any subscription.",
                },
              },
              {
                "@type": "Question",
                name: "Which methodology does Barakfi use?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Barakfi follows the S&P Shariah Indices methodology, supplemented by AAOIFI standards.",
                },
              },
            ],
          }),
        }}
      />
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import styles from "./shariah-compliance.module.css";

export const metadata: Metadata = {
  title: "Shariah Screening Methodology — Barakfi",
  description:
    "Understand our Shariah screening methodology, data sources, and how we classify stocks as Shariah Compliant, Requires Review, or Not Compliant using S&P, AAOIFI, and FTSE/Maxis standards.",
};

const SCREENING_CRITERIA = [
  {
    name: "Debt to Market Capitalisation",
    threshold: "< 33%",
    desc: "Total interest-bearing debt must be less than 33% of both the company's 36-month average market capitalisation and current market cap. This limits exposure to riba (interest-based leverage).",
  },
  {
    name: "Non-Permissible Income Ratio",
    threshold: "< 5%",
    desc: "Revenue from non-permissible activities (alcohol, gambling, tobacco, pork, etc.) must not exceed 5% of total business income. This ensures the company's core business is halal.",
  },
  {
    name: "Interest Income Ratio",
    threshold: "< 5%",
    desc: "Interest income earned from treasury operations, fixed deposits, or other interest-bearing instruments must be less than 5% of total business income.",
  },
  {
    name: "Accounts Receivable to Market Cap",
    threshold: "< 33%",
    desc: "Accounts receivable must be less than 33% of market capitalisation (S&P standard). This helps avoid companies whose value is primarily tied up in receivables, which may represent interest-based transactions.",
  },
  {
    name: "Cash & Interest-Bearing Securities",
    threshold: "< 33%",
    desc: "Cash and interest-bearing securities (including short-term holdings) must be less than 33% of total assets (AAOIFI standard). This limits exposure to companies heavily exposed to interest-bearing instruments.",
  },
  {
    name: "Sector Permissibility",
    threshold: "Pass / Fail",
    desc: "The company must not operate primarily in a prohibited sector: conventional banking/finance, conventional insurance, alcohol, tobacco, pork, gambling, adult entertainment, cannabis, interest-based lending, or controversial weapons.",
  },
];

const METHODOLOGY_SOURCES = [
  {
    name: "S&P Shariah Indices Methodology",
    desc: "The primary framework for our financial ratio screening. Developed by S&P Dow Jones Indices in consultation with Ratings Intelligence Partners, this is one of the most widely adopted Shariah equity screening standards globally.",
  },
  {
    name: "AAOIFI Shariah Standards",
    desc: "The Accounting and Auditing Organisation for Islamic Financial Institutions (AAOIFI) provides comprehensive Shariah standards referenced for sector classification and purification guidance.",
  },
  {
    name: "ICIF India Guidance",
    desc: "The Indian Centre for Islamic Finance provides contextual guidance on applying international Islamic finance standards to the Indian equity market, including treatment of Indian-specific financial instruments.",
  },
];

export default function ShariahCompliancePage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Hero */}
        <header className={styles.hero}>
          <Link href="/" className={styles.backLink}>
            &larr; Back to Home
          </Link>
          <h1 className={styles.title}>Shariah Screening Methodology</h1>
          <p className={styles.subtitle}>
            Transparency about our screening methodology, data sources,
            and the limitations of automated Shariah screening.
          </p>
          <span className={styles.effectiveDate}>Last Updated: 1 April 2026</span>
        </header>

        {/* Methodology Sources */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Methodology Sources</h2>
          <p className={styles.prose}>
            Our screening methodology draws from three primary sources, combining global best
            practices with India-specific considerations:
          </p>
          <div className={styles.sourceGrid}>
            {METHODOLOGY_SOURCES.map((source) => (
              <div className={styles.sourceCard} key={source.name}>
                <h3>{source.name}</h3>
                <p>{source.desc}</p>
              </div>
            ))}
          </div>
          <p className={styles.prose}>
            We continuously monitor updates to these standards and adjust our screening rules
            accordingly. Any material changes to the methodology are documented and versioned.
          </p>
        </section>

        {/* Screening Criteria */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Screening Criteria</h2>
          <p className={styles.prose}>
            Every stock in our universe undergoes a two-stage screening process: sector-level
            filtering followed by financial ratio analysis. The following criteria must be
            satisfied for a stock to be classified as compliant:
          </p>
          <div className={styles.criteriaGrid}>
            {SCREENING_CRITERIA.map((criterion) => (
              <div className={styles.criteriaCard} key={criterion.name}>
                <div className={styles.criteriaHeader}>
                  <h3 className={styles.criteriaName}>{criterion.name}</h3>
                  <span className={styles.criteriaThreshold}>{criterion.threshold}</span>
                </div>
                <p className={styles.criteriaDesc}>{criterion.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Classification Meanings */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What the Classifications Mean</h2>
          <p className={styles.prose}>
            Each stock is assigned one of three compliance statuses based on the screening
            results:
          </p>
          <div className={styles.outcomeGrid}>
            <div className={`${styles.outcomeCard} ${styles.outcomeHalal}`}>
              <span className={styles.outcomeBadge}>Shariah Compliant</span>
              <p>
                The stock passes both the sector screen and all financial ratio thresholds.
                Based on available data and our automated methodology, the stock screens
                within the required thresholds. This is <strong>not</strong> a religious
                certification — users should verify with their scholar.
              </p>
            </div>
            <div className={`${styles.outcomeCard} ${styles.outcomeReview}`}>
              <span className={styles.outcomeBadge}>Requires Review</span>
              <p>
                The stock passes core screening rules but carries flags that need attention:
                borderline ratios (within 5% of a threshold), mixed business activities,
                data gaps in financial statements, or recent corporate actions that may
                affect compliance. Users should review the specific flags before relying on
                the classification.
              </p>
            </div>
            <div className={`${styles.outcomeCard} ${styles.outcomeFail}`}>
              <span className={styles.outcomeBadge}>Not Compliant</span>
              <p>
                The stock fails one or more screening criteria — either it operates in a
                prohibited sector or one or more financial ratios exceed the permissible
                threshold. Under this methodology, the stock does not meet the required
                compliance thresholds.
              </p>
            </div>
          </div>
        </section>

        {/* Limitations */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Limitations of Automated Screening</h2>
          <p className={styles.prose}>
            While automated screening provides consistency and scalability, it has inherent
            limitations that users should be aware of:
          </p>
          <ul className={styles.legalList}>
            <li>
              <strong>Data Dependency:</strong> Our screening is only as accurate as the
              underlying financial data sourced from third-party providers. Errors, omissions,
              or delays in source data will directly affect screening results.
            </li>
            <li>
              <strong>Binary Classification:</strong> Automated systems apply fixed thresholds.
              Real-world Shariah compliance often involves nuanced scholarly judgment that
              cannot be fully captured by algorithms.
            </li>
            <li>
              <strong>Limited Scope:</strong> We screen based on quantitative financial ratios
              and broad sector classifications. We do not perform qualitative analysis of
              individual company activities, contracts, or governance practices.
            </li>
            <li>
              <strong>Reporting Lag:</strong> Financial statements are published quarterly or
              annually. Between reporting periods, a company&apos;s actual financial position may
              differ materially from the last reported figures.
            </li>
            <li>
              <strong>Jurisdictional Differences:</strong> Different Islamic finance authorities
              may use different thresholds (e.g., 30% vs 33% debt ratio) or different
              denominators (total assets vs market cap). Our methodology follows one specific
              standard and may not align with all scholarly opinions.
            </li>
            <li>
              <strong>Subsidiary Activities:</strong> Our screening evaluates the consolidated
              entity. We may not capture non-permissible activities conducted through
              subsidiaries that are not fully reflected in consolidated financial statements.
            </li>
          </ul>
        </section>

        {/* Reporting Concerns */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Reporting Concerns and Errors</h2>
          <p className={styles.prose}>
            We encourage users to report any screening results they believe to be inaccurate
            or any concerns about our methodology. Community feedback is valuable in improving
            the accuracy and reliability of our screening:
          </p>
          <div className={styles.contactBox}>
            <p><strong>Report a Screening Error</strong></p>
            <p>Email: <a href="mailto:shariah@barakfi.in">shariah@barakfi.in</a></p>
            <p>Please include: stock symbol, the concern or discrepancy observed, and any
              supporting data or references.</p>
          </div>
          <p className={styles.prose}>
            We review all reports within 5 business days. If a valid concern is identified,
            we will update the screening result and, where appropriate, issue a correction
            notice.
          </p>
        </section>

        {/* Update Frequency */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Update Frequency and Versioning</h2>
          <p className={styles.prose}>
            Our screening data and methodology are maintained on the following schedule:
          </p>
          <ul className={styles.legalList}>
            <li>
              <strong>Market Data:</strong> Stock prices and market capitalisation are refreshed
              daily during trading days (subject to API availability and data source limitations).
            </li>
            <li>
              <strong>Financial Statements:</strong> Balance sheet, income statement, and cash
              flow data are updated within 7 days of quarterly/annual results being published
              by companies.
            </li>
            <li>
              <strong>Screening Rules:</strong> Methodology thresholds and sector classifications
              are versioned. The current version is <strong>v1.0</strong> (April 2026). Any
              changes to screening rules will be documented with a new version number and
              change log.
            </li>
            <li>
              <strong>Compliance Re-screening:</strong> All stocks in our universe are
              re-screened whenever new financial data is ingested. Compliance status may change
              after each re-screening cycle.
            </li>
          </ul>
        </section>

        {/* Legal Nav */}
        <nav className={styles.legalNav} aria-label="Legal pages">
          <Link href="/terms" className={styles.legalNavLink}>Terms of Service</Link>
          <Link href="/privacy" className={styles.legalNavLink}>Privacy Policy</Link>
          <Link href="/disclaimer" className={styles.legalNavLink}>Risk Disclaimer</Link>
          <Link href="/methodology" className={styles.legalNavLink}>Screening Methodology</Link>
        </nav>
      </div>
    </main>
  );
}

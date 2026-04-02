import type { Metadata } from "next";
import Link from "next/link";
import styles from "./methodology.module.css";

export const metadata: Metadata = {
  title: "Screening Methodology — Barakfi",
  description:
    "Learn how Barakfi screens stocks for Shariah compliance using S&P Shariah Indices methodology — debt ratios, income purity, sector rules, and more.",
};

const RATIOS = [
  {
    name: "Debt to 36-Month Average Market Cap",
    threshold: "< 33%",
    formula: "Total Debt / 36-Month Average Market Cap",
    desc: "Measures the company's leverage against its long-term market value. A ratio above 33% indicates excessive reliance on interest-bearing debt.",
  },
  {
    name: "Debt to Current Market Cap",
    threshold: "< 33%",
    formula: "Total Debt / Current Market Cap",
    desc: "A point-in-time check that catches recent leverage increases that the 36-month average might smooth over.",
  },
  {
    name: "Non-Permissible Income Ratio",
    threshold: "< 5%",
    formula: "Non-Permissible Income / Total Revenue",
    desc: "Tracks how much revenue comes from non-halal activities (interest income, gambling, alcohol, etc). Must stay below 5% to pass.",
  },
  {
    name: "Interest Income Ratio",
    threshold: "< 5%",
    formula: "Interest Income / Total Revenue",
    desc: "Specifically measures interest-based earnings. Companies with significant treasury income from interest-bearing instruments fail this check.",
  },
  {
    name: "Accounts Receivable to Market Cap",
    threshold: "< 33%",
    formula: "Accounts Receivable / Market Cap",
    desc: "Prevents investing in companies where the majority of value is tied up in receivables (which may represent interest-based transactions).",
  },
];

const SECTORS_EXCLUDED = [
  "Conventional banking and finance",
  "Insurance (conventional)",
  "Alcohol production and distribution",
  "Tobacco",
  "Pork-related products",
  "Gambling and casinos",
  "Adult entertainment",
  "Weapons and defense (controversial)",
];

export default function MethodologyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Hero */}
        <header className={styles.hero}>
          <Link href="/screener" className={styles.backLink}>
            &larr; Back to Screener
          </Link>
          <h1 className={styles.title}>Screening Methodology</h1>
          <p className={styles.subtitle}>
            How we determine whether a stock is Shariah-compliant, needs review, or should be avoided.
          </p>
        </header>

        {/* Screening Flow Diagram */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Screening Pipeline</h2>
          <div className={styles.flowDiagram}>
            <div className={styles.flowStep}>
              <div className={`${styles.flowIcon} ${styles.flowIconInput}`}>&#x25A3;</div>
              <div className={styles.flowStepBody}>
                <span className={styles.flowStepTitle}>Stock Universe</span>
                <span className={styles.flowStepDesc}>60+ Indian equities from NSE</span>
              </div>
            </div>
            <div className={styles.flowArrow}>&darr;</div>
            <div className={styles.flowStep}>
              <div className={`${styles.flowIcon} ${styles.flowIconSector}`}>&#x1F6AB;</div>
              <div className={styles.flowStepBody}>
                <span className={styles.flowStepTitle}>Sector Screen</span>
                <span className={styles.flowStepDesc}>Exclude haram industries</span>
              </div>
            </div>
            <div className={styles.flowArrow}>&darr;</div>
            <div className={styles.flowStep}>
              <div className={`${styles.flowIcon} ${styles.flowIconRatio}`}>&#x2696;</div>
              <div className={styles.flowStepBody}>
                <span className={styles.flowStepTitle}>5 Financial Ratios</span>
                <span className={styles.flowStepDesc}>Debt, income, receivables checks</span>
              </div>
            </div>
            <div className={styles.flowArrow}>&darr;</div>
            <div className={styles.flowStep}>
              <div className={`${styles.flowIcon} ${styles.flowIconResult}`}>&#x2713;</div>
              <div className={styles.flowStepBody}>
                <span className={styles.flowStepTitle}>Classification</span>
                <span className={styles.flowStepDesc}>Halal / Review / Non-Compliant</span>
              </div>
            </div>
          </div>
        </section>

        {/* Overview */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Overview</h2>
          <p className={styles.prose}>
            Our screening methodology is anchored to the S&amp;P Shariah Indices framework, one
            of the most widely recognized standards for Islamic equity screening globally. Every
            stock in our universe passes through two layers of filtering: a sector-level screen
            that eliminates industries incompatible with Islamic principles, followed by a
            financial ratio screen that evaluates the company&apos;s balance sheet against strict
            thresholds.
          </p>
          <p className={styles.prose}>
            Stocks that pass all checks are marked <span className={styles.labelHalal}>Halal</span>.
            Those that fail one or more hard rules are marked <span className={styles.labelFail}>Non-Compliant</span>.
            Stocks that pass the automated checks but carry flags requiring human judgment are marked{" "}
            <span className={styles.labelReview}>Requires Review</span>.
          </p>
        </section>

        {/* Sector Screen */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Step 1: Sector Screen</h2>
          <p className={styles.prose}>
            Before any financial analysis, we check whether the company operates in a
            permissible industry. The following sectors are excluded outright, regardless
            of financial ratios:
          </p>
          <div className={styles.excludedGrid}>
            {SECTORS_EXCLUDED.map((sector) => (
              <div className={styles.excludedItem} key={sector}>
                <span className={styles.excludedDot} />
                {sector}
              </div>
            ))}
          </div>
        </section>

        {/* Financial Ratios */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Step 2: Financial Ratio Screen</h2>
          <p className={styles.prose}>
            Companies in permissible sectors must pass five financial ratio tests. Each ratio
            is designed to limit exposure to interest-based debt, non-halal income, and
            receivables-heavy business models.
          </p>
          <div className={styles.ratioGrid}>
            {RATIOS.map((ratio) => (
              <div className={styles.ratioCard} key={ratio.name}>
                <div className={styles.ratioHeader}>
                  <h3 className={styles.ratioName}>{ratio.name}</h3>
                  <span className={styles.ratioThreshold}>{ratio.threshold}</span>
                </div>
                <p className={styles.ratioFormula}>{ratio.formula}</p>
                <p className={styles.ratioDesc}>{ratio.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Statuses */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Screening Outcomes</h2>
          <div className={styles.outcomeGrid}>
            <div className={`${styles.outcomeCard} ${styles.outcomeHalal}`}>
              <span className={styles.outcomeBadge}>Halal</span>
              <p>Passes sector screen and all five financial ratio thresholds. Suitable for Shariah-compliant investment.</p>
            </div>
            <div className={`${styles.outcomeCard} ${styles.outcomeReview}`}>
              <span className={styles.outcomeBadge}>Requires Review</span>
              <p>Passes automated checks but carries flags (borderline ratios, mixed business activities, or data gaps) that need a scholar&apos;s review.</p>
            </div>
            <div className={`${styles.outcomeCard} ${styles.outcomeFail}`}>
              <span className={styles.outcomeBadge}>Non-Compliant</span>
              <p>Fails one or more hard rules — either an excluded sector or a financial ratio exceeding the threshold.</p>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Important Disclaimer</h2>
          <div className={styles.disclaimerBox}>
            <p>
              This screening is provided for informational and educational purposes only.
              It is <strong>not a fatwa</strong> and should not be treated as a definitive
              religious ruling. Always consult with a qualified Shariah scholar or your
              personal advisor before making investment decisions. Financial data may be
              delayed and subject to revision.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className={styles.ctaRow}>
          <Link href="/screener" className={styles.ctaPrimary}>
            Open Screener &rarr;
          </Link>
          <Link href="/compare" className={styles.ctaSecondary}>
            Compare Stocks
          </Link>
        </div>
      </div>
    </main>
  );
}

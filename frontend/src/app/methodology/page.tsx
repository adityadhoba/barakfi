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
  {
    name: "Cash & Interest-Bearing Securities",
    threshold: "< 33%",
    formula: "(Cash + Short-Term Investments) / Total Assets",
    desc: "AAOIFI standard: limits exposure to companies heavily invested in interest-bearing instruments like fixed deposits and bonds.",
  },
];

const PROHIBITED_ACTIVITIES = [
  {
    title: "Alcohol",
    desc: "Production & sales",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2l2 4h4l2-4M6 6h12l-1 14H7L6 6z" strokeLinecap="round" strokeLinejoin="round"/><line x1="4" y1="4" x2="20" y2="20" strokeWidth="2" stroke="var(--red)"/></svg>`,
  },
  {
    title: "Gambling",
    desc: "Casinos, betting, lotteries",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="4"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><line x1="4" y1="4" x2="20" y2="20" strokeWidth="2" stroke="var(--red)"/></svg>`,
  },
  {
    title: "Tobacco",
    desc: "Manufacturing & sales",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="14" width="16" height="4" rx="1"/><path d="M18 14V10c0-2-1-3-3-3"/><path d="M20 14V9c0-3-2-5-5-5"/><line x1="4" y1="4" x2="20" y2="20" strokeWidth="2" stroke="var(--red)"/></svg>`,
  },
  {
    title: "Weapons",
    desc: "Arms & defense products",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2l8 8-4 4-8-8"/><path d="M10 6L4 12l2 2 6-6"/><path d="M6 16l-2 2"/><path d="M16 6l2-2"/><line x1="4" y1="4" x2="20" y2="20" strokeWidth="2" stroke="var(--red)"/></svg>`,
  },
  {
    title: "Adult Entertainment",
    desc: "Explicit content",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/><line x1="4" y1="4" x2="20" y2="20" strokeWidth="2" stroke="var(--red)"/></svg>`,
  },
  {
    title: "Interest-based Finance",
    desc: "Conventional banking",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 21h18M3 10h18M12 3l9 7H3l9-7z"/><path d="M5 10v11M9 10v11M15 10v11M19 10v11"/><line x1="4" y1="4" x2="20" y2="20" strokeWidth="2" stroke="var(--red)"/></svg>`,
  },
  {
    title: "Non-halal Foods",
    desc: "Pork & non-halal products",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/><line x1="4" y1="4" x2="20" y2="20" strokeWidth="2" stroke="var(--red)"/></svg>`,
  },
  {
    title: "Excess Debt",
    desc: "High debt ratios",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/><line x1="4" y1="4" x2="20" y2="20" strokeWidth="2" stroke="var(--red)"/></svg>`,
  },
  {
    title: "Cannabis",
    desc: "Recreational marijuana",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22V12M12 12C12 12 7 10 5 6c3 1 5 3 7 6M12 12c0 0 5-2 7-6-3 1-5 3-7 6"/><circle cx="12" cy="4" r="2"/><line x1="4" y1="4" x2="20" y2="20" strokeWidth="2" stroke="var(--red)"/></svg>`,
  },
  {
    title: "Cloning",
    desc: "Human cloning activities",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="7" r="4"/><circle cx="15" cy="7" r="4"/><path d="M12 22c-4 0-7-2-7-5s3-5 7-5 7 2 7 5-3 5-7 5z"/><line x1="4" y1="4" x2="20" y2="20" strokeWidth="2" stroke="var(--red)"/></svg>`,
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
  "Cannabis production",
  "Interest-based lending (NBFCs)",
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

        {/* Trust Badges */}
        <div className={styles.trustBadges}>
          <div className={styles.trustBadge}>
            <span className={styles.trustBadgeIcon}>&#x1F6E1;</span>
            <div>
              <span className={styles.trustBadgeTitle}>S&amp;P Aligned</span>
              <span className={styles.trustBadgeDesc}>S&amp;P Shariah Indices thresholds</span>
            </div>
          </div>
          <div className={styles.trustBadge}>
            <span className={styles.trustBadgeIcon}>&#x2696;</span>
            <div>
              <span className={styles.trustBadgeTitle}>AAOIFI Referenced</span>
              <span className={styles.trustBadgeDesc}>Cash &amp; interest-bearing checks</span>
            </div>
          </div>
          <div className={styles.trustBadge}>
            <span className={styles.trustBadgeIcon}>&#x1F4CA;</span>
            <div>
              <span className={styles.trustBadgeTitle}>100+ Stocks</span>
              <span className={styles.trustBadgeDesc}>Real NSE financial data</span>
            </div>
          </div>
        </div>

        {/* Screening Flow Diagram */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Screening Pipeline</h2>
          <div className={styles.flowDiagram}>
            <div className={styles.flowStep}>
              <div className={`${styles.flowIcon} ${styles.flowIconInput}`}>&#x25A3;</div>
              <div className={styles.flowStepBody}>
                <span className={styles.flowStepTitle}>Stock Universe</span>
                <span className={styles.flowStepDesc}>100+ Indian equities from NSE</span>
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
                <span className={styles.flowStepTitle}>6 Financial Rules</span>
                <span className={styles.flowStepDesc}>Debt, income, receivables checks</span>
              </div>
            </div>
            <div className={styles.flowArrow}>&darr;</div>
            <div className={styles.flowStep}>
              <div className={`${styles.flowIcon} ${styles.flowIconResult}`}>&#x2713;</div>
              <div className={styles.flowStepBody}>
                <span className={styles.flowStepTitle}>Classification</span>
                <span className={styles.flowStepDesc}>Halal / Cautious / Non-Compliant</span>
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
            Companies in permissible sectors must pass six financial ratio tests. Each ratio
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

        {/* Prohibited Business Activities */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Prohibited Business Activities</h2>
          <p className={styles.sectionDesc}>
            Companies involved in these activities are classified as Not Shariah-compliant during screening.
          </p>
          <div className={styles.prohibitedGrid}>
            {PROHIBITED_ACTIVITIES.map((item) => (
              <div key={item.title} className={styles.prohibitedCard}>
                <div className={styles.prohibitedIcon} dangerouslySetInnerHTML={{ __html: item.icon }} />
                <h3 className={styles.prohibitedTitle}>{item.title}</h3>
                <p className={styles.prohibitedDesc}>{item.desc}</p>
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
              <p>Passes sector screen and all six financial ratio thresholds. Suitable for Shariah-compliant investment.</p>
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

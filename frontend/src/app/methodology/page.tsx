import type { Metadata } from "next";
import Link from "next/link";
import styles from "./methodology.module.css";

export const metadata: Metadata = {
  title: "Screening Methodology — 4 Shariah Standards Compared | Barakfi",
  description:
    "Learn how Barakfi screens stocks using S&P, AAOIFI, FTSE, and Khatkhatay Independent methodologies. Compare thresholds, understand financial ratios, and see prohibited sectors.",
  alternates: { canonical: "https://barakfi.in/methodology" },
};

const METHODOLOGY_COMPARISON = [
  {
    screen: "Debt Ratio",
    sp: "< 33% of 36m Avg MCap",
    aaoifi: "< 30% of Total Assets",
    ftse: "< 33% of Total Assets",
    independent: "< 25% of Total Assets",
  },
  {
    screen: "Interest Income",
    sp: "< 5% of Revenue",
    aaoifi: "< 5% of Revenue",
    ftse: "< 5% of Revenue",
    independent: "< 3% of Revenue",
  },
  {
    screen: "Non-Permissible Income",
    sp: "< 5% of Revenue",
    aaoifi: "< 5% of Revenue",
    ftse: "< 5% of Revenue",
    independent: "< 5% of Revenue",
  },
  {
    screen: "Receivables",
    sp: "< 33% of MCap",
    aaoifi: "< 49% of Total Assets",
    ftse: "< 50% of Total Assets",
    independent: "Not used *",
  },
  {
    screen: "Cash & IB Securities",
    sp: "< 33% of Total Assets",
    aaoifi: "< 30% of Total Assets",
    ftse: "< 33% of Total Assets",
    independent: "< 10% of Total Assets",
  },
  {
    screen: "Denominator",
    sp: "Market Capitalisation",
    aaoifi: "Total Assets",
    ftse: "Total Assets",
    independent: "Total Assets",
  },
];

const RATIOS = [
  {
    name: "Debt to Market Cap / Total Assets",
    threshold: "< 25% to 33%",
    formula: "Total Debt / Denominator (varies by methodology)",
    desc: "Measures the company's reliance on interest-bearing debt. The Khatkhatay paper argues that the denominator should be total assets (stable, objective) rather than market capitalisation (volatile, sentiment-driven). S&P uses 36-month average market cap; AAOIFI, FTSE, and Independent use total assets.",
  },
  {
    name: "Non-Permissible Income Ratio",
    threshold: "< 5%",
    formula: "Non-Permissible Income / Total Revenue",
    desc: "Tracks revenue from non-halal activities (interest income, gambling, alcohol, etc). All four methodologies agree on a 5% threshold. Companies must derive the vast majority of revenue from permissible business.",
  },
  {
    name: "Interest Income Ratio",
    threshold: "< 3% to 5%",
    formula: "Interest Income / Total Revenue",
    desc: "Measures interest-based earnings specifically. The Khatkhatay paper recommends a stricter 3% threshold, arguing that with interest-bearing assets capped at 10% of total assets, interest income should naturally be very small.",
  },
  {
    name: "Accounts Receivable Ratio",
    threshold: "< 33% to 50% (or not used)",
    formula: "Accounts Receivable / Denominator",
    desc: "Based on the Shariah principle that debts cannot be traded except at par value. The Khatkhatay paper argues this screen is 'fundamentally flawed' because share prices are driven by future earnings expectations, not the book value of receivables. The Independent methodology disables this screen.",
  },
  {
    name: "Cash & Interest-Bearing Securities",
    threshold: "< 10% to 33%",
    formula: "(Cash + Short-Term Investments) / Total Assets",
    desc: "Limits exposure to companies heavily invested in interest-bearing instruments. The Khatkhatay paper recommends the strictest threshold at 10%, arguing that involuntary interest-earning should be truly marginal.",
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

export default function MethodologyPage() {
  return (
    <main className="shellPage">
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Methodology</span>
        </nav>

        {/* Section 1: Introduction */}
        <header className={styles.hero}>
          <span className={styles.kicker}>Screening Methodology</span>
          <h1 className={styles.title}>How We Screen Stocks for Shariah Compliance</h1>
          <p className={styles.subtitle}>
            Barakfi evaluates stocks using four globally recognised Shariah screening methodologies.
            Each methodology applies a set of financial ratio tests and business activity screens
            to determine whether a stock meets its specific compliance criteria.
          </p>
        </header>

        <section className={styles.section}>
          <div className={styles.introCard}>
            <h2 className={styles.introTitle}>The Principle of Maslahah</h2>
            <p className={styles.introText}>
              Shariah scholars have permitted equity investment under the principle of <em>Maslahah</em> (public
              interest), recognising that equity markets represent an important profit-and-loss sharing investment
              avenue close to the Islamic ideal. However, due to the pervasiveness of interest-based transactions
              in modern business, fully Shariah-compliant companies are extremely rare. Therefore, scholars have
              established minimum compliance criteria — setting maximum acceptable limits for concessions from
              strict Shariah requirements.
            </p>
            <p className={styles.introNote}>
              Reference: Khatkhatay &amp; Nisar, &ldquo;Shariah Compliant Equity Investments: An Assessment of
              Current Screening Norms&rdquo;, Seventh Harvard University Forum on Islamic Finance, 2006.
            </p>
          </div>
        </section>

        {/* Section 2: Methodology Comparison */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4-Methodology Comparison</h2>
          <p className={styles.sectionDesc}>
            Different scholars and institutions arrive at different thresholds. Barakfi screens every stock
            against all four methodologies and reports the consensus result.
          </p>
          <div className={styles.comparisonTableWrap}>
            <table className={styles.comparisonTable}>
              <thead>
                <tr>
                  <th>Screen</th>
                  <th>S&amp;P (DJIMI)</th>
                  <th>AAOIFI</th>
                  <th>FTSE Yasaar</th>
                  <th>Independent *</th>
                </tr>
              </thead>
              <tbody>
                {METHODOLOGY_COMPARISON.map((row) => (
                  <tr key={row.screen}>
                    <td className={styles.screenLabel}>{row.screen}</td>
                    <td>{row.sp}</td>
                    <td>{row.aaoifi}</td>
                    <td>{row.ftse}</td>
                    <td className={styles.independentCol}>{row.independent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.tableNote}>
            * Khatkhatay Independent Norms (Harvard 2006). Argues that market capitalisation is
            volatile and disconnected from fundamentals; total assets is a more stable and
            representative denominator. The receivables screen is removed as academically unsound.
          </p>
        </section>

        {/* Section 3: Why Multiple Methodologies */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Why Multiple Methodologies?</h2>
          <div className={styles.twoCol}>
            <div className={styles.colCard}>
              <h3 className={styles.colTitle}>The Market Cap Debate</h3>
              <p className={styles.colText}>
                The S&amp;P methodology uses market capitalisation as the denominator for debt and
                receivables ratios. The Khatkhatay paper criticises this approach: market prices are
                &ldquo;largely driven by sentiments about future earnings&rdquo; and can &ldquo;skyrocket
                or nosedive&rdquo; in weeks with no change in underlying fundamentals. A company that was
                compliant one day could become non-compliant the next purely due to a price drop.
              </p>
            </div>
            <div className={styles.colCard}>
              <h3 className={styles.colTitle}>Total Assets: The Alternative</h3>
              <p className={styles.colText}>
                AAOIFI, FTSE, and the Independent methodology all use total assets as the denominator.
                Total assets are reported quarterly, change slowly, and directly reflect the company&apos;s
                actual business operations. The paper notes that &ldquo;how the market perceives a company
                is not relevant to the Islamicity of its activities&rdquo; — screening should focus on
                objective, company-level financial data.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Financial Ratio Screens */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Financial Ratio Screens</h2>
          <p className={styles.sectionDesc}>
            Every stock is evaluated against these key financial ratios. The specific thresholds
            and denominators vary by methodology (see comparison table above).
          </p>
          <div className={styles.ratioGrid}>
            {RATIOS.map((ratio) => (
              <div key={ratio.name} className={styles.ratioCard}>
                <div className={styles.ratioHeader}>
                  <h3 className={styles.ratioName}>{ratio.name}</h3>
                  <span className={styles.ratioThreshold}>{ratio.threshold}</span>
                </div>
                <code className={styles.ratioFormula}>{ratio.formula}</code>
                <p className={styles.ratioDesc}>{ratio.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Prohibited Business Activities */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Prohibited Business Activities</h2>
          <p className={styles.sectionDesc}>
            Companies involved in these activities are classified as not meeting Shariah screening
            criteria, regardless of their financial ratios.
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

        {/* Section 6: Purification of Income */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Purification of Income</h2>
          <div className={styles.purificationCard}>
            <p className={styles.purificationText}>
              Even stocks that meet Shariah screening criteria may have a small percentage of income
              from non-permissible sources (such as interest). The Khatkhatay paper recommends that
              investors should donate the <strong>pro rata amount of interest income earned per share</strong> for
              the period of their holding, <strong>regardless of whether the company pays a dividend</strong>.
            </p>
            <p className={styles.purificationText}>
              This ensures the entire interest component is purged from the investor&apos;s perspective —
              not just the portion that flows through dividends, but also the portion retained in
              the company&apos;s operations.
            </p>
            <div className={styles.purificationCta}>
              <Link href="/tools/purification" className={styles.purificationLink}>
                Open Purification Calculator &rarr;
              </Link>
              <Link href="/tools/zakat" className={styles.purificationLinkSecondary}>
                Zakat Calculator
              </Link>
            </div>
          </div>
        </section>

        {/* Section 7: Important Disclaimers */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Important Disclaimers</h2>
          <div className={styles.disclaimerGrid}>
            <div className={styles.disclaimerCard}>
              <h3 className={styles.disclaimerTitle}>Not a Fatwa</h3>
              <p className={styles.disclaimerText}>
                Barakfi&apos;s screening results are based on automated financial ratio analysis. They do
                not constitute a fatwa, religious ruling, or investment advice. The determination of whether
                an investment is halal or haram is ultimately for qualified Shariah scholars.
              </p>
            </div>
            <div className={styles.disclaimerCard}>
              <h3 className={styles.disclaimerTitle}>Data Limitations</h3>
              <p className={styles.disclaimerText}>
                Financial data is sourced from Yahoo Finance and may have delays, inaccuracies, or gaps.
                Companies may change their business activities or financial structure between reporting periods.
                Always verify with official filings before making investment decisions.
              </p>
            </div>
            <div className={styles.disclaimerCard}>
              <h3 className={styles.disclaimerTitle}>Consult a Scholar</h3>
              <p className={styles.disclaimerText}>
                We strongly recommend consulting a qualified Shariah scholar or advisor for personalised
                guidance on your specific investment situation. Different scholars may have different opinions
                on the same stock.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

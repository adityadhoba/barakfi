import type { Metadata } from "next";
import { DM_Serif_Display } from "next/font/google";
import { EditorialChrome } from "@/components/editorial-chrome";
import styles from "./methodology.module.css";

const serif = DM_Serif_Display({ subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Screening Methodology — BarakFi",
  description:
    "Transparent Shariah stock screening criteria used by BarakFi across debt, interest income, business activity, and asset composition.",
  alternates: { canonical: "https://barakfi.in/methodology" },
};

const COMPARISON_ROWS = [
  {
    criterion: "Debt Ratio",
    note: "Interest-bearing debt / Total assets",
    barakfiValue: "33%",
    barakfiDesc: "Conservative threshold",
    spValue: "33%",
    spDesc: "Of 36-month avg market cap",
    aaoifiValue: "30%",
    aaoifiDesc: "Of total assets",
    ftseValue: "33.33%",
    ftseDesc: "Of total assets",
    indValue: "25%",
    indDesc: "Stricter threshold",
  },
  {
    criterion: "Interest Income",
    note: "Non-compliant income / Revenue",
    barakfiValue: "5%",
    barakfiDesc: "Of total revenue",
    spValue: "5%",
    spDesc: "Of total revenue",
    aaoifiValue: "5%",
    aaoifiDesc: "Of total revenue",
    ftseValue: "5%",
    ftseDesc: "Of gross revenue",
    indValue: "5%",
    indDesc: "Of total revenue",
  },
  {
    criterion: "Liquid Assets",
    note: "Cash + receivables / Total assets",
    barakfiValue: "50%",
    barakfiDesc: "Of total assets",
    spValue: "33%",
    spDesc: "Accounts receivable only",
    aaoifiValue: "30%",
    aaoifiDesc: "Of total assets",
    ftseValue: "50%",
    ftseDesc: "Of total assets",
    indValue: "33%",
    indDesc: "Of total assets",
  },
  {
    criterion: "Business Activity",
    note: "Sector / core business screen",
    barakfiValue: "Excluded sectors",
    barakfiDesc: "Composite business screen",
    spValue: "Primary",
    spDesc: "Primary business screen",
    aaoifiValue: "Primary + ancillary",
    aaoifiDesc: "Primary + ancillary screen",
    ftseValue: "Primary",
    ftseDesc: "Primary business screen",
    indValue: "Strict",
    indDesc: "Strict sector exclusions",
  },
];

const CRITERIA = [
  {
    tag: "Financial Ratio",
    number: "01",
    title: "Debt Ratio",
    body:
      "Interest-bearing debt must remain below 33% of total assets. This screens out companies that fund their operations primarily through riba-based borrowing. We use total assets, not market cap, for consistency across market cycles.",
    threshold: "Total interest-bearing debt ÷ Total assets < 33%",
  },
  {
    tag: "Revenue Screen",
    number: "02",
    title: "Interest Income %",
    body:
      "Interest income and other non-compliant revenue must be less than 5% of total revenue. Many otherwise-compliant businesses earn minor incidental interest from bank deposits, so this threshold captures and flags that. If passed, income purification is still required.",
    threshold: "Interest income ÷ Total revenue < 5%",
  },
  {
    tag: "Sector Screen",
    number: "03",
    title: "Business Activity",
    body:
      "The core business must not operate in prohibited sectors. This is a binary exclusion: no ratio can compensate for a fundamentally impermissible business model. Prohibited sectors are evaluated on primary revenue source.",
    threshold: "Banking, insurance, alcohol, tobacco, weapons, adult entertainment, pork",
  },
  {
    tag: "Asset Screen",
    number: "04",
    title: "Accounts Receivable",
    body:
      "Cash and accounts receivable combined must remain below 50% of total assets. This prevents pure financial holding companies, whose assets are primarily monetary claims, from qualifying as tangible businesses.",
    threshold: "(Cash + receivables) ÷ Total assets < 50%",
  },
];

const PROHIBITED_SECTORS = [
  { name: "Banking & Financial Services", why: "Core riba-based income model", badge: "Excluded", glyph: "▣" },
  { name: "Insurance (Conventional)", why: "Uncertainty (gharar) and interest income", badge: "Excluded", glyph: "◎" },
  { name: "Alcohol & Beverages", why: "Prohibited substance (khamr)", badge: "Excluded", glyph: "◈" },
  { name: "Tobacco", why: "Harmful substance, scholarly consensus", badge: "Excluded", glyph: "⊘" },
  { name: "Defence & Weapons", why: "Primary business in armaments", badge: "Excluded", glyph: "➤" },
  { name: "Adult Entertainment", why: "Morally impermissible content", badge: "Excluded", glyph: "▢" },
  { name: "Pork & Related Products", why: "Prohibited in Islamic law (haram)", badge: "Excluded", glyph: "▤" },
  { name: "Gambling & Speculation", why: "Maisir — prohibited financial activity", badge: "Excluded", glyph: "◇" },
  { name: "Pornography", why: "Strictly impermissible", badge: "Excluded", glyph: "⬡" },
];

const LEGEND = [
  {
    badge: "Shariah Compliant",
    tone: "compliant",
    title: "Passes all four criteria",
    body:
      "The company's core business is permissible, all financial ratios are within thresholds, and interest income is below 5% of revenue. Minor interest income may still require purification.",
  },
  {
    badge: "Requires Review",
    tone: "review",
    title: "Borderline — scholar consultation advised",
    body:
      "One or more ratios are near threshold boundaries, or the company's business activities have a grey-area component. We recommend consulting a qualified scholar before investing.",
  },
  {
    badge: "Not Compliant",
    tone: "nonCompliant",
    title: "Fails one or more criteria",
    body:
      "The company either operates in a prohibited sector or its financial ratios exceed permissible limits. This status is definitive; purification cannot make investment in these companies permissible.",
  },
];

const SOURCE_ITEMS = [
  {
    label: "01",
    text: "NSE & BSE filings — Annual reports, balance sheets, and P&L statements from exchange disclosures.",
  },
  {
    label: "02",
    text: "Quarterly updates — Ratios recomputed after each Q4 earnings cycle. Status changes are reflected within 2–4 weeks.",
  },
  {
    label: "03",
    text: "527 stocks covered — All NIFTY 500 constituents plus select BSE-listed companies with sufficient data.",
  },
  {
    label: "04",
    text: "Not a fatwa — Results are educational screening only. Always consult a qualified Islamic scholar for investment rulings.",
  },
];

function RatioCell({ value, description }: { value: string; description: string }) {
  return (
    <>
      <span className={`${styles.ratioValue} ${serif.className}`}>{value}</span>
      <span className={styles.ratioDesc}>{description}</span>
    </>
  );
}

export default function MethodologyPage() {
  return (
    <EditorialChrome activeHref="/methodology">
      <main className={styles.page}>
        <section className={styles.pageHeader}>
          <div className={styles.eyebrow}>Screening Methodology</div>
          <h1 className={`${styles.pageTitle} ${serif.className}`}>
            Transparent criteria.
            <br />
            <em>No guesswork.</em>
          </h1>
          <p className={styles.pageIntro}>
            BarakFi screens Indian equities using established Shariah finance principles drawn from S&amp;P,
            AAOIFI, FTSE, and Khatkhatay Independent standards. Every ratio, every threshold — fully documented.
          </p>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionEyebrow}>Four Standards Compared</div>
          <h2 className={`${styles.sectionTitle} ${serif.className}`}>How major bodies set the thresholds</h2>
          <p className={styles.sectionSub}>
            Different Shariah standards bodies use varying thresholds. BarakFi follows a conservative composite
            approach. Here&apos;s how each standard compares.
          </p>

          <div className={styles.compareWrap}>
            <table className={styles.compareTable}>
              <thead>
                <tr>
                  <th style={{ width: 220 }}>Criterion</th>
                  <th className={styles.highlightHead}>BarakFi</th>
                  <th>S&amp;P / Dow Jones</th>
                  <th>AAOIFI</th>
                  <th>FTSE Shariah</th>
                  <th>Khatkhatay Ind.</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.criterion}>
                    <td>
                      <span className={styles.criterionLabel}>{row.criterion}</span>
                      <div className={styles.criterionNote}>{row.note}</div>
                    </td>
                    <td className={styles.highlightCol}>
                      <RatioCell value={row.barakfiValue} description={row.barakfiDesc} />
                    </td>
                    <td><RatioCell value={row.spValue} description={row.spDesc} /></td>
                    <td><RatioCell value={row.aaoifiValue} description={row.aaoifiDesc} /></td>
                    <td><RatioCell value={row.ftseValue} description={row.ftseDesc} /></td>
                    <td><RatioCell value={row.indValue} description={row.indDesc} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.criteriaSection}>
          <div className={styles.sectionEyebrow}>The Four Criteria</div>
          <h2 className={`${styles.sectionTitle} ${serif.className}`}>What we test — and why</h2>
          <div className={styles.criteriaGrid}>
            {CRITERIA.map((item) => (
              <article key={item.number} className={styles.criterionCard}>
                <div className={`${styles.criterionGhost} ${serif.className}`}>{item.number}</div>
                <div className={styles.criterionTag}>{item.tag}</div>
                <h3 className={`${styles.criterionTitle} ${serif.className}`}>{item.title}</h3>
                <p className={styles.criterionBody}>{item.body}</p>
                <div className={styles.thresholdBox}>
                  Threshold: <span>{item.threshold}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionEyebrow}>Prohibited Sectors</div>
          <h2 className={`${styles.sectionTitle} ${serif.className}`}>Always excluded, regardless of ratios</h2>
          <p className={styles.sectionSub}>
            These sectors represent impermissible core business activities. No financial ratio threshold can
            qualify a company whose primary business falls in these categories.
          </p>
          <div className={styles.sectorGrid}>
            {PROHIBITED_SECTORS.map((sector) => (
              <article key={sector.name} className={styles.sectorItem}>
                <div className={styles.sectorIcon}>{sector.glyph}</div>
                <div>
                  <div className={styles.sectorName}>{sector.name}</div>
                  <div className={styles.sectorWhy}>{sector.why}</div>
                </div>
                <div className={styles.sectorBadge}>{sector.badge}</div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.legendSection}>
          <div className={styles.sectionEyebrow}>Compliance Status Definitions</div>
          <div className={styles.legendGrid}>
            {LEGEND.map((item) => (
              <article key={item.badge} className={styles.legendCard}>
                <span className={`${styles.badge} ${styles[item.tone]}`}>{item.badge}</span>
                <h3 className={`${styles.legendTitle} ${serif.className}`}>{item.title}</h3>
                <p className={styles.legendBody}>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.dataSection}>
          <div className={styles.dataGrid}>
            <div>
              <div className={styles.sourceLabel}>Data &amp; Updates</div>
              <h2 className={`${styles.sourceTitle} ${serif.className}`}>Where the data comes from</h2>
              <p className={styles.sourceBody}>
                All financial data is sourced from audited annual reports filed with SEBI, NSE, and BSE. Ratios
                are computed from the most recently filed full-year financial statements. Screening is updated
                quarterly following earnings season.
              </p>
            </div>
            <div className={styles.sourceItems}>
              {SOURCE_ITEMS.map((item) => (
                <div key={item.label} className={styles.sourceItem}>
                  <div className={`${styles.sourceItemNum} ${serif.className}`}>{item.label}</div>
                  <div className={styles.sourceItemText}>{item.text}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </EditorialChrome>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import s from "../learn.module.css";

export const metadata: Metadata = {
  title: "What is halal investing? — Shariah-compliant equities explained",
  description:
    "A practical introduction to halal investing: avoiding riba-heavy business models, understanding purification, and how automated Shariah stock screening on Indian exchanges fits into a disciplined Muslim portfolio — with links to BarakFi tools and live NSE/BSE pages.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://barakfi.in/learn/what-is-halal-investing" },
};

export default function WhatIsHalalInvestingPage() {
  return (
    <main className={s.page}>
      <p className={s.kicker}>Foundations</p>
      <h1 className={s.h1}>What is halal investing?</h1>
      <article className={s.prose}>
        <p>
          Halal investing, in everyday language, means deploying your savings into assets and businesses that align with
          Islamic ethics: avoiding systematic dependence on interest (riba), steering clear of core haram industries such
          as conventional alcohol, gambling, weapons of indiscriminate harm, and adult entertainment, and being careful
          about how much impermissible revenue or balance-sheet leverage a company carries. For equities, scholars and
          index providers have translated those values into measurable financial tests so that ordinary investors can
          compare companies on a level playing field — even though no spreadsheet replaces a qualified scholar when you
          need a personal ruling.
        </p>
        <h2>Why ratios matter for stocks</h2>
        <p>
          Unlike a simple &quot;haram sector&quot; screen, real-world conglomerates mix permissible operations with small
          financing arms, treasury income, or customer finance subsidiaries. Shariah equity methodologies therefore look
          at debt relative to enterprise value or assets, interest-style income as a share of total revenue, non-permissible
          operating income, receivables concentration, and cash held in interest-bearing instruments. When a company stays
          below published thresholds on those measures — and passes business-activity screens — many supervisory boards
          treat it as investable for observant Muslims, sometimes with a requirement to purify a small fraction of dividends.
        </p>
        <h2>How this maps to Indian markets</h2>
        <p>
          India&apos;s large public companies file audited financials under SEBI rules, which makes ratio-based screening
          feasible for NSE and BSE listings. BarakFi focuses on that universe so explanations, worked examples, and live
          pages stay grounded in INR reporting and local sector structure — IT services, pharmaceuticals, banks (often
          excluded outright), diversified industrials, and consumer names that dominate index weights.
        </p>
        <h2>Using BarakFi responsibly</h2>
        <p>
          Our <Link href="/screener">screener</Link> and stock pages such as{" "}
          <Link href="/stocks/TCS">TCS</Link> or <Link href="/stocks/INFY">INFY</Link> show automated labels and the
          underlying numbers we store. Treat them as educational: markets move, filings restate, and methodologies differ
          between AAOIFI-style, index-provider, and academic interpretations. Pair automated output with reading primary
          filings, listening to company calls, and consulting scholars you trust.
        </p>
        <h2>Purification and zakat</h2>
        <p>
          Even when a stock passes financial screens, dividends can contain trace impermissible income under some
          interpretations. Many investors run a periodic purification donation and separate zakat on zakatable wealth.
          BarakFi hosts a <Link href="/tools/purification">purification calculator</Link> and a{" "}
          <Link href="/tools/zakat">zakat calculator</Link> as starting points — not fatwas on amounts.
        </p>
        <h2>Common misconceptions</h2>
        <p>
          A frequent misunderstanding is that &quot;halal stock picking&quot; is only about avoiding alcohol brands.
          In practice, the hardest questions often involve permissible core businesses with large treasury portfolios,
          customer finance subsidiaries, or overseas listings that use different accounting formats. Another misconception
          is that a single green badge ends debate: different supervisory boards may weight consolidated versus standalone
          accounts differently, treat derivatives exposure with different strictness, or disagree on how to classify hybrid
          instruments. Transparency about data sources and as-of dates helps you see when two sincere interpretations can
          diverge even when the same filing is in front of everyone.
        </p>
        <h2>How BarakFi presents information</h2>
        <p>
          We summarise multiple reference-style methodologies side by side where available, surface sector exclusions, and
          show the ratios that drove a label. You will also see freshness hints: fundamentals can lag price by days or
          weeks depending on filing cycles, while market prices can move every session. Always read the disclaimer on each
          stock page and remember that we are not offering investment advice tailored to your situation.
        </p>
        <h2>Building a simple workflow</h2>
        <p>
          A practical workflow for many Indian Muslim investors starts with narrowing the universe to stocks you
          understand, running them through a consistent screener, reading the latest annual report notes on debt and
          segment revenue, and then taking questions about edge cases to a scholar. Revisit positions when there is a major
          acquisition, a large new debt programme, or a pivot into regulated financial services — those events frequently
          change ratio outcomes overnight even when the brand name on the ticker is unchanged.
        </p>
        <h2>Corporate actions that quietly move ratios</h2>
        <p>
          Rights issues, buybacks funded with new debt, large related-party leases, and demergers can all restate the
          balance sheet in ways that automated pipelines need a filing cycle to absorb. If you see a sudden jump from
          halal to cautious without a clear narrative, check whether the company filed a scheme of arrangement, raised
          overseas bonds, or consolidated a financing subsidiary — those are exactly the footnotes scholars and analysts read
          before trusting a traffic-light label.
        </p>
        <p>
          Indian promoters also recycle capital through holding companies. A standalone listed entity can look pristine
          while group leverage sits one layer up. Screening tools usually work from consolidated accounts when available,
          but presentation choices still differ. That is another reason to treat BarakFi as a structured checklist, not the
          final word on permissibility.
        </p>
        <h2>Fees, wrappers, and everyday accounts</h2>
        <p>
          Beyond single stocks, many families ask about brokerage cash balances, systematic investment plans, and small
          slices of mixed funds. Those questions blend fiqh of contracts with platform economics. This article stays focused
          on plain equity screening; for mixed products, seek product-specific guidance because the same ratio engine cannot
          infer whether a wrapper embeds impermissible income in ways the prospectus obscures.
        </p>
        <h2>Key takeaways</h2>
        <ul>
          <li>Halal investing combines business ethics with quantitative guardrails.</li>
          <li>Indian equities can be analysed transparently using public financial statements.</li>
          <li>Automated tools speed comparison; they do not replace diligence or scholar guidance.</li>
        </ul>
        <p>
          Continue with <Link href="/learn/halal-stocks-india">halal stocks in India</Link> for a deeper look at NSE/BSE
          screening, or jump to the <Link href="/methodology">methodology</Link> page for threshold detail.
        </p>
      </article>
    </main>
  );
}

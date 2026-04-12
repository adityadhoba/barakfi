import type { Metadata } from "next";
import Link from "next/link";
import s from "../learn.module.css";

export const metadata: Metadata = {
  title: "Is Reliance halal? — Context for Shariah screening (NSE: RELIANCE)",
  description:
    "Educational article on how investors evaluate Reliance Industries for Shariah-aligned equity screening: conglomerate structure, energy and retail segments, debt and treasury considerations, and how to read BarakFi’s live RELIANCE page — not a fatwa or personalised ruling.",
  robots: { index: true, follow: true },
};

export default function IsRelianceHalalPage() {
  return (
    <main className={s.page}>
      <p className={s.kicker}>Case study</p>
      <h1 className={s.h1}>Is Reliance halal?</h1>
      <article className={s.prose}>
        <p>
          Reliance Industries is one of the most searched tickers in India for a reason: it spans energy, retail, digital
          services, and telecommunications in a single consolidated group. That scale makes textbook halal-or-haram labels
          unsatisfying without context. This article explains how investors typically think about conglomerates under
          automated Shariah-style screening — and why you should still read primary filings and speak with scholars you
          trust before acting.
        </p>
        <h2>Why conglomerates complicate screening</h2>
        <p>
          When a company mixes refining and marketing activities with Jio-style digital services and organised retail, the
          permissible share of economic activity can be large while financing structures remain sophisticated. Group-level
          debt, related-party leases, spectrum liabilities, and treasury portfolios all influence the ratios you see on a
          screener. Automated tools aggregate line items from consolidated statements; they cannot capture every nuance of
          contract structure that a supervisory board might debate.
        </p>
        <h2>What to read before judging a label</h2>
        <p>
          Open the latest annual report and look at segment revenue, finance costs, related-party notes, and the maturity
          profile of borrowings. Compare interest income and non-operating items against total business income to see how
          material they are. If retail or digital segments grew quickly, check whether working capital or lease
          obligations shifted in ways that affect receivables and debt ratios. Those qualitative passes matter as much as
          the headline colour on any dashboard.
        </p>
        <h2>How to use the live BarakFi page</h2>
        <p>
          Start from the canonical listing: open{" "}
          <Link href="/stocks/RELIANCE">
            <strong>BarakFi&apos;s RELIANCE stock page</strong>
          </Link>{" "}
          for the automated status, ratio breakdown, and freshness hints. The page is regenerated from the fundamentals we
          store and the same screening engine used elsewhere on the site. If the status is cautious, read each bullet slowly;
          if it is non-compliant under a given profile, understand which hard rule fired before assuming the entire company
          is &quot;impossible&quot; under every scholarly interpretation.
        </p>
        <h2>Common investor questions</h2>
        <p>
          People often ask about energy exposure, consumer finance attached to retail, or digital wallet float. Each
          question really points to a different layer: business-line permissibility, interest-bearing balance sheet
          components, and operating versus non-operating income classification. Public methodologies disagree on edge cases,
          which is why multiple standards exist. Treat this article as orientation, not a verdict.
        </p>
        <h2>Retail, telecom, and “where does the cash sit?”</h2>
        <p>
          Organised retail and digital consumer businesses can generate permissible core revenue while still carrying
          vendor finance, lease liabilities, or customer float on the balance sheet. Telecom and spectrum-related obligations
          add another layer: some accounting treatments move costs off the narrow definitions a screener uses for debt,
          while scholars still want to understand economic substance. That gap between accounting presentation and fiqh
          reasoning is why Reliance prompts more forum threads than a plain IT exporter — not because the ticker is
          inherently suspect, but because the group is a bundle of moving parts.
        </p>
        <h2>How often should you revisit the live page?</h2>
        <p>
          After major results, annual report publication, or any announcement that mentions new bonds, large M&amp;A, or a
          reorganisation of subsidiaries, reopen{" "}
          <Link href="/stocks/RELIANCE">the RELIANCE stock page</Link> and compare timestamps on fundamentals versus price.
          If the data-quality hint flags missing inputs, wait for the next sync rather than over-interpreting a borderline
          ratio built on incomplete denominators.
        </p>
        <h2>Broader context</h2>
        <p>
          Pair this case study with <Link href="/learn/halal-stocks-india">halal stocks in India</Link> for screening
          mechanics and <Link href="/learn/what-is-halal-investing">what is halal investing</Link> for definitions. When you
          are ready to compare peers, return to the <Link href="/screener">screener</Link> and filter by sector or market
          cap to see how other large caps score on similar tests.
        </p>
        <p>
          Disclaimer: BarakFi does not issue fatwas. Automated labels are educational and can lag filings. Consult
          qualified scholars and advisors for personal decisions.
        </p>
      </article>
    </main>
  );
}

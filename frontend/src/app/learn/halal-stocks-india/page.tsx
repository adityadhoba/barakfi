import type { Metadata } from "next";
import Link from "next/link";
import s from "../learn.module.css";

export const metadata: Metadata = {
  title: "Halal stocks in India — NSE & BSE Shariah screening guide",
  description:
    "How halal stock screening works for Indian equities: NSE and BSE reporting, common financial ratios, sector exclusions, and how to read BarakFi results alongside annual reports. Includes internal links to live stock pages and the screener for NSE/BSE-listed names.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://barakfi.in/learn/halal-stocks-india" },
};

export default function HalalStocksIndiaPage() {
  return (
    <main className={s.page}>
      <p className={s.kicker}>India focus</p>
      <h1 className={s.h1}>Halal stocks in India</h1>
      <article className={s.prose}>
        <p>
          If you invest on the National Stock Exchange (NSE) or BSE, you benefit from a deep universe of audited financials,
          regular quarterly updates, and sector diversity from IT services to pharmaceuticals and consumer goods. Halal
          screening on those listings still follows the same conceptual pillars used globally — business activity filters
          plus financial ratio limits — but the way you read statements should respect Indian accounting presentation,
          consolidated subsidiaries, and INR denomination. BarakFi keeps its public product focused on that Indian universe
          so explanations stay close to the filings retail investors can actually open on company websites.
        </p>
        <h2>NSE versus BSE listings</h2>
        <p>
          Many large caps trade on both venues with the same underlying company. For screening, what matters is the
          consolidated economic entity rather than which order book you use for execution. When symbols differ between
          venues, always confirm you are analysing the line item that matches the ticker you intend to trade. Our live
          pages such as <Link href="/stocks/HDFCBANK">HDFC Bank</Link> (when available) or{" "}
          <Link href="/stocks/ITC">ITC</Link> are keyed to the primary listing we store; cross-check ISIN in your broker if
          you need certainty.
        </p>
        <h2>Typical ratio families you will see</h2>
        <p>
          Expect to encounter debt compared to market capitalisation or average market capitalisation, non-permissible
          operating income as a fraction of total business income, interest income relative to revenue, receivables
          concentration, and cash plus short-term interest-bearing instruments versus total assets. Each family exists
          because real firms rarely look like textbook &quot;pure&quot; equity stories: they hold working cash, run vendor
          financing programmes, and operate global treasury desks. Thresholds differ between methodologies; that is why
          BarakFi can show a consensus-style view rather than pretending there is only one number in the world.
        </p>
        <h2>Sector stories that matter in India</h2>
        <p>
          Information technology exporters, generic drug manufacturers, and consumer staples each carry different
          balance-sheet fingerprints. IT services firms often show low debt but meaningful overseas cash balances;
          pharma can carry R&amp;D intangibles and licensing deals; consumer giants may run distribution credit in
          receivables. Screening is not &quot;one ratio tells all&quot;; read the narrative sections of annual reports to
          see whether leverage sits at the holdco or inside a financing subsidiary. Pair that qualitative read with the
          automated view on our <Link href="/screener">screener</Link>.
        </p>
        <h2>Using the screener effectively</h2>
        <p>
          Start from sector or market-cap filters, open a candidate&apos;s stock page, and walk through the compliance tab
          slowly. If a company is flagged as cautious, read the bullets explaining which denominator is thin or which ratio
          sits close to the line. Where fundamentals look stale, wait for the next filing cycle before drawing strong
          conclusions — especially after mergers or demergers when restated series need time to settle.
        </p>
        <h2>Ind AS presentation and “where did this number come from?”</h2>
        <p>
          Indian companies report under Ind AS, which means leases, financial instruments, and consolidation boundaries
          can look different from older GAAP snapshots you may have studied abroad. When BarakFi shows receivables,
          cash-like balances, or debt ratios, the engine is only as faithful as the mapped line items in our database. If a
          footnote explains a large related-party loan or a hybrid instrument, bring that context to your scholar — the
          screener cannot negotiate how a supervisory board should classify a structured note.
        </p>
        <p>
          Quarterly results sometimes omit full balance-sheet detail; annual reports remain the anchor for structural
          leverage and segment profitability. Use short-term price screens for timing, but lean on annual and investor
          presentation packs when you want to understand whether a cautious flag is a data artefact or a genuine ratio
          pressure point.
        </p>
        <h2>Index membership is not a halal certificate</h2>
        <p>
          Being in NIFTY or another benchmark says nothing about Shariah compliance. Indices optimise for liquidity and
          representation; Islamic indices apply an additional ruleset with different thresholds. You may therefore see a
          household name in a broad market index yet flagged cautious on BarakFi — that is not a bug, it is a reminder that
          benchmark inclusion and religious screening answer different questions.
        </p>
        <h2>Links to explore</h2>
        <ul>
          <li>
            <Link href="/learn/what-is-halal-investing">What is halal investing?</Link> for broader definitions.
          </li>
          <li>
            <Link href="/learn/top-halal-stocks-india">Large-cap examples</Link> investors often ask about first.
          </li>
          <li>
            <Link href="/stocks/RELIANCE">Reliance stock page</Link> alongside the{" "}
            <Link href="/learn/is-reliance-halal">Reliance article</Link> for a worked narrative.
          </li>
        </ul>
        <p>
          Nothing here is investment advice or a substitute for qualified Shariah guidance. Use BarakFi as a structured
          starting point, then do your own reading and consult professionals where needed.
        </p>
      </article>
    </main>
  );
}

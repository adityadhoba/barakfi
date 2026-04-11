import type { Metadata } from "next";
import Link from "next/link";
import s from "../learn.module.css";

export const metadata: Metadata = {
  title: "Large Indian stocks investors often screen for halal compliance",
  description:
    "A tour of widely held NSE and BSE large-caps Muslim investors frequently check first — IT, pharma, FMCG, and banks (often excluded) — with internal links to BarakFi stock pages and the halal screener. Educational context only; not a buy list or fatwa.",
};

export default function TopHalalStocksIndiaPage() {
  return (
    <main className={s.page}>
      <p className={s.kicker}>Universe</p>
      <h1 className={s.h1}>Large Indian stocks people screen first</h1>
      <article className={s.prose}>
        <p>
          New halal equity investors in India often start with the same shortlist: flagship IT exporters, diversified
          consumer names, large pharmaceutical manufacturers, and select industrials with transparent balance sheets. This
          is not a recommendation list — markets rotate, fundamentals change, and scholarly standards differ — but it is a
          useful map of where to look first when learning how ratios behave in the wild.
        </p>
        <h2>Information technology services</h2>
        <p>
          IT services firms frequently show moderate leverage and overseas cash balances. Start with{" "}
          <Link href="/stocks/TCS">TCS</Link> and <Link href="/stocks/INFY">INFY</Link> to compare how debt, receivables,
          and cash lines move differently even within the same sector. Pay attention to lease-related notes as accounting
          standards evolve; they can shift ratio denominators between cycles.
        </p>
        <h2>Pharmaceuticals and healthcare</h2>
        <p>
          Large pharma names combine R&amp;D spending with global revenue mixes. Use the stock pages to inspect
          non-permissible income lines and interest income relative to total business income. Cross-read management
          commentary on US generics pricing and India domestic formulations — the business can remain attractive while
          certain financial lines move sharply quarter to quarter.
        </p>
        <h2>FMCG and consumer</h2>
        <p>
          Staples businesses are often intuitively &quot;cleaner&quot; on activity screens, yet working-capital cycles can
          still drive receivables metrics. Compare <Link href="/stocks/ITC">ITC</Link> with other consumer names you care
          about and watch how diversification into hotels or foods affects segment disclosures.
        </p>
        <h2>Banks and NBFCs</h2>
        <p>
          Conventional deposit-taking banks are typically excluded outright by sector-based screens because their core
          business is interest-based. That does not mean every financial name is identical: insurance, asset management,
          and fintech platforms each raise different scholarly questions. If you are exploring edge cases, read business
          descriptions carefully and take specialist advice.
        </p>
        <h2>How to go deeper</h2>
        <p>
          After spot-checking individual tickers, run the <Link href="/halal-stocks">halal stocks</Link> view and the{" "}
          <Link href="/screener">full screener</Link> to see breadth. Revisit <Link href="/learn/halal-stocks-india">halal
          stocks in India</Link> for methodology context and <Link href="/methodology">methodology</Link> for numeric
          thresholds. Remember that any static article lags the market; always confirm the live page before acting.
        </p>
        <p>
          Educational only — not personalised investment advice or a religious ruling. Consult qualified professionals.
        </p>
      </article>
    </main>
  );
}

import type { EquityQuote } from "@/lib/api";
import { formatQuoteAsOf, quoteSourceLabel } from "@/lib/trust-format";
import styles from "./stock-data-trust.module.css";

type Props = {
  symbol: string;
  dataSource: string;
  screeningProfile: string;
  liveQuote: EquityQuote | null;
};

export function StockDataTrust({ symbol, dataSource, screeningProfile, liveQuote }: Props) {
  const quoteAsOf = liveQuote ? formatQuoteAsOf(liveQuote.as_of) : null;
  const src = liveQuote ? quoteSourceLabel(liveQuote.source) : null;

  return (
    <aside className={styles.strip} aria-label="Data sources and timing">
      <div className={styles.lines}>
        <p className={styles.line}>
          <strong>Screening:</strong> {screeningProfile.replace(/_/g, " ")} profile (S&amp;P-style ratios on Barakfi). Not a fatwa — see{" "}
          <a href="/methodology" style={{ color: "var(--emerald)", fontWeight: 600 }}>
            methodology
          </a>
          .
        </p>
        <p className={styles.line}>
          <strong>Fundamentals:</strong> {dataSource || "Database"} (periodic refresh; may lag filings).
        </p>
        {liveQuote && src ? (
          <p className={styles.line}>
            <strong>Quote:</strong> {src}
            {quoteAsOf ? ` · as of ${quoteAsOf}` : ""}
            {liveQuote.currency ? ` · ${liveQuote.currency}` : ""}
          </p>
        ) : (
          <p className={styles.line}>
            <strong>Quote:</strong> Showing last known price from our data for {symbol}.
          </p>
        )}
      </div>
      <p className={styles.disclaimer}>
        Information is for education and screening only. Prices and ratios can change. Always verify with exchange data and a qualified advisor before investing.
      </p>
    </aside>
  );
}

export function ComplianceThresholdIntro() {
  return (
    <div className={styles.complianceIntro}>
      <p className={styles.complianceIntroTitle}>How we score these ratios</p>
      <p style={{ margin: 0 }}>
        Default limits follow common S&amp;P Shariah-style rules: debt and receivables vs market cap (typically ≤33%), non-permissible and interest income (≤5% of revenue), cash &amp; interest-bearing vs assets (≤33%). Bars show your value vs that limit — green under ~70% of limit, amber near limit, red over.
      </p>
      <ul>
        <li>Debt / 36M avg mcap &amp; current debt / mcap</li>
        <li>Non-halal income &amp; interest income vs revenue</li>
        <li>Receivables / mcap; cash &amp; interest-bearing / assets</li>
      </ul>
    </div>
  );
}

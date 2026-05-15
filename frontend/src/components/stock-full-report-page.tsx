import Link from "next/link";
import { PRIMARY_METHODOLOGY_VERSION } from "@/lib/methodology-version";
import { screeningUiLabel } from "@/lib/screening-status";
import { StockLogo } from "@/components/stock-logo";
import type { EquityQuote, IndexQuote, ScreeningResult, Stock } from "@/lib/api";
import styles from "@/app/stock-full-report-page.module.css";

type SimilarStock = {
  stock: Stock;
  screening: ScreeningResult | null;
};

type Props = {
  stock: Stock;
  screening: ScreeningResult;
  liveQuote: EquityQuote | null;
  indices: IndexQuote[];
  similarStocks: SimilarStock[];
};

type RatioCard = {
  id: string;
  label: string;
  value: string;
  threshold: string;
  status: "pass" | "review" | "fail";
  note: string;
};

function formatPrice(value: number, currency: string = "INR") {
  const locale = currency === "GBP" ? "en-GB" : currency === "USD" ? "en-US" : "en-IN";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPct(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${(value * 100).toFixed(2)}%`;
}

function normalizeStatus(status: string): "pass" | "review" | "fail" {
  if (status === "HALAL") return "pass";
  if (status === "NON_COMPLIANT") return "fail";
  return "review";
}

function thresholdStatus(value: number, threshold: number): "pass" | "review" | "fail" {
  if (value <= threshold * 0.7) return "pass";
  if (value <= threshold) return "review";
  return "fail";
}

function buildRatioCards(stock: Stock, screening: ScreeningResult): RatioCard[] {
  const b = screening.breakdown;
  return [
    {
      id: "debt",
      label: "Debt Ratio",
      value: formatPct(b.debt_to_market_cap_ratio),
      threshold: "< 33%",
      status: thresholdStatus(b.debt_to_market_cap_ratio, 0.33),
      note: "Interest-bearing debt against market value.",
    },
    {
      id: "interest",
      label: "Interest Income",
      value: formatPct(b.interest_income_ratio),
      threshold: "< 5%",
      status: thresholdStatus(b.interest_income_ratio, 0.05),
      note: "Interest and treasury-based income share.",
    },
    {
      id: "non-permissible",
      label: "Non-permissible Income",
      value: formatPct(b.non_permissible_income_ratio),
      threshold: "< 5%",
      status: thresholdStatus(b.non_permissible_income_ratio, 0.05),
      note: "Non-halal income against total business income.",
    },
    {
      id: "receivables",
      label: "Receivables Ratio",
      value: formatPct(b.receivables_to_market_cap_ratio),
      threshold: "< 33%",
      status: thresholdStatus(b.receivables_to_market_cap_ratio, 0.33),
      note: "Receivables compared with market value.",
    },
    {
      id: "cash-assets",
      label: "Cash & IB Assets",
      value: formatPct(b.cash_and_interest_bearing_to_assets_ratio),
      threshold: "< 33%",
      status: thresholdStatus(b.cash_and_interest_bearing_to_assets_ratio, 0.33),
      note: "Cash and interest-bearing balances vs total assets.",
    },
    {
      id: "sector",
      label: "Business Activity",
      value: b.sector_allowed ? "Allowed" : "Restricted",
      threshold: "Sector screen",
      status: b.sector_allowed ? "pass" : normalizeStatus(stock.symbol === screening.symbol ? screening.status : "CAUTIOUS"),
      note: "Core business activity sector permissibility check.",
    },
  ];
}

function statusClass(status: "pass" | "review" | "fail") {
  if (status === "pass") return styles.statusPass;
  if (status === "fail") return styles.statusFail;
  return styles.statusReview;
}

function reportSummary(screening: ScreeningResult) {
  const reasons = screening.reasons.length > 0 ? screening.reasons.join(" ") : "No additional reason text was returned by the current screening run.";
  return `${screeningUiLabel(screening.status)} — ${reasons}`;
}

export function StockFullReportPage({ stock, screening, liveQuote, indices, similarStocks }: Props) {
  const reportStatus = screeningUiLabel(screening.status);
  const verdictStatus = normalizeStatus(screening.status);
  const cards = buildRatioCards(stock, screening);
  const shareUrl = `https://barakfi.in/stocks/${encodeURIComponent(stock.symbol)}/report`;
  const displayPrice = liveQuote?.last_price ?? stock.price;
  const quoteCurrency = liveQuote?.currency || stock.currency || "INR";

  return (
    <div className={styles.pageWrap}>
      <section className={styles.hero}>
        <div className={styles.crumbs}>
          <Link href="/">Home</Link>
          <span>›</span>
          <Link href={`/stocks/${encodeURIComponent(stock.symbol)}`}>{stock.symbol}</Link>
          <span>›</span>
          <span>Full Breakdown</span>
        </div>

        <div className={styles.heroTop}>
          <div className={styles.identity}>
            <StockLogo symbol={stock.symbol} size={52} status={screening.status} />
            <div>
              <h1>{stock.name} Full Screening Report</h1>
              <p>
                {stock.symbol} · {stock.exchange} · {stock.sector}
              </p>
            </div>
          </div>
          <div className={styles.heroActions}>
            <Link href={`/stocks/${encodeURIComponent(stock.symbol)}`} className={styles.ghostBtn}>Back to Stock Page</Link>
            <a href={shareUrl} className={styles.solidBtn}>Copy Report URL</a>
          </div>
        </div>

        <div className={styles.verdictStrip}>
          <div>
            <div className={styles.label}>Final Verdict</div>
            <div className={`${styles.verdictBadge} ${statusClass(verdictStatus)}`}>{reportStatus}</div>
          </div>
          <div>
            <div className={styles.label}>Current Price</div>
            <div className={styles.metric}>{formatPrice(displayPrice, quoteCurrency)}</div>
          </div>
          <div>
            <div className={styles.label}>Methodology</div>
            <div className={styles.metric}>AAOIFI Aligned · {PRIMARY_METHODOLOGY_VERSION}</div>
          </div>
          <div>
            <div className={styles.label}>Screening Score</div>
            <div className={styles.metric}>{Math.max(0, Math.round(screening.screening_score || 0))}%</div>
          </div>
        </div>

        <p className={styles.summary}>{reportSummary(screening)}</p>
      </section>

      <section className={styles.section}>
        <h2>Compliance Ratio Breakdown</h2>
        <div className={styles.cardGrid}>
          {cards.map((card) => (
            <article key={card.id} className={styles.ratioCard}>
              <div className={styles.ratioTop}>
                <h3>{card.label}</h3>
                <span className={`${styles.ratioBadge} ${statusClass(card.status)}`}>
                  {card.status === "pass" ? "Pass" : card.status === "review" ? "Review" : "Fail"}
                </span>
              </div>
              <div className={styles.ratioValue}>{card.value}</div>
              <div className={styles.threshold}>Threshold: {card.threshold}</div>
              <p className={styles.note}>{card.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>Reasoning & Flags</h2>
        <div className={styles.twoCol}>
          <article className={styles.panel}>
            <h3>Screening Reasons</h3>
            {screening.reasons.length > 0 ? (
              <ul>
                {screening.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : (
              <p>No detailed reasons returned for this run.</p>
            )}
          </article>
          <article className={styles.panel}>
            <h3>Manual Review Flags</h3>
            {screening.manual_review_flags.length > 0 ? (
              <ul>
                {screening.manual_review_flags.map((flag) => (
                  <li key={flag}>{flag}</li>
                ))}
              </ul>
            ) : (
              <p>No manual review flags are currently active for this stock.</p>
            )}
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Market Context</h2>
        <div className={styles.twoCol}>
          <article className={styles.panel}>
            <h3>Indices Snapshot</h3>
            <div className={styles.indexList}>
              {indices.slice(0, 6).map((idx) => (
                <div key={`${idx.name}-${idx.updated_at}`} className={styles.indexRow}>
                  <span>{idx.name}</span>
                  <span>{idx.change_percent >= 0 ? "+" : ""}{idx.change_percent.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </article>
          <article className={styles.panel}>
            <h3>Similar Stocks ({stock.sector})</h3>
            <div className={styles.similarList}>
              {similarStocks.length > 0 ? similarStocks.map(({ stock: peer, screening: peerScreening }) => (
                <Link key={peer.symbol} href={`/stocks/${encodeURIComponent(peer.symbol)}`} className={styles.similarItem}>
                  <div>
                    <strong>{peer.symbol}</strong>
                    <span>{peer.name}</span>
                  </div>
                  <span>{peerScreening ? screeningUiLabel(peerScreening.status) : "Requires Review"}</span>
                </Link>
              )) : <p>No comparable sector peers available.</p>}
            </div>
          </article>
        </div>
      </section>

      <section className={styles.disclaimer}>
        Educational screening report only. Not a religious ruling and not financial advice. Verify with qualified scholars and your own due diligence before investment decisions.
      </section>
    </div>
  );
}

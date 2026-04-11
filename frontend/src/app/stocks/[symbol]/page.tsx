import type { Metadata } from "next";

export const dynamic = "force-dynamic";

import pageStyles from "@/app/page.module.css";
import styles from "@/app/screener.module.css";
import { ResearchNoteForm } from "@/components/research-note-form";
import { WatchlistActionButton } from "@/components/watchlist-action-button";
import { StockResearchSection } from "@/components/stock-research-section";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  getAuthenticatedWatchlist,
  getAuthenticatedWorkspace,
  getBulkScreeningResults,
  getEquityQuote,
  getStocks,
  type EquityQuote,
  type WorkspaceBundle,
} from "@/lib/api";
import { fetchMultiScreeningForPage, fetchStockAndScreenForPage } from "@/lib/stock-detail-fetch";
import { StockDetailError } from "@/components/stock-detail-error";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PriceChart } from "@/components/price-chart";
import { SimilarStocksQuotes } from "@/components/similar-stocks-quotes";
import { ShareButton } from "@/components/share-button";
import { StockTabs } from "@/components/stock-tabs";
import { AdUnit } from "@/components/ad-unit";
import { StockLogo } from "@/components/stock-logo";
import { StockDetailTablesCollapsible } from "@/components/stock-detail-tables-collapsible";
import {
  buildMethodologyTableRowsFromMulti,
  buildPrimaryRatioTableRows,
  methodologyTableCaption,
} from "@/lib/stock-detail-screening-tables";
import { displayCountryForStock } from "@/lib/stock-display";
import {
  capTierLabel,
  formatFundamentalAmount,
  formatFundamentalsAsOfLine,
  fundamentalsUnitNote,
} from "@/lib/fundamentals-format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  return {
    title: `${symbol} — Shariah Screening | Barakfi`,
    description: `Shariah compliance screening, financial ratios, and research tools for ${symbol} on the Indian stock market.`,
  };
}

const STATUS_BADGE: Record<string, string> = {
  HALAL: "badgeHalal",
  CAUTIOUS: "badgeReview",
  NON_COMPLIANT: "badgeFail",
};
const STATUS_LABELS: Record<string, string> = {
  HALAL: "Halal",
  CAUTIOUS: "Doubtful",
  NON_COMPLIANT: "Haram",
};

/** Coerce API numerics; avoids render crashes if JSON has string numbers. */
function sanitizeEquityQuote(raw: EquityQuote | null): EquityQuote | null {
  if (!raw) return null;
  const n = (v: unknown): number | null => {
    if (v == null) return null;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const x = Number(v);
      if (Number.isFinite(x)) return x;
    }
    return null;
  };
  const last = n(raw.last_price);
  if (last == null || last <= 0) return null;
  return {
    ...raw,
    last_price: last,
    previous_close: n(raw.previous_close),
    change: n(raw.change),
    change_percent: n(raw.change_percent),
    day_high: n(raw.day_high),
    day_low: n(raw.day_low),
    volume: n(raw.volume),
    week_52_high: n(raw.week_52_high),
    week_52_low: n(raw.week_52_low),
  };
}

function formatCurrency(value: number, currency: string = "INR") {
  const cur = currency || "INR";
  const locale = cur === "INR" ? "en-IN" : cur === "GBP" ? "en-GB" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(value);
}

function formatVolumeShorthand(volume: number, currency: string) {
  const cur = currency || "INR";
  if (cur === "INR") {
    if (volume >= 1e7) return `${(volume / 1e7).toFixed(2)} Cr`;
    return `${(volume / 1e5).toFixed(1)} L`;
  }
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return String(Math.round(volume));
}

function formatRatio(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function ratioBarColor(value: number, threshold: number): string {
  if (value <= threshold * 0.7) return styles.ratioBarFillGood;
  if (value <= threshold) return styles.ratioBarFillWarn;
  return styles.ratioBarFillBad;
}

function buildTakeaway(status: string, reasons: string[], flags: string[]) {
  if (status === "HALAL") {
    return "This stock passes all Shariah rules. You can invest with confidence. Check the numbers below for details.";
  }
  if (status === "NON_COMPLIANT") {
    return `This stock doesn't meet ${reasons.length} Shariah rule${reasons.length > 1 ? "s" : ""}. See below to understand why.`;
  }
  if (flags.length > 0) {
    return "We can't fully confirm this stock yet — it needs a manual check by a scholar or compliance expert.";
  }
  return "This stock is cautious: we can't yet fully confirm if it's halal or not.";
}

function calculateComplianceScore(
  debtTo36m: number,
  debtToCurrent: number,
  nonPermIncome: number,
  interestIncome: number,
  receivables: number,
  cashAndInterestBearing: number
): number {
  let score = 0;
  const THRESHOLDS = {
    debt: 0.33,
    nonPerm: 0.05,
    interest: 0.05,
    receivables: 0.33,
    cashIB: 0.33,
  };

  // Each ratio contributes ~16.7 points (6 ratios, 100 total)
  const ratios = [
    { value: debtTo36m, threshold: THRESHOLDS.debt },
    { value: debtToCurrent, threshold: THRESHOLDS.debt },
    { value: nonPermIncome, threshold: THRESHOLDS.nonPerm },
    { value: interestIncome, threshold: THRESHOLDS.interest },
    { value: receivables, threshold: THRESHOLDS.receivables },
    { value: cashAndInterestBearing, threshold: THRESHOLDS.cashIB },
  ];

  ratios.forEach((r) => {
    if (r.value <= r.threshold * 0.7) {
      score += 17;
    } else if (r.value <= r.threshold) {
      score += 12;
    }
  });

  return Math.min(score, 100);
}

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const authState = await auth();
  const clerkUser = await currentUser();
  const token = await authState.getToken();
  const actor =
    clerkUser && token
      ? { authSubject: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress || null }
      : null;

  const [detail, watchlist, allStocks, multiScreening] = await Promise.all([
    fetchStockAndScreenForPage(symbol),
    token ? getAuthenticatedWatchlist(token, actor).catch(() => []) : Promise.resolve([]),
    getStocks(),
    fetchMultiScreeningForPage(symbol),
  ]);

  let workspace: WorkspaceBundle | null = null;
  if (token) {
    try {
      workspace = await getAuthenticatedWorkspace(token, actor);
    } catch {
      workspace = null;
    }
  }

  if (detail.kind === "not_found") {
    notFound();
  }
  if (detail.kind === "error") {
    return <StockDetailError message={detail.message} />;
  }

  const { stock, screening } = detail;

  const liveQuote = sanitizeEquityQuote(await getEquityQuote(symbol, "auto_global", stock.exchange));

  const isInWatchlist = watchlist.some((e) => e.stock.symbol === stock.symbol);
  const primaryPortfolioId = workspace?.portfolios[0]?.id;
  const reasons = screening.reasons.length > 0 ? screening.reasons : ["No hard-rule violations detected."];
  const b = screening.breakdown;
  const takeaway = buildTakeaway(screening.status, screening.reasons, screening.manual_review_flags);

  const ratios = [
    { label: "Debt level", value: b.debt_to_36m_avg_market_cap_ratio, threshold: 0.33, max: 0.5, desc: "How much debt the company carries. Must be under 33%." },
    { label: "Current debt", value: b.debt_to_market_cap_ratio, threshold: 0.33, max: 0.5, desc: "Debt compared to current company value." },
    { label: "Income purity", value: b.non_permissible_income_ratio, threshold: 0.05, max: 0.1, desc: "How much income comes from non-halal sources. Must be under 5%." },
    { label: "Interest earned", value: b.interest_income_ratio, threshold: 0.05, max: 0.1, desc: "Interest income as portion of total revenue." },
    { label: "Money owed to company", value: b.receivables_to_market_cap_ratio, threshold: 0.33, max: 0.5, desc: "Outstanding receivables compared to company value. Must be under 33%." },
    { label: "Cash & interest-bearing", value: b.cash_and_interest_bearing_to_assets_ratio, threshold: 0.33, max: 0.5, desc: "Cash and interest-bearing securities as a portion of total assets. Must be under 33%." },
  ];

  const ratioRowsForCollapsible = buildPrimaryRatioTableRows(screening);
  const methodologyRowsForCollapsible = multiScreening
    ? buildMethodologyTableRowsFromMulti(multiScreening)
    : null;
  const methodologyCaptionForCollapsible = multiScreening
    ? methodologyTableCaption(multiScreening)
    : null;

  const cur = stock.currency || "INR";
  const quoteCur = liveQuote?.currency?.trim() || cur;
  const displayCountry = displayCountryForStock(stock.exchange, stock.country);
  const financials = [
    { label: "Market Cap", value: formatFundamentalAmount(stock.market_cap, cur) },
    { label: "36M Avg Market Cap", value: formatFundamentalAmount(stock.average_market_cap_36m, cur) },
    { label: "Revenue", value: formatCurrency(stock.revenue, cur) },
    { label: "Total Business Income", value: formatCurrency(stock.total_business_income, cur) },
    { label: "Interest Income", value: formatCurrency(stock.interest_income, cur) },
    { label: "Non-permissible Income", value: formatCurrency(stock.non_permissible_income, cur) },
    { label: "Total Debt", value: formatCurrency(stock.debt, cur) },
    { label: "Accounts Receivable", value: formatCurrency(stock.accounts_receivable, cur) },
    { label: "Fixed Assets", value: formatCurrency(stock.fixed_assets, cur) },
    { label: "Total Assets", value: formatCurrency(stock.total_assets, cur) },
  ];

  // Similar stocks from the same sector (excluding current)
  const sameSecStocks = allStocks
    .filter((s) => s.sector === stock.sector && s.symbol !== stock.symbol)
    .sort((a, b) => b.market_cap - a.market_cap)
    .slice(0, 4);
  // If not enough from same sector, fill from other large-cap stocks
  const otherStocks = sameSecStocks.length < 3
    ? allStocks
        .filter((s) => s.symbol !== stock.symbol && !sameSecStocks.some((x) => x.symbol === s.symbol))
        .sort((a, b) => b.market_cap - a.market_cap)
        .slice(0, 4 - sameSecStocks.length)
    : [];
  const similarStocks = [...sameSecStocks, ...otherStocks];

  // Fetch screening data for similar stocks (for Research tab peer comparison)
  const peerScreenings = similarStocks.length > 0
    ? await getBulkScreeningResults(similarStocks.map((s) => s.symbol)).catch(() => [])
    : [];

  const complianceScore =
    typeof screening.screening_score === "number"
      ? screening.screening_score
      : calculateComplianceScore(
          b.debt_to_36m_avg_market_cap_ratio,
          b.debt_to_market_cap_ratio,
          b.non_permissible_income_ratio,
          b.interest_income_ratio,
          b.receivables_to_market_cap_ratio,
          b.cash_and_interest_bearing_to_assets_ratio,
        );

  // Count status breakdown for donut chart
  let passCount = 0,
    warnCount = 0,
    failCount = 0;
  ratios.forEach((r) => {
    if (r.value <= r.threshold * 0.7) passCount++;
    else if (r.value <= r.threshold) warnCount++;
    else failCount++;
  });

  // Prepare peer comparison data
  const peerComparison = similarStocks.map((peer) => {
    const peerScreening = peerScreenings.find((s) => s.symbol === peer.symbol);
    const peerScore = peerScreening
      ? calculateComplianceScore(
          peerScreening.breakdown.debt_to_36m_avg_market_cap_ratio,
          peerScreening.breakdown.debt_to_market_cap_ratio,
          peerScreening.breakdown.non_permissible_income_ratio,
          peerScreening.breakdown.interest_income_ratio,
          peerScreening.breakdown.receivables_to_market_cap_ratio,
          peerScreening.breakdown.cash_and_interest_bearing_to_assets_ratio
        )
      : 0;
    return {
      symbol: peer.symbol,
      name: peer.name,
      status: peerScreening?.status || "UNKNOWN",
      score: peerScore,
      debt: peerScreening?.breakdown.debt_to_36m_avg_market_cap_ratio || 0,
      nonHalal: peerScreening?.breakdown.non_permissible_income_ratio || 0,
    };
  });

  /* ── JSON-LD Structured Data for SEO ── */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: stock.name,
    description: `Shariah compliance screening for ${stock.name} (${stock.symbol}) — ${STATUS_LABELS[screening.status] || "Cautious"}`,
    url: `https://barakfi.in/stocks/${stock.symbol}`,
    provider: {
      "@type": "Organization",
      name: "Barakfi",
      url: "https://barakfi.in",
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Shariah Status",
        value: STATUS_LABELS[screening.status] || "Cautious",
      },
      {
        "@type": "PropertyValue",
        name: "Sector",
        value: stock.sector,
      },
      {
        "@type": "PropertyValue",
        name: "Exchange",
        value: stock.exchange,
      },
    ],
  };

  return (
    <main className={styles.screenerPage}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className={styles.screenerContainer}>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/" className={styles.breadcrumbLink}>Home</Link>
          <span className={styles.breadcrumbSep} aria-hidden>/</span>
          <Link href="/screener" className={styles.breadcrumbLink}>Screener</Link>
          <span className={styles.breadcrumbSep} aria-hidden>/</span>
          <span className={styles.breadcrumbCurrent} aria-current="page">{stock.symbol}</span>
        </nav>

        {/* Hero */}
        <div className={styles.complianceHero}>
          <div className={styles.complianceHeroLeft}>
            <div className={styles.stockMeta}>
              <span className={styles.stockMetaChip}>{stock.exchange}</span>
              <span className={styles.stockMetaChip}>{stock.sector}</span>
              <span className={styles.stockMetaChip}>{displayCountry}</span>
            </div>
            <div className={styles.stockTitleRow}>
              <StockLogo symbol={stock.symbol} size={44} status={screening.status} exchange={stock.exchange} />
              <div>
                <h1 className={styles.stockTitle}>{stock.name}</h1>
                <span className={`${styles.badge} ${styles[STATUS_BADGE[screening.status] || "badgeReview"]}`}>
                  {STATUS_LABELS[screening.status] || screening.status}
                </span>
              </div>
            </div>
            <div className={styles.stockMeta}>
              <span className={styles.stockPrice}>
                {formatCurrency(liveQuote?.last_price ?? stock.price, quoteCur)}
              </span>
            </div>
            {liveQuote && (
              <p className={styles.liveQuoteLine}>
                {liveQuote.change_percent != null && (
                  <span
                    className={
                      liveQuote.change_percent >= 0 ? styles.quoteChangeUp : styles.quoteChangeDown
                    }
                  >
                    {liveQuote.change_percent >= 0 ? "+" : ""}
                    {liveQuote.change_percent.toFixed(2)}% today
                  </span>
                )}
                {liveQuote.change_percent == null && liveQuote.change != null && (
                  <span className={styles.quoteChangeUp}>&Delta; {formatCurrency(liveQuote.change, quoteCur)}</span>
                )}
                {" · "}
                Day {liveQuote.day_low != null && liveQuote.day_high != null
                  ? `${formatCurrency(liveQuote.day_low, quoteCur)} – ${formatCurrency(liveQuote.day_high, quoteCur)}`
                  : "range n/a"}
                {liveQuote.volume != null && (
                  <>
                    {" · "}
                    Vol {formatVolumeShorthand(liveQuote.volume, quoteCur)}
                  </>
                )}
                {" · "}
                <span title={liveQuote.disclaimer}>
                  {liveQuote.source === "nse_india_public" ? "NSE (public)" : "Yahoo chart"}
                </span>
              </p>
            )}
            <div className={styles.stockMeta} style={{ marginTop: 12, gap: 8 }}>
              <WatchlistActionButton symbol={stock.symbol} initialInWatchlist={isInWatchlist} />
              <ShareButton
                title={`${stock.name} (${stock.symbol}) — Shariah Screening`}
                text={`Check out ${stock.name} on Barakfi — ${STATUS_LABELS[screening.status] || "Cautious"}`}
              />
            </div>
          </div>
          <div className={styles.complianceHeroRight}>
            <div className={styles.scorecardDonut}>
              <svg viewBox="0 0 120 120" className={styles.donutChart}>
                <circle cx="60" cy="60" r="50" className={styles.donutBackground} />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className={styles.donutSegmentPass}
                  style={{
                    strokeDasharray: `${(passCount / 5) * 314.159} 314.159`,
                    strokeDashoffset: "0",
                  }}
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className={styles.donutSegmentWarn}
                  style={{
                    strokeDasharray: `${(warnCount / 5) * 314.159} 314.159`,
                    strokeDashoffset: `${-(passCount / 5) * 314.159}`,
                  }}
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className={styles.donutSegmentFail}
                  style={{
                    strokeDasharray: `${(failCount / 5) * 314.159} 314.159`,
                    strokeDashoffset: `${-((passCount + warnCount) / 5) * 314.159}`,
                  }}
                />
                <text x="60" y="55" className={styles.donutText}>
                  {passCount}/{passCount + warnCount + failCount}
                </text>
                <text x="60" y="70" className={styles.donutSubText}>
                  Pass
                </text>
              </svg>
            </div>
            <p className={styles.complianceHeroSummary}>{takeaway}</p>
          </div>
        </div>

        {/* Compliance Verdict Banner */}
        <div className={`${styles.verdictBanner} ${
          screening.status === "HALAL" ? styles.verdictHalal
          : screening.status === "CAUTIOUS" ? styles.verdictReview
          : styles.verdictFail
        }`}>
          <div className={styles.verdictLeft}>
            <span className={styles.verdictScore}>{complianceScore}</span>
            <span className={styles.verdictScoreSuffix}>/100</span>
          </div>
          <div className={styles.verdictBody}>
            <div className={styles.verdictStatus}>
              <span className={`${styles.badge} ${styles[STATUS_BADGE[screening.status] || "badgeReview"]}`}>
                {STATUS_LABELS[screening.status] || screening.status}
              </span>
              {screening.purification_ratio_pct != null && screening.status === "HALAL" && (
                <span className={styles.verdictPurification}>
                  Purification: {screening.purification_ratio_pct}%
                </span>
              )}
            </div>
            <p className={styles.verdictText}>{takeaway}</p>
          </div>
        </div>

        {/* Key Metrics Strip */}
        <div className={styles.keyMetricsStrip}>
          <div className={styles.keyMetricCard}>
            <span className={styles.keyMetricLabel}>Market Cap</span>
            <span className={styles.keyMetricValue}>{formatFundamentalAmount(stock.market_cap, cur)}</span>
          </div>
          <div className={styles.keyMetricCard}>
            <span className={styles.keyMetricLabel}>Revenue</span>
            <span className={styles.keyMetricValue}>{formatFundamentalAmount(stock.revenue, cur)}</span>
          </div>
          <div className={styles.keyMetricCard}>
            <span className={styles.keyMetricLabel}>Total Debt</span>
            <span className={styles.keyMetricValue}>{formatFundamentalAmount(stock.debt, cur)}</span>
          </div>
          <div className={styles.keyMetricCard}>
            <span className={styles.keyMetricLabel}>Debt / Mcap</span>
            <span className={`${styles.keyMetricValue} ${
              b.debt_to_36m_avg_market_cap_ratio <= 0.33 * 0.7 ? styles.keyMetricGood
              : b.debt_to_36m_avg_market_cap_ratio <= 0.33 ? styles.keyMetricWarn
              : styles.keyMetricBad
            }`}>{formatRatio(b.debt_to_36m_avg_market_cap_ratio)}</span>
          </div>
          <div className={styles.keyMetricCard}>
            <span className={styles.keyMetricLabel}>Non-Halal Income</span>
            <span className={`${styles.keyMetricValue} ${
              b.non_permissible_income_ratio <= 0.05 * 0.7 ? styles.keyMetricGood
              : b.non_permissible_income_ratio <= 0.05 ? styles.keyMetricWarn
              : styles.keyMetricBad
            }`}>{formatRatio(b.non_permissible_income_ratio)}</span>
          </div>
          <div className={styles.keyMetricCard}>
            <span className={styles.keyMetricLabel}>Sector</span>
            <span className={styles.keyMetricValue} style={{ fontSize: "0.78rem" }}>{stock.sector}</span>
          </div>
        </div>

        {/* Category Info Cards — like Tickertape */}
        <div className={styles.categoryCards}>
          <div className={styles.categoryCard}>
            <span className={styles.categoryIcon} style={{ color: "var(--emerald)" }}>&#x2726;</span>
            <div className={styles.categoryContent}>
              <Link href={`/screener?sector=${encodeURIComponent(stock.sector)}`} className={styles.categoryTitle}>
                {stock.sector} &rsaquo;
              </Link>
              <span className={styles.categorySub}>{stock.sector}</span>
            </div>
          </div>
          <div className={styles.categoryCard}>
            <span className={styles.categoryIcon} style={{ color: "#3b82f6" }}>&#x25B2;</span>
            <div className={styles.categoryContent}>
              <span className={styles.categoryTitle}>
                {capTierLabel(stock.market_cap, cur)} &rsaquo;
              </span>
              <span className={styles.categorySub}>
                Market cap {formatFundamentalAmount(stock.market_cap, cur)} (size band is approximate)
              </span>
            </div>
          </div>
          <div className={styles.categoryCard}>
            <span className={styles.categoryIcon} style={{ color: b.debt_to_36m_avg_market_cap_ratio <= 0.23 ? "var(--emerald)" : "var(--gold)" }}>&#x21C5;</span>
            <div className={styles.categoryContent}>
              <span className={styles.categoryTitle}>
                {b.debt_to_36m_avg_market_cap_ratio <= 0.15 ? "Low Risk" : b.debt_to_36m_avg_market_cap_ratio <= 0.25 ? "Medium Risk" : "Higher Risk"} &rsaquo;
              </span>
              <span className={styles.categorySub}>
                Debt ratio {formatRatio(b.debt_to_36m_avg_market_cap_ratio)}
              </span>
            </div>
          </div>
        </div>

        {/* Ad: below chart area */}
        <AdUnit format="rectangle" />

        {/* Price Chart */}
        <div style={{ marginBottom: 28 }}>
          <PriceChart
            symbol={stock.symbol}
            exchange={stock.exchange}
            liveClose={liveQuote?.last_price ?? stock.price}
          />
        </div>

        {/* 52-Week Range Visual + Volume Summary */}
        {liveQuote && (liveQuote.week_52_high != null || liveQuote.week_52_low != null) && (
          <div style={{ marginBottom: 28 }}>
            {/* 52W Range Bar */}
            {liveQuote.week_52_low != null && liveQuote.week_52_high != null && liveQuote.week_52_high > liveQuote.week_52_low && (
              <div className={styles.rangeBarSection}>
                <div className={styles.rangeBarHeader}>
                  <span className={styles.rangeBarLabel}>52-Week Range</span>
                  <span className={styles.rangeBarLabel}>
                    {(() => {
                      const curPrice = liveQuote.last_price ?? stock.price;
                      const pctFromLow = ((curPrice - liveQuote.week_52_low!) / (liveQuote.week_52_high! - liveQuote.week_52_low!)) * 100;
                      return `${Math.round(Math.max(0, Math.min(100, pctFromLow)))}% from low`;
                    })()}
                  </span>
                </div>
                <div className={styles.rangeBarTrack}>
                  <div
                    className={styles.rangeBarFill}
                    style={{
                      width: `${Math.max(2, Math.min(100, ((liveQuote.last_price ?? stock.price) - liveQuote.week_52_low!) / (liveQuote.week_52_high! - liveQuote.week_52_low!) * 100))}%`,
                    }}
                  />
                  <div
                    className={styles.rangeBarThumb}
                    style={{
                      left: `${Math.max(1, Math.min(99, ((liveQuote.last_price ?? stock.price) - liveQuote.week_52_low!) / (liveQuote.week_52_high! - liveQuote.week_52_low!) * 100))}%`,
                    }}
                  />
                </div>
                <div className={styles.rangeBarFooter}>
                  <span>{formatCurrency(liveQuote.week_52_low!, quoteCur)}</span>
                  <span className={styles.rangeBarCurrent}>{formatCurrency(liveQuote.last_price ?? stock.price, quoteCur)}</span>
                  <span>{formatCurrency(liveQuote.week_52_high!, quoteCur)}</span>
                </div>
              </div>
            )}

            <div className={styles.financialGrid}>
              {liveQuote.week_52_low != null && (
                <div className={styles.financialCard}>
                  <span className={styles.financialCardLabel}>52-Week Low</span>
                  <span className={styles.financialCardValue}>{formatCurrency(liveQuote.week_52_low, quoteCur)}</span>
                </div>
              )}
              {liveQuote.week_52_high != null && (
                <div className={styles.financialCard}>
                  <span className={styles.financialCardLabel}>52-Week High</span>
                  <span className={styles.financialCardValue}>{formatCurrency(liveQuote.week_52_high, quoteCur)}</span>
                </div>
              )}
              {liveQuote.previous_close != null && (
                <div className={styles.financialCard}>
                  <span className={styles.financialCardLabel}>Prev Close</span>
                  <span className={styles.financialCardValue}>{formatCurrency(liveQuote.previous_close, quoteCur)}</span>
                </div>
              )}
              {liveQuote.volume != null && (
                <div className={styles.financialCard}>
                  <span className={styles.financialCardLabel}>Volume</span>
                  <span className={styles.financialCardValue}>
                    {formatVolumeShorthand(liveQuote.volume, quoteCur)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <StockDetailTablesCollapsible
          ratioRows={ratioRowsForCollapsible}
          methodologyCaption={methodologyCaptionForCollapsible}
          methodologyRows={methodologyRowsForCollapsible}
        />

        {/* Tabbed Content: Compliance | Financials | Actions */}
        <StockTabs>
          {/* Tab 1: Compliance */}
          <div>
            <div className={styles.sectionHeading}>
              <h2 className={styles.sectionTitle}>Compliance check</h2>
              <p className={styles.sectionSub}>Green = safe, amber = close to limit, red = over the limit</p>
            </div>
            <div className={styles.financialGrid} style={{ marginBottom: 28 }}>
              {ratios.map((r) => {
                const pct = Math.min((r.value / r.max) * 100, 100);
                const thresholdPct = (r.threshold / r.max) * 100;
                return (
                  <div className={styles.financialCard} key={r.label}>
                    <div className={styles.financialCardHeader}>
                      <span className={styles.financialCardLabel}>{r.label}</span>
                    </div>
                    <span className={styles.financialCardValue}>{formatRatio(r.value)}</span>
                    <div className={styles.financialCardGauge} role="meter" aria-label={r.label} aria-valuenow={Math.round(r.value * 100)} aria-valuemin={0} aria-valuemax={Math.round(r.max * 100)}>
                      <div
                        className={`${styles.financialCardGaugeFill} ${ratioBarColor(r.value, r.threshold)}`}
                        style={{ width: `${pct}%` }}
                      />
                      <div className={styles.financialCardThreshold} style={{ left: `${thresholdPct}%` }} />
                    </div>
                    <div className={styles.financialCardFooter}>
                      <span>{r.desc.split(".")[0]}</span>
                      <span>Limit: {formatRatio(r.threshold)}</span>
                    </div>
                  </div>
                );
              })}
              {b.fixed_assets_to_total_assets_ratio != null && (
                <div className={styles.financialCard}>
                  <div className={styles.financialCardHeader}>
                    <span className={styles.financialCardLabel}>Fixed Assets / Total Assets</span>
                  </div>
                  <span className={styles.financialCardValue}>{formatRatio(b.fixed_assets_to_total_assets_ratio)}</span>
                  <div className={styles.financialCardGauge}>
                    <div
                      className={`${styles.financialCardGaugeFill} ${styles.ratioBarFillGood}`}
                      style={{ width: `${Math.min(b.fixed_assets_to_total_assets_ratio * 100, 100)}%` }}
                    />
                  </div>
                  <div className={styles.financialCardFooter}>
                    <span>Asset composition indicator</span>
                    <span>No hard threshold</span>
                  </div>
                </div>
              )}
            </div>

            {/* Screening Reasons */}
            <div className={pageStyles.featureGrid} style={{ marginBottom: 28 }}>
              <article className={pageStyles.featurePanel}>
                <div className={pageStyles.sectionHeader}>
                  <div>
                    <p className={pageStyles.kicker}>Screening rules</p>
                    <h3>Why it screened this way</h3>
                  </div>
                </div>
                <div className={pageStyles.reasonList}>
                  {reasons.map((reason) => {
                    const isPass = reason.toLowerCase().includes("passed all");
                    return (
                      <div className={pageStyles.reasonItem} key={reason}>
                        <span className={isPass ? pageStyles.reasonDotPass : pageStyles.reasonDot}>
                          {isPass ? "\u2713" : "\u2717"}
                        </span>
                        <p>{reason}</p>
                      </div>
                    );
                  })}
                </div>
              </article>


            </div>

            <div style={{
              marginTop: 16,
              padding: "12px 16px",
              borderRadius: "var(--radius-lg)",
              background: "var(--bg-soft)",
              border: "1px solid var(--line)",
              fontSize: "0.75rem",
              color: "var(--text-tertiary)",
              lineHeight: 1.6,
            }}>
              Screening results indicate whether this stock meets specific methodology criteria.
              They do not constitute a fatwa or religious ruling.
              Consult a qualified Shariah scholar for definitive guidance.{" "}
              <Link href="/methodology" style={{ color: "var(--emerald)", fontWeight: 600 }}>
                View methodology
              </Link>
            </div>
          </div>

          {/* Tab 2: Financials */}
          <div>
            <div className={styles.sectionHeading}>
              <h2 className={styles.sectionTitle}>Company financials</h2>
              <p className={styles.sectionSub}>The numbers used to check compliance</p>
            </div>
            <div className={styles.tableWrap} style={{ marginBottom: 28 }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th style={{ textAlign: "right" }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {financials.map((f) => (
                    <tr key={f.label}>
                      <td>{f.label}</td>
                      <td style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{f.value}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>Sector allowed</td>
                    <td style={{ textAlign: "right" }}>
                      <span className={`${styles.badge} ${b.sector_allowed ? styles.badgeHalal : styles.badgeFail}`}>
                        {b.sector_allowed ? "Yes" : "No"}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Data source</td>
                    <td style={{ textAlign: "right", color: "var(--text-muted)" }}>{stock.data_source}</td>
                  </tr>
                  <tr>
                    <td>Fundamentals updated</td>
                    <td style={{ textAlign: "right", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                      {formatFundamentalsAsOfLine(stock.fundamentals_updated_at) ?? (
                        <span style={{ fontStyle: "italic" }}>Not recorded — run your fundamentals sync (e.g. fetch_real_data)</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                      {fundamentalsUnitNote(cur)}{" "}
                      Fundamentals are derived from public market data (Yahoo Finance via our pipeline) and refreshed on a periodic schedule.
                      They are indicative and may lag; do not use as the sole basis for investment decisions.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>



          </div>

          {/* Tab 3: Research */}
          <div>
            <StockResearchSection
              complianceScore={complianceScore}
              passCount={passCount}
              warnCount={warnCount}
              failCount={failCount}
              peerComparison={peerComparison}
            />
          </div>

          {/* Tab 4: Actions */}
          <div>
            <div className={pageStyles.featureGrid} style={{ marginBottom: 28 }}>
              <article className={pageStyles.featurePanel}>
                <div className={pageStyles.sectionHeader}>
                  <div>
                    <p className={pageStyles.kicker}>Research Notes</p>
                    <h3>Record your reasoning</h3>
                  </div>
                </div>
                <ResearchNoteForm portfolioId={primaryPortfolioId} symbol={stock.symbol} />
              </article>
            </div>
          </div>
        </StockTabs>

        {/* Similar Stocks */}
        {similarStocks.length > 0 && (
          <>
            <div className={styles.sectionHeading} style={{ marginTop: 12 }}>
              <h2 className={styles.sectionTitle}>Similar stocks</h2>
              <p className={styles.sectionSub}>
                {sameSecStocks.length > 0 ? `Other stocks in ${stock.sector}` : "Other stocks to explore"}
              </p>
            </div>
            <SimilarStocksQuotes peers={similarStocks} peerComparison={peerComparison} />
          </>
        )}
      </div>
    </main>
  );
}

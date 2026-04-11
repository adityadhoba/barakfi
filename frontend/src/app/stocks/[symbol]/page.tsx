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
  getComplianceHistory,
  getEquityQuote,
  getInvestmentMetrics,
  getMultiScreeningResult,
  getScreeningResult,
  getStock,
  getStocks,
  type ScreeningResult,
} from "@/lib/api";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PriceChart } from "@/components/price-chart";
import { ShareButton } from "@/components/share-button";
import { StockTabs } from "@/components/stock-tabs";
import { AdUnit } from "@/components/ad-unit";
import { StockLogo } from "@/components/stock-logo";
import { MethodologyComparison } from "@/components/methodology-comparison";
import { ComplianceRating } from "@/components/compliance-rating";
import { ComplianceTimeline } from "@/components/compliance-timeline";
import { InvestmentGauge } from "@/components/investment-gauge";
import { CountryBadge } from "@/components/country-badge";

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
  CAUTIOUS: "Cautious",
  NON_COMPLIANT: "Non-Compliant",
};
const STATUS_HERO: Record<string, string> = {
  HALAL: "halal",
  CAUTIOUS: "review",
  NON_COMPLIANT: "fail",
};

const CONFIDENCE_ICONS: Record<string, string> = {
  success: "✔",
  warning: "⚠",
  error: "✖",
};

/** Order matches backend `ALL_PROFILE_CODES` (halal_service.PROFILES). */
const METHODOLOGY_CODES = ["sp_shariah", "aaoifi", "ftse_maxis"] as const;

const METHODOLOGY_LABEL: Record<(typeof METHODOLOGY_CODES)[number], string> = {
  sp_shariah: "S&P Shariah",
  aaoifi: "AAOIFI",
  ftse_maxis: "FTSE Yasaar",
};

/** Curated “popular” tickers for “People also checked” (merged with live screening when available). */
const PEOPLE_ALSO_SYMBOLS = [
  "RELIANCE",
  "TCS",
  "INFY",
  "HDFCBANK",
  "ITC",
  "ICICIBANK",
  "SBIN",
  "BHARTIARTL",
] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function formatMcap(value: number) {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(0)} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)} L`;
  return formatCurrency(value);
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

  const [stock, screening, watchlist, workspace, liveQuote, allStocks, multiScreening, complianceHistory, investmentMetrics] = await Promise.all([
    getStock(symbol),
    getScreeningResult(symbol),
    token ? getAuthenticatedWatchlist(token, actor).catch(() => []) : Promise.resolve([]),
    token ? getAuthenticatedWorkspace(token, actor).catch(() => null) : Promise.resolve(null),
    getEquityQuote(symbol, "auto_india"),
    getStocks(),
    getMultiScreeningResult(symbol).catch(() => null),
    getComplianceHistory(symbol),
    getInvestmentMetrics(symbol),
  ]);

  if (!stock || !screening) notFound();

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

  const financials = [
    { label: "Market Cap", value: formatMcap(stock.market_cap) },
    { label: "36M Avg Market Cap", value: formatMcap(stock.average_market_cap_36m) },
    { label: "Revenue", value: formatCurrency(stock.revenue) },
    { label: "Total Business Income", value: formatCurrency(stock.total_business_income) },
    { label: "Interest Income", value: formatCurrency(stock.interest_income) },
    { label: "Non-permissible Income", value: formatCurrency(stock.non_permissible_income) },
    { label: "Total Debt", value: formatCurrency(stock.debt) },
    { label: "Accounts Receivable", value: formatCurrency(stock.accounts_receivable) },
    { label: "Fixed Assets", value: formatCurrency(stock.fixed_assets) },
    { label: "Total Assets", value: formatCurrency(stock.total_assets) },
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

  const curSymU = stock.symbol.toUpperCase();
  const popularOrdered = PEOPLE_ALSO_SYMBOLS.filter((s) => s !== curSymU);
  const topByMcapSymbols = allStocks
    .filter((s) => s.symbol.toUpperCase() !== curSymU)
    .sort((a, b) => b.market_cap - a.market_cap)
    .slice(0, 12)
    .map((s) => s.symbol);
  const peoplePickPool = [...new Set([...popularOrdered, ...topByMcapSymbols])].slice(0, 16);
  const peerSyms = similarStocks.map((s) => s.symbol);
  const mergedScreenSyms = [...new Set([...peerSyms, ...peoplePickPool])];
  const mergedScreenings =
    mergedScreenSyms.length > 0
      ? await getBulkScreeningResults(mergedScreenSyms).catch(() => [])
      : [];

  const peerScreenings = peerSyms.length
    ? peerSyms
        .map((sym) =>
          mergedScreenings.find((r) => r.symbol.toUpperCase() === sym.toUpperCase())
        )
        .filter((x): x is ScreeningResult => x != null)
    : [];

  const peopleBulk = mergedScreenings;

  const scoreFromScreening = (sc: ScreeningResult) => {
    const bb = sc.breakdown;
    return calculateComplianceScore(
      bb.debt_to_36m_avg_market_cap_ratio,
      bb.debt_to_market_cap_ratio,
      bb.non_permissible_income_ratio,
      bb.interest_income_ratio,
      bb.receivables_to_market_cap_ratio,
      bb.cash_and_interest_bearing_to_assets_ratio
    );
  };

  const peopleAlsoChecked: Array<{ symbol: string; name: string; status: string; score: number }> = [];
  const pushPeopleAlso = (sym: string) => {
    if (peopleAlsoChecked.length >= 5) return;
    const su = sym.toUpperCase();
    const sc = peopleBulk.find((r) => r.symbol.toUpperCase() === su);
    const row = allStocks.find((s) => s.symbol.toUpperCase() === su);
    if (!sc || !row) return;
    if (peopleAlsoChecked.some((p) => p.symbol === row.symbol)) return;
    peopleAlsoChecked.push({
      symbol: row.symbol,
      name: row.name,
      status: sc.status,
      score: scoreFromScreening(sc),
    });
  };
  for (const s of popularOrdered) pushPeopleAlso(s);
  for (const s of topByMcapSymbols) pushPeopleAlso(s);

  // Calculate compliance score
  const complianceScore = calculateComplianceScore(
    b.debt_to_36m_avg_market_cap_ratio,
    b.debt_to_market_cap_ratio,
    b.non_permissible_income_ratio,
    b.interest_income_ratio,
    b.receivables_to_market_cap_ratio,
    b.cash_and_interest_bearing_to_assets_ratio
  );

  const confidenceBullets = screening.confidence_bullets ?? [];

  const consensusSummary = multiScreening?.summary;
  const methodologyIcons =
    consensusSummary && multiScreening?.methodologies
      ? METHODOLOGY_CODES.map((code) => {
          const st = multiScreening.methodologies[code]?.status;
          const passed = st === "HALAL";
          return {
            code,
            label: METHODOLOGY_LABEL[code],
            passed,
            status: st ?? "—",
          };
        })
      : null;

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
              <span className={styles.stockMetaChip}>{stock.country}</span>
            </div>
            <div className={styles.stockTitleRow}>
              <StockLogo symbol={stock.symbol} size={44} status={screening.status} />
              <div>
                <h1 className={styles.stockTitle}>{stock.name}</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className={`${styles.badge} ${styles[STATUS_BADGE[screening.status] || "badgeReview"]}`}>
                    {STATUS_LABELS[screening.status] || screening.status}
                  </span>
                  <ComplianceRating rating={(screening as unknown as Record<string, unknown>).compliance_rating as number | null} size={16} />
                  <CountryBadge exchange={stock.exchange} size="md" />
                </div>
              </div>
            </div>
            <div className={styles.stockMeta}>
              <span className={styles.stockPrice}>
                {formatCurrency(liveQuote?.last_price ?? stock.price)}
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
                  <span className={styles.quoteChangeUp}>&Delta; {formatCurrency(liveQuote.change)}</span>
                )}
                {" · "}
                Day {liveQuote.day_low != null && liveQuote.day_high != null
                  ? `${formatCurrency(liveQuote.day_low)} – ${formatCurrency(liveQuote.day_high)}`
                  : "range n/a"}
                {liveQuote.volume != null && (
                  <>
                    {" · "}
                    Vol {(liveQuote.volume / 1e5).toFixed(1)}L
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
          <div className={styles.verdictTop}>
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
          {consensusSummary && (
            <div className={styles.verdictConsensus} role="status">
              <span>
                Consensus: {consensusSummary.halal_count} of {consensusSummary.total} standards passed
              </span>
              {methodologyIcons && methodologyIcons.length > 0 && (
                <span className={styles.verdictConsensusIcons} aria-hidden="true">
                  {methodologyIcons.map(({ code, label, passed, status }) => (
                    <span
                      key={code}
                      className={styles.verdictConsensusIcon}
                      title={`${label}: ${status}`}
                    >
                      {passed ? "✔" : "✖"}
                    </span>
                  ))}
                </span>
              )}
            </div>
          )}
          {confidenceBullets.length > 0 && (
            <ul className={styles.confidenceBullets} aria-label="Why this screening result">
              {confidenceBullets.map((bullet, idx) => (
                <li key={idx} className={styles.confidenceBullet}>
                  <span className={styles.confidenceIcon} aria-hidden>
                    {CONFIDENCE_ICONS[bullet.tone] ?? "•"}
                  </span>
                  <span className={styles.confidenceText}>{bullet.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className={styles.retentionHint}>
          Halal status may change based on financial updates. Check regularly.
        </p>

        <div className={styles.resultNextSteps} role="navigation" aria-label="Next steps">
          <Link
            href="/screener#stock-search"
            className={`${styles.resultNextStepBtn} ${styles.resultNextStepGhost}`}
          >
            Check another stock
          </Link>
          <Link
            href="/screener?status=HALAL"
            className={`${styles.resultNextStepBtn} ${styles.resultNextStepPrimary}`}
          >
            Explore top halal stocks
          </Link>
        </div>

        {peopleAlsoChecked.length > 0 && (
          <section className={styles.peopleAlsoSection} aria-labelledby="people-also-heading">
            <h2 id="people-also-heading" className={styles.peopleAlsoTitle}>
              People also checked
            </h2>
            <div className={styles.peopleAlsoGrid}>
              {peopleAlsoChecked.map((item) => (
                <Link
                  key={item.symbol}
                  href={`/stocks/${encodeURIComponent(item.symbol)}`}
                  className={styles.peopleAlsoCard}
                >
                  <div className={styles.peopleAlsoCardTop}>
                    <StockLogo symbol={item.symbol} size={36} status={item.status} />
                    <div className={styles.peopleAlsoIdentity}>
                      <span className={styles.peopleAlsoName}>{item.name}</span>
                      <span className={styles.peopleAlsoSymbol}>{item.symbol}</span>
                    </div>
                  </div>
                  <div className={styles.peopleAlsoMeta}>
                    <div className={styles.peopleAlsoScoreWrap}>
                      <span className={styles.peopleAlsoScore}>{item.score}</span>
                      <span className={styles.peopleAlsoScoreSuffix}>/100</span>
                    </div>
                    <span
                      className={`${styles.badge} ${styles[STATUS_BADGE[item.status] || "badgeReview"]}`}
                    >
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Key Metrics Strip */}
        <div className={styles.keyMetricsStrip}>
          <div className={styles.keyMetricCard}>
            <span className={styles.keyMetricLabel}>Market Cap</span>
            <span className={styles.keyMetricValue}>{formatMcap(stock.market_cap)}</span>
          </div>
          <div className={styles.keyMetricCard}>
            <span className={styles.keyMetricLabel}>Revenue</span>
            <span className={styles.keyMetricValue}>{formatMcap(stock.revenue)}</span>
          </div>
          <div className={styles.keyMetricCard}>
            <span className={styles.keyMetricLabel}>Total Debt</span>
            <span className={styles.keyMetricValue}>{formatMcap(stock.debt)}</span>
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
                {stock.market_cap >= 100000 ? "Large Cap" : stock.market_cap >= 20000 ? "Mid Cap" : "Small Cap"} &rsaquo;
              </span>
              <span className={styles.categorySub}>
                Market cap of {formatMcap(stock.market_cap)}
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
          <PriceChart symbol={stock.symbol} />
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
                  <span>{formatCurrency(liveQuote.week_52_low!)}</span>
                  <span className={styles.rangeBarCurrent}>{formatCurrency(liveQuote.last_price ?? stock.price)}</span>
                  <span>{formatCurrency(liveQuote.week_52_high!)}</span>
                </div>
              </div>
            )}

            <div className={styles.financialGrid}>
              {liveQuote.week_52_low != null && (
                <div className={styles.financialCard}>
                  <span className={styles.financialCardLabel}>52-Week Low</span>
                  <span className={styles.financialCardValue}>{formatCurrency(liveQuote.week_52_low)}</span>
                </div>
              )}
              {liveQuote.week_52_high != null && (
                <div className={styles.financialCard}>
                  <span className={styles.financialCardLabel}>52-Week High</span>
                  <span className={styles.financialCardValue}>{formatCurrency(liveQuote.week_52_high)}</span>
                </div>
              )}
              {liveQuote.previous_close != null && (
                <div className={styles.financialCard}>
                  <span className={styles.financialCardLabel}>Prev Close</span>
                  <span className={styles.financialCardValue}>{formatCurrency(liveQuote.previous_close)}</span>
                </div>
              )}
              {liveQuote.volume != null && (
                <div className={styles.financialCard}>
                  <span className={styles.financialCardLabel}>Volume</span>
                  <span className={styles.financialCardValue}>
                    {liveQuote.volume >= 1e7
                      ? `${(liveQuote.volume / 1e7).toFixed(2)} Cr`
                      : `${(liveQuote.volume / 1e5).toFixed(1)} L`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Multi-Methodology Comparison */}
        {multiScreening && (
          <MethodologyComparison data={multiScreening} />
        )}

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
                </tbody>
              </table>
            </div>

            {/* Investment Metrics */}
            <div className={styles.sectionHeading} style={{ marginTop: 24 }}>
              <h2 className={styles.sectionTitle}>Investment Checklist</h2>
              <p className={styles.sectionSub}>Key investment metrics for this stock</p>
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 16, padding: 20, background: "var(--bg-elevated)",
              borderRadius: "var(--radius-xl)", border: "1px solid var(--line)", marginBottom: 28,
            }}>
              <InvestmentGauge label="Expected Return" value={investmentMetrics.expected_return} suffix="%" min={-20} max={40} thresholds={{ good: 10, warn: 0 }} />
              <InvestmentGauge label="Volatility" value={investmentMetrics.volatility} suffix="%" min={0} max={60} thresholds={{ good: 20, warn: 35 }} />
              <InvestmentGauge label="Sharpe Ratio" value={investmentMetrics.sharpe_ratio} min={-1} max={3} thresholds={{ good: 1, warn: 0.5 }} />
              <InvestmentGauge label="Beta" value={investmentMetrics.beta} min={0} max={2} thresholds={{ good: 0.8, warn: 1.2 }} />
              <InvestmentGauge label="Div Yield" value={investmentMetrics.dividend_yield} suffix="%" min={0} max={8} thresholds={{ good: 2, warn: 1 }} />
              <InvestmentGauge label="P/E Ratio" value={investmentMetrics.pe_ratio} min={0} max={60} thresholds={{ good: 20, warn: 30 }} />
            </div>

            {/* Compliance History */}
            <div className={styles.sectionHeading} style={{ marginTop: 24 }}>
              <h2 className={styles.sectionTitle}>Compliance History</h2>
              <p className={styles.sectionSub}>Status changes over time</p>
            </div>
            <div style={{
              padding: 20, background: "var(--bg-elevated)",
              borderRadius: "var(--radius-xl)", border: "1px solid var(--line)",
            }}>
              <ComplianceTimeline history={complianceHistory} />
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
            <div className={styles.similarGrid}>
              {similarStocks.map((s, idx) => {
                const peerData = peerComparison[idx];
                const peerQuote = liveQuote; // Note: in production, you'd fetch quotes for all peers
                return (
                  <Link className={styles.similarCard} href={`/stocks/${s.symbol}`} key={s.symbol}>
                    <div className={styles.similarCardTop}>
                      <StockLogo symbol={s.symbol} size={34} status={peerData?.status} />
                      <div className={styles.similarIdentity}>
                        <span className={styles.similarSymbol}>{s.symbol}</span>
                        <span className={styles.similarName}>{s.name}</span>
                      </div>
                      {peerData && (
                        <span className={`${styles.badge} ${styles[STATUS_BADGE[peerData.status] || "badgeReview"]} ${styles.similarBadge}`}>
                          {STATUS_LABELS[peerData.status] || peerData.status}
                        </span>
                      )}
                    </div>
                    <div className={styles.similarCardBottom}>
                      <div>
                        <span className={styles.similarPrice}>{formatCurrency(s.price)}</span>
                        {peerQuote?.change_percent != null && (
                          <span className={peerQuote.change_percent >= 0 ? styles.quoteChangeUp : styles.quoteChangeDown} style={{ fontSize: "0.75rem", marginLeft: 4 }}>
                            {peerQuote.change_percent >= 0 ? "+" : ""}
                            {peerQuote.change_percent.toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <span className={styles.similarMcap}>{formatMcap(s.market_cap)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

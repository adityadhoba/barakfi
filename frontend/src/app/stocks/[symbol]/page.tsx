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
  type ScreeningResult,
  type WorkspaceBundle,
} from "@/lib/api";
import {
  fetchMultiScreeningForPage,
  fetchStockAndScreenForPage,
  fetchStockMetadataBundle,
} from "@/lib/stock-detail-fetch";
import { StockDetailError } from "@/components/stock-detail-error";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PriceChart } from "@/components/price-chart";
import { SimilarStocksQuotes } from "@/components/similar-stocks-quotes";
import { ShareButton } from "@/components/share-button";
import { StockTabs } from "@/components/stock-tabs";
import { StockLogo } from "@/components/stock-logo";
import { StockDetailTablesCollapsible } from "@/components/stock-detail-tables-collapsible";
import { ScreeningExplainerCards } from "@/components/screening-explainer-cards";
import { StockUpsellCard } from "@/components/stock-upsell-card";
import { StockVerdictGate } from "@/components/stock-verdict-gate";
import { LockedVerdict } from "@/components/locked-verdict";
import { RatioReadMoreDrawer } from "@/components/ratio-read-more-drawer";
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
  formatFundamentalsLastUpdatedIst,
  fundamentalsUnitNote,
} from "@/lib/fundamentals-format";
import {
  SCREENING_LEGAL_DISCLAIMER,
  screeningDiscoveryLabel,
  screeningUiLabel,
} from "@/lib/screening-status";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  const sym = decodeURIComponent(symbol).toUpperCase();
  const bundle = await fetchStockMetadataBundle(sym);
  if (!bundle) {
    return {
      title: `${sym} — Shariah screening`,
      description:
        `See whether ${sym} is Shariah Compliant, Requires Review, or Not Compliant under Shariah financial screening for NSE/BSE-listed Indian equities. BarakFi explains debt, non-permissible income, interest income, and other ratios used in compliance checks.`,
      robots: { index: true, follow: true },
    };
  }
  const { stock, statusLabel } = bundle;
  const title = `Is ${stock.name} Halal? Shariah compliance (${stock.symbol}) | BarakFi`;
  const description =
    `Check halal stock status for ${stock.name} (${stock.symbol}) on ${stock.exchange} using Shariah stock screening: current classification ${statusLabel}, with debt, revenue, interest income, and asset ratios compared to widely used Islamic finance benchmarks. Updated when fundamentals sync runs; educational context only.`;
  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: `https://barakfi.in/stocks/${encodeURIComponent(stock.symbol)}` },
    openGraph: {
      title,
      description,
      url: `https://barakfi.in/stocks/${encodeURIComponent(stock.symbol)}`,
      siteName: "BarakFi",
      locale: "en_IN",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

const STATUS_BADGE: Record<string, string> = {
  HALAL: "badgeHalal",
  CAUTIOUS: "badgeReview",
  NON_COMPLIANT: "badgeFail",
};

const CONFIDENCE_ICONS: Record<string, string> = {
  success: "✔",
  warning: "⚠",
  error: "✖",
};

/** Order matches backend `ALL_PROFILE_CODES` (halal_service.PROFILES). */
const METHODOLOGY_CODES = ["sp_shariah", "aaoifi", "ftse_maxis", "khatkhatay"] as const;

const METHODOLOGY_LABEL: Record<(typeof METHODOLOGY_CODES)[number], string> = {
  sp_shariah: "S&P Shariah",
  aaoifi: "AAOIFI",
  ftse_maxis: "FTSE Yasaar",
  khatkhatay: "Khatkhatay norms",
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
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: cur,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
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
    return "This stock passes all Shariah rules. Check the numbers below for the detailed breakdown.";
  }
  if (status === "NON_COMPLIANT") {
    return `This stock doesn't meet ${reasons.length} Shariah rule${reasons.length > 1 ? "s" : ""}. See below to understand why.`;
  }
  if (flags.length > 0) {
    return "We can't fully confirm this stock yet — it needs a manual check by a scholar or compliance expert.";
  }
  return "This stock is cautious: we can't yet fully confirm whether it is compliant or not.";
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
  const normalizedSymbol = decodeURIComponent(symbol).trim().toUpperCase();
  if (!normalizedSymbol || normalizedSymbol === "COMPANY" || normalizedSymbol === "SYMBOL") {
    notFound();
  }
  const authState = await auth();
  const clerkUser = await currentUser();
  const token = await authState.getToken();
  const actor =
    clerkUser && token
      ? { authSubject: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress || null }
      : null;

  const [detail, watchlist, allStocks, multiScreening] = await Promise.all([
    fetchStockAndScreenForPage(normalizedSymbol),
    token ? getAuthenticatedWatchlist(token, actor).catch(() => []) : Promise.resolve([]),
    getStocks().catch(() => []),
    fetchMultiScreeningForPage(normalizedSymbol),
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
  if (detail.kind === "redirect") {
    redirect(`/stocks/${encodeURIComponent(detail.targetSymbol)}`);
  }
  if (detail.kind === "legacy_blocked") {
    return (
      <StockDetailError
        message={`${detail.stock.name} (${detail.stock.symbol}) is no longer an active screening symbol. ${detail.message}${
          detail.stock.canonical_symbol
            ? ` Use ${detail.stock.canonical_symbol} for the current listing.`
            : ""
        }`}
      />
    );
  }
  if (detail.kind === "error") {
    return <StockDetailError message={detail.message} />;
  }

  const { stock, screening } = detail;

  const liveQuote = sanitizeEquityQuote(
    await getEquityQuote(stock.symbol, "auto_india", stock.exchange).catch(() => null)
  );

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
  const fundamentalsLastUpdated =
    formatFundamentalsLastUpdatedIst(stock.fundamentals_updated_at) ?? "Not synced yet";
  const displayCountry = displayCountryForStock(stock.exchange, stock.country);
  const marketCapTier = capTierLabel(stock.market_cap, cur);
  const riskLabel =
    b.debt_to_36m_avg_market_cap_ratio <= 0.15
      ? "Low Risk"
      : b.debt_to_36m_avg_market_cap_ratio <= 0.25
        ? "Medium Risk"
        : "Higher Risk";
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
    if (typeof sc.screening_score === "number") return sc.screening_score;
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

  const lastUpdatedIso =
    stock.fundamentals_updated_at != null && stock.fundamentals_updated_at !== ""
      ? new Date(stock.fundamentals_updated_at).toISOString()
      : undefined;

  /* ── JSON-LD: FinancialProduct + FAQPage for rich results ── */
  const jsonLdProduct = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: `${stock.name} (${stock.symbol})`,
    description: `Shariah compliance view for ${stock.name} on ${stock.exchange}: ${screeningUiLabel(screening.status)}. Uses financial ratios and methodology checks.`,
    url: `https://barakfi.in/stocks/${encodeURIComponent(stock.symbol)}`,
    brand: { "@type": "Brand", name: "BarakFi" },
    provider: {
      "@type": "Organization",
      name: "BarakFi",
      url: "https://barakfi.in",
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "complianceStatus",
        value: screeningUiLabel(screening.status),
      },
      {
        "@type": "PropertyValue",
        name: "complianceScore",
        value: String(complianceScore),
      },
      ...(lastUpdatedIso
        ? [{ "@type": "PropertyValue", name: "lastUpdated", value: lastUpdatedIso }]
        : []),
      { "@type": "PropertyValue", name: "exchange", value: stock.exchange },
      { "@type": "PropertyValue", name: "sector", value: stock.sector },
      ...(stock.data_quality
        ? [{ "@type": "PropertyValue", name: "dataQuality", value: stock.data_quality }]
        : []),
      ...(stock.fundamentals_fields_missing && stock.fundamentals_fields_missing.length > 0
        ? [
            {
              "@type": "PropertyValue",
              name: "fundamentalsFieldsMissing",
              value: stock.fundamentals_fields_missing.join(", "),
            },
          ]
        : []),
    ],
  };

  const statusUiWord = screeningUiLabel(screening.status);
  const statusDiscoveryWord = screeningDiscoveryLabel(screening.status);
  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What is ${stock.name}'s Shariah compliance status?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `BarakFi classifies this listing as ${statusUiWord} under automated Shariah-style financial screening (${stock.exchange}). ${SCREENING_LEGAL_DISCLAIMER}`,
        },
      },
      {
        "@type": "Question",
        name: `Why is ${stock.symbol} considered ${statusDiscoveryWord}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${reasons.join(" ")} See key ratios and methodology on this page.`,
        },
      },
      {
        "@type": "Question",
        name: "When was this screening last updated?",
        acceptedAnswer: {
          "@type": "Answer",
          text: lastUpdatedIso
            ? `Fundamentals timestamp in our system: ${lastUpdatedIso}. Prices may refresh more often.`
            : "We do not have a fundamentals sync timestamp for this row yet; ratios may lag.",
        },
      },
    ],
  };

  const readMorePanel = (
    <div className={styles.readMoreCard}>
      <details className={styles.readMoreDetails}>
        <summary className={styles.readMoreSummary}>Read more</summary>
        <div className={styles.readMoreBody}>
          <section className={styles.seoArticle} aria-labelledby="why-status-heading">
            <h2 id="why-status-heading" className={styles.sectionTitle}>
              Why is this stock {statusUiWord}?
            </h2>
            <p className={styles.seoProse}>
              {takeaway} BarakFi applies transparent financial tests inspired by widely cited
              Shariah equity standards (for example S&amp;P Shariah-style debt and income screens,
              AAOIFI-style balance-sheet tests, and related ratio work). Sector activity is also
              checked for obvious non-permissible business lines. This page shows the outcome for{" "}
              <strong>{stock.name}</strong> ({stock.symbol}) on <strong>{stock.exchange}</strong>{" "}
              using numbers stored in our database — use this as a research input alongside
              qualified guidance.
            </p>
            {stock.data_quality && (
              <p className={styles.seoProse}>
                <strong>Data quality:</strong>{" "}
                {stock.data_quality === "high"
                  ? "High"
                  : stock.data_quality === "medium"
                    ? "Medium"
                    : "Low"}
                — indicates how complete the fundamentals are for ratio screening. Source:{" "}
                {stock.data_source}.
                {stock.fundamentals_fields_missing &&
                stock.fundamentals_fields_missing.length > 0 ? (
                  <>
                    {" "}
                    <strong>Missing or zero inputs:</strong>{" "}
                    {stock.fundamentals_fields_missing.join(", ")} — treat nearby ratio thresholds
                    as less certain until filings populate those lines.
                  </>
                ) : null}
              </p>
            )}
          </section>

          <section className={styles.seoArticle} aria-labelledby="key-ratios-heading">
            <h2 id="key-ratios-heading" className={styles.sectionTitle}>
              Key financial ratios
            </h2>
            <p className={styles.seoProse}>
              The strip below summarizes debt versus market cap, non-permissible income,
              interest-related income, cash and interest-bearing balances, and receivables — the
              same families of ratios many Islamic index providers use in different forms. Expand
              the detailed tables for exact numerators and denominators used on this listing.
            </p>
          </section>

          <section className={styles.seoArticle} aria-labelledby="breakdown-heading">
            <h2 id="breakdown-heading" className={styles.sectionTitle}>
              Shariah screening breakdown
            </h2>
            <p className={styles.seoProse}>
              Use the <strong>Compliance</strong> tab for per-ratio gauges, the{" "}
              <strong>Financials</strong> tab for raw inputs, and the methodology comparison (where
              available) to see how {stock.name} performs across multiple reference styles. If you
              are new to these concepts, start with our{" "}
              <Link href="/learn/what-is-halal-investing">guide to halal stock screening concepts</Link> or{" "}
              <Link href="/learn/halal-stocks-india">halal stocks in India</Link> guide.
            </p>
          </section>

          <section className={styles.seoArticle} aria-labelledby="conclusion-heading">
            <h2 id="conclusion-heading" className={styles.sectionTitle}>
              Conclusion
            </h2>
            <p className={styles.seoProse}>
              For <strong>{stock.name}</strong>, the automated label is <strong>{statusUiWord}</strong>{" "}
              with a compliance-style score of <strong>{complianceScore}</strong> out of 100 on the
              primary profile shown on this page. Re-run your checks after major results or
              restructuring events, and align your research process with your values and qualified guidance.
            </p>
          </section>

          <section className={styles.seoArticle} aria-labelledby="learn-more-stock">
            <h2 id="learn-more-stock" className={styles.sectionTitle}>
              Learn more
            </h2>
            <ul className={styles.seoLinkList}>
              <li>
                <Link href="/learn/halal-stocks-india">
                  Halal stocks in India — how screening works on NSE &amp; BSE
                </Link>
              </li>
              <li>
                <Link href="/learn/top-halal-stocks-india">
                  Examples of large Indian names investors often ask about
                </Link>
              </li>
              {stock.symbol.toUpperCase() === "RELIANCE" && (
                <li>
                  <Link href="/learn/is-reliance-halal">Is Reliance halal? — context article</Link>
                </li>
              )}
              <li>
                <Link href="/methodology">Full methodology reference</Link>
              </li>
            </ul>
          </section>

          <section className={styles.seoArticle} aria-labelledby="faq-heading">
            <h2 id="faq-heading" className={styles.sectionTitle}>
              Frequently asked questions
            </h2>
            <dl className={styles.seoFaq}>
              <dt>What is {stock.name}&apos;s current compliance status?</dt>
              <dd>
                Our engine shows <strong>{statusUiWord}</strong> based on financial ratios and sector
                rules. This page is for educational screening and research context.
              </dd>
              <dt>Why is it considered {statusUiWord}?</dt>
              <dd>{reasons.join(" ")}</dd>
              <dt>When was this last updated?</dt>
              <dd>
                {formatFundamentalsAsOfLine(stock.fundamentals_updated_at) ??
                  "We do not yet show a fundamentals sync timestamp for this company in our database."}{" "}
                Market prices may update more frequently than filing-based ratios.
              </dd>
            </dl>
          </section>
        </div>
      </details>
    </div>
  );

  return (
    <main className={`${styles.screenerPage} ${styles.screenerPageFlow}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
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
              <StockLogo symbol={stock.symbol} size={44} exchange={stock.exchange} />
              <div>
                <h1 className={styles.stockTitle}>Is {stock.name} Halal?</h1>
                <p className={styles.stockMetaLine} style={{ margin: "6px 0 0", fontSize: "0.95rem", color: "var(--text-secondary)" }}>
                  {stock.symbol} · {stock.exchange} · {stock.sector}
                </p>
                <StockVerdictGate symbol={stock.symbol} mode="inline">
                  <span className={`${styles.badge} ${styles[STATUS_BADGE[screening.status] || "badgeReview"]}`}>
                    {statusUiWord}
                  </span>
                </StockVerdictGate>
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
                text={`Check out ${stock.name} on Barakfi — ${statusUiWord}`}
              />
            </div>
          </div>
          <StockVerdictGate symbol={stock.symbol} mode="hidden">
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
            <div className={styles.heroRiskCard}>
              <span className={styles.heroRiskEyebrow}>Risk analysis</span>
              <strong className={styles.heroRiskTitle}>{riskLabel}</strong>
              <span className={styles.heroRiskSub}>
                Debt ratio {formatRatio(b.debt_to_36m_avg_market_cap_ratio)} against the 33% screen.
              </span>
            </div>
          </div>
          </StockVerdictGate>
        </div>

        <StockVerdictGate symbol={stock.symbol}>
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
                    {statusUiWord}
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
            Screening status may change based on financial updates. Check regularly.
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
              Explore compliant stocks
            </Link>
          </div>

          <div className={styles.stockDetailMain}>
            {liveQuote &&
            (liveQuote.week_52_low != null ||
              liveQuote.week_52_high != null ||
              liveQuote.previous_close != null ||
              liveQuote.volume != null) ? (
              <div className={styles.financialGrid} style={{ marginBottom: 28 }}>
                {liveQuote.week_52_low != null && (
                  <div className={styles.financialCard}>
                    <span className={styles.financialCardLabel}>52-Week Low</span>
                    <span className={styles.financialCardValue}>
                      {formatCurrency(liveQuote.week_52_low, quoteCur)}
                    </span>
                  </div>
                )}
                {liveQuote.week_52_high != null && (
                  <div className={styles.financialCard}>
                    <span className={styles.financialCardLabel}>52-Week High</span>
                    <span className={styles.financialCardValue}>
                      {formatCurrency(liveQuote.week_52_high, quoteCur)}
                    </span>
                  </div>
                )}
                {liveQuote.previous_close != null && (
                  <div className={styles.financialCard}>
                    <span className={styles.financialCardLabel}>Prev Close</span>
                    <span className={styles.financialCardValue}>
                      {formatCurrency(liveQuote.previous_close, quoteCur)}
                    </span>
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
                {liveQuote.week_52_low != null &&
                liveQuote.week_52_high != null &&
                liveQuote.week_52_high > liveQuote.week_52_low ? (
                  <div className={styles.rangeBarSection}>
                    <div className={styles.rangeBarHeader}>
                      <span className={styles.rangeBarLabel}>52-Week Range</span>
                      <span className={styles.rangeBarLabel}>
                        {(() => {
                          const curPrice = liveQuote.last_price ?? stock.price;
                          const pctFromLow =
                            ((curPrice - liveQuote.week_52_low) /
                              (liveQuote.week_52_high - liveQuote.week_52_low)) *
                            100;
                          return `${Math.round(Math.max(0, Math.min(100, pctFromLow)))}% from low`;
                        })()}
                      </span>
                    </div>
                    <div className={styles.rangeBarTrack}>
                      <div
                        className={styles.rangeBarFill}
                        style={{
                          width: `${Math.max(
                            2,
                            Math.min(
                              100,
                              ((liveQuote.last_price ?? stock.price) - liveQuote.week_52_low) /
                                (liveQuote.week_52_high - liveQuote.week_52_low) *
                                100,
                            ),
                          )}%`,
                        }}
                      />
                      <div
                        className={styles.rangeBarThumb}
                        style={{
                          left: `${Math.max(
                            1,
                            Math.min(
                              99,
                              ((liveQuote.last_price ?? stock.price) - liveQuote.week_52_low) /
                                (liveQuote.week_52_high - liveQuote.week_52_low) *
                                100,
                            ),
                          )}%`,
                        }}
                      />
                    </div>
                    <div className={styles.rangeBarFooter}>
                      <span>{formatCurrency(liveQuote.week_52_low, quoteCur)}</span>
                      <span className={styles.rangeBarCurrent}>
                        {formatCurrency(liveQuote.last_price ?? stock.price, quoteCur)}
                      </span>
                      <span>{formatCurrency(liveQuote.week_52_high, quoteCur)}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div style={{ marginBottom: 28 }}>
              <PriceChart
                symbol={stock.symbol}
                exchange={stock.exchange}
                liveClose={liveQuote?.last_price ?? stock.price}
                currentPrice={liveQuote?.last_price ?? stock.price}
                currency={quoteCur}
                week52Low={liveQuote?.week_52_low}
                week52High={liveQuote?.week_52_high}
              />
            </div>

            <div className={styles.keyMetricsStrip}>
              <div className={styles.keyMetricCard}>
                <span className={styles.keyMetricLabel}>Market Cap</span>
                <span className={styles.keyMetricValue}>{formatFundamentalAmount(stock.market_cap, cur)}</span>
                <span className={styles.keyMetricSubvalue}>{marketCapTier}</span>
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
                <span className={styles.keyMetricLabel}>Non-halal Income</span>
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

            <ScreeningExplainerCards
              breakdown={b}
              debtValue={stock.debt}
              debtDenominator={stock.average_market_cap_36m}
              cashIbValue={stock.cash_and_equivalents + stock.short_term_investments}
              cashIbDenominator={stock.total_assets}
              nonPermValue={stock.non_permissible_income}
              nonPermDenominator={stock.total_business_income || stock.revenue}
              methodologyRows={methodologyRowsForCollapsible}
            />

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
                      <RatioReadMoreDrawer
                        label={r.label}
                        shortText={`${r.desc.split(".")[0].trim()}.`}
                        fullText={`${r.desc} This ratio is evaluated against the threshold shown here to determine whether the stock remains within the screening range.`}
                        thresholdText={formatRatio(r.threshold)}
                      />
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
              {SCREENING_LEGAL_DISCLAIMER}{" "}
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
                    <td>Source exchange</td>
                    <td style={{ textAlign: "right", color: "var(--text-muted)" }}>{stock.source_exchange ?? stock.exchange}</td>
                  </tr>
                  <tr>
                    <td>Confidence tier</td>
                    <td style={{ textAlign: "right", color: "var(--text-muted)" }}>
                      {stock.confidence_tier ? `${stock.confidence_tier}%` : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td>Fundamentals last updated</td>
                    <td style={{ textAlign: "right", color: "var(--text-muted)" }}>{fundamentalsLastUpdated}</td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                      {fundamentalsUnitNote(cur)}
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

            {peopleAlsoChecked.length > 0 && (
              <section className={styles.peopleAlsoSection} aria-labelledby="people-also-heading">
                <h2 id="people-also-heading" className={styles.peopleAlsoTitle}>
                  People also checked
                </h2>
                <div className={styles.peopleAlsoGrid}>
                  {peopleAlsoChecked.map((item) => (
                    <Link
                      key={item.symbol}
                      href={`/screening/${encodeURIComponent(item.symbol)}`}
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
                        <LockedVerdict symbol={item.symbol} compact>
                          <div className={styles.peopleAlsoScoreWrap}>
                            <span className={styles.peopleAlsoScore}>{item.score}</span>
                            <span className={styles.peopleAlsoScoreSuffix}>/100</span>
                          </div>
                          <span
                            className={`${styles.badge} ${styles[STATUS_BADGE[item.status] || "badgeReview"]}`}
                          >
                            {screeningUiLabel(item.status)}
                          </span>
                        </LockedVerdict>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Moved to end of detail flow, with Read more nested inside */}
            <StockUpsellCard readMore={readMorePanel} />
          </div>
        </StockVerdictGate>
      </div>
    </main>
  );
}

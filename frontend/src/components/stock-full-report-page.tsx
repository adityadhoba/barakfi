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
  multiScreening?: { methodologies: Record<string, ScreeningResult>; consensus_status: string; screening_score: number } | null;
  complianceHistory?: Array<{ status: string; profile_code: string; recorded_at: string }>;
};

/* ── helpers ── */

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

function formatPctShort(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${(value * 100).toFixed(1)}%`;
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

function formatMcap(value: number): string {
  if (value >= 1e12) return `₹${(value / 1e12).toFixed(1)}L Cr`;
  if (value >= 1e7) return `₹${Math.round(value / 1e7).toLocaleString("en-IN")} Cr`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function barWidth(value: number, threshold: number): number {
  if (threshold <= 0) return 0;
  return Math.min(100, Math.max(0, (value / threshold) * 100));
}

function barColorClass(status: "pass" | "review" | "fail") {
  if (status === "pass") return styles.ratioBarPass;
  if (status === "fail") return styles.ratioBarFail;
  return styles.ratioBarWarn;
}

function ratioValueClass(status: "pass" | "review" | "fail") {
  if (status === "pass") return styles.ratioValuePass;
  if (status === "fail") return styles.ratioValueFail;
  return styles.ratioValueWarn;
}

function ratioBadgeClass(status: "pass" | "review" | "fail") {
  if (status === "pass") return styles.ratioBadgePass;
  if (status === "fail") return styles.ratioBadgeFail;
  return styles.ratioBadgeWarn;
}

function obBadgeClass(status: "pass" | "review" | "fail") {
  if (status === "pass") return styles.obBadgePass;
  if (status === "fail") return styles.obBadgeFail;
  return styles.obBadgeReview;
}

function obScoreClass(status: "pass" | "review" | "fail") {
  if (status === "pass") return styles.obScorePass;
  if (status === "fail") return styles.obScoreFail;
  return styles.obScoreReview;
}

function overallBlockClass(status: "pass" | "review" | "fail") {
  if (status === "pass") return styles.overallBlockPass;
  if (status === "fail") return styles.overallBlockFail;
  return styles.overallBlockReview;
}

function statusClass(status: "pass" | "review" | "fail") {
  if (status === "pass") return styles.statusPass;
  if (status === "fail") return styles.statusFail;
  return styles.statusReview;
}

function gaugeColor(status: "pass" | "review" | "fail") {
  if (status === "pass") return "#5ec486";
  if (status === "fail") return "#e06868";
  return "#e0a468";
}

function gaugeValClass(status: "pass" | "review" | "fail") {
  if (status === "pass") return styles.gaugeValPass;
  if (status === "fail") return styles.gaugeValFail;
  return styles.gaugeValReview;
}

function hiBadgeClass(status: "pass" | "review" | "fail") {
  if (status === "pass") return styles.hiBadgePass;
  if (status === "fail") return styles.hiBadgeFail;
  return styles.hiBadgeReview;
}

function flagClass(status: "pass" | "review" | "fail") {
  if (status === "pass") return styles.obFlagPass;
  if (status === "fail") return styles.obFlagFail;
  return styles.obFlagWarn;
}

function mcCellClass(status: "pass" | "review" | "fail") {
  if (status === "pass") return styles.mcPassCell;
  if (status === "fail") return styles.mcFailCell;
  return styles.mcWarnCell;
}

type RatioInfo = {
  name: string;
  desc: string;
  detail: string;
  value: number;
  threshold: number;
  displayValue: string;
  status: "pass" | "review" | "fail";
  thresholdLabel: string;
  isSector?: boolean;
  sectorAllowed?: boolean;
};

function buildRatios(screening: ScreeningResult): RatioInfo[] {
  const b = screening.breakdown;
  return [
    {
      name: "Debt Ratio",
      desc: "Interest-bearing debt as a proportion of market capitalisation.",
      detail: `Total debt compared against the company's average market cap over 36 months. A ratio below 33% is generally required for AAOIFI compliance.`,
      value: b.debt_to_market_cap_ratio,
      threshold: 0.33,
      displayValue: formatPct(b.debt_to_market_cap_ratio),
      status: thresholdStatus(b.debt_to_market_cap_ratio, 0.33),
      thresholdLabel: "< 33%",
    },
    {
      name: "Interest Income",
      desc: "Interest and treasury-based income as share of total revenue.",
      detail: `Income earned from interest-bearing deposits and treasury instruments. Must stay below 5% of total income.`,
      value: b.interest_income_ratio,
      threshold: 0.05,
      displayValue: formatPct(b.interest_income_ratio),
      status: thresholdStatus(b.interest_income_ratio, 0.05),
      thresholdLabel: "< 5%",
    },
    {
      name: "Non-permissible Income",
      desc: "Income from non-halal activities against total business income.",
      detail: `Revenue from activities not permitted under Shariah law. This includes gambling, alcohol, tobacco, and conventional financial services income.`,
      value: b.non_permissible_income_ratio,
      threshold: 0.05,
      displayValue: formatPct(b.non_permissible_income_ratio),
      status: thresholdStatus(b.non_permissible_income_ratio, 0.05),
      thresholdLabel: "< 5%",
    },
    {
      name: "Receivables Ratio",
      desc: "Accounts receivable relative to market capitalisation.",
      detail: `Trade receivables and similar current assets compared to average market capitalisation. Threshold set at 33% under AAOIFI.`,
      value: b.receivables_to_market_cap_ratio,
      threshold: 0.33,
      displayValue: formatPct(b.receivables_to_market_cap_ratio),
      status: thresholdStatus(b.receivables_to_market_cap_ratio, 0.33),
      thresholdLabel: "< 33%",
    },
    {
      name: "Cash & IB Assets",
      desc: "Cash and interest-bearing balances versus total assets.",
      detail: `Liquid cash holdings plus any interest-bearing investments or deposits compared to the company's total asset base.`,
      value: b.cash_and_interest_bearing_to_assets_ratio,
      threshold: 0.33,
      displayValue: formatPct(b.cash_and_interest_bearing_to_assets_ratio),
      status: thresholdStatus(b.cash_and_interest_bearing_to_assets_ratio, 0.33),
      thresholdLabel: "< 33%",
    },
    {
      name: "Business Activity",
      desc: "Core business sector permissibility check.",
      detail: `The company's primary line of business is evaluated against a list of prohibited sectors under Shariah guidelines.`,
      value: 0,
      threshold: 1,
      displayValue: b.sector_allowed ? "Allowed" : "Restricted",
      status: b.sector_allowed ? "pass" : "fail",
      thresholdLabel: "Sector screen",
      isSector: true,
      sectorAllowed: b.sector_allowed,
    },
  ];
}

function sectorSegments(sector: string, sectorAllowed: boolean) {
  const segStatus = sectorAllowed ? "pass" : "fail";
  const sectorMap: Record<string, Array<{ name: string; desc: string; status: "pass" | "review" | "fail" }>> = {
    "Information Technology": [
      { name: "Software & Services", desc: "Enterprise and consumer software products and IT consulting", status: segStatus },
      { name: "Cloud Infrastructure", desc: "Data centres, hosting, and managed cloud services", status: segStatus },
      { name: "Digital Payments", desc: "Payment processing and fintech platforms", status: sectorAllowed ? "review" : "fail" },
      { name: "Hardware & Devices", desc: "Computing hardware, peripherals, and components", status: segStatus },
    ],
    "Financials": [
      { name: "Banking Operations", desc: "Conventional lending, deposits, and treasury", status: "fail" },
      { name: "Insurance", desc: "Conventional insurance underwriting and products", status: "fail" },
      { name: "Asset Management", desc: "Fund management and advisory services", status: "review" },
      { name: "Capital Markets", desc: "Brokerage, trading, and investment banking", status: "fail" },
    ],
    "Consumer Discretionary": [
      { name: "Retail Operations", desc: "Consumer retail stores and e-commerce platforms", status: segStatus },
      { name: "Hospitality", desc: "Hotels, restaurants, and leisure services", status: sectorAllowed ? "review" : "fail" },
      { name: "Automotive", desc: "Vehicle manufacturing and dealership networks", status: segStatus },
      { name: "Media & Entertainment", desc: "Content creation, broadcasting, and gaming", status: sectorAllowed ? "review" : "fail" },
    ],
    "Health Care": [
      { name: "Pharmaceuticals", desc: "Drug discovery, manufacturing, and distribution", status: segStatus },
      { name: "Medical Devices", desc: "Surgical instruments, diagnostics, and equipment", status: segStatus },
      { name: "Healthcare Services", desc: "Hospital operations and outpatient care", status: segStatus },
      { name: "Biotechnology", desc: "Biotech research and gene therapy products", status: segStatus },
    ],
  };

  return sectorMap[sector] ?? [
    { name: "Primary Business", desc: `Core ${sector.toLowerCase()} operations and products`, status: segStatus },
    { name: "Operations", desc: "Manufacturing, supply chain, and logistics", status: segStatus },
    { name: "Services", desc: "Professional services and client delivery", status: sectorAllowed ? "pass" : "review" },
    { name: "Other Activities", desc: "Ancillary and subsidiary business lines", status: sectorAllowed ? "pass" : "review" },
  ];
}

function segStatusClass(status: "pass" | "review" | "fail") {
  if (status === "pass") return styles.segOk;
  if (status === "fail") return styles.segFlag;
  return styles.segMixed;
}

function segStatusLabel(status: "pass" | "review" | "fail") {
  if (status === "pass") return "Permissible";
  if (status === "fail") return "Not Permissible";
  return "Review Required";
}

function sectorVerdictClass(status: "pass" | "review" | "fail") {
  if (status === "pass") return styles.sectorVerdictPass;
  if (status === "review") return styles.sectorVerdictReview;
  return "";
}

function svTitleClass(status: "pass" | "review" | "fail") {
  if (status === "pass") return styles.svTitlePass;
  if (status === "review") return styles.svTitleReview;
  return "";
}

/* ── component ── */

export function StockFullReportPage({
  stock,
  screening,
  liveQuote,
  indices,
  similarStocks,
  multiScreening,
  complianceHistory,
}: Props) {
  const verdictStatus = normalizeStatus(screening.status);
  const reportStatus = screeningUiLabel(screening.status);
  const score = Math.max(0, Math.round(screening.screening_score || 0));
  const displayPrice = liveQuote?.last_price ?? stock.price;
  const quoteCurrency = liveQuote?.currency || stock.currency || "INR";
  const ratios = buildRatios(screening);
  const purRatio = screening.purification_ratio_pct;
  const sectorAllowed = screening.breakdown.sector_allowed;
  const segments = sectorSegments(stock.sector, sectorAllowed);
  const sectorStatus: "pass" | "review" | "fail" = sectorAllowed ? "pass" : "fail";

  const priceChange = liveQuote?.change ?? 0;
  const priceChangePct = liveQuote?.change_percent ?? 0;
  const priceUp = priceChange >= 0;

  const verdictTitle =
    verdictStatus === "pass"
      ? `${stock.name} is Shariah Compliant`
      : verdictStatus === "fail"
        ? `${stock.name} is Not Compliant`
        : `${stock.name} Requires Further Review`;

  const primaryFlag =
    screening.manual_review_flags.length > 0
      ? screening.manual_review_flags[0]
      : verdictStatus === "pass"
        ? "All ratios within limits"
        : verdictStatus === "fail"
          ? "One or more ratios exceeded"
          : "Borderline ratios detected";

  /* Cross-standard comparison rows */
  const staticStandards = [
    { name: "BarakFi (AAOIFI-based)", status: verdictStatus, note: "Primary standard used for this report" },
    { name: "AAOIFI", status: verdictStatus, note: "33% debt, receivables, cash thresholds" },
    { name: "S&P Shariah", status: verdictStatus === "fail" ? "fail" as const : "review" as const, note: "Revenue-based denominators" },
    { name: "FTSE Shariah", status: verdictStatus === "fail" ? "fail" as const : "review" as const, note: "Total asset denominators" },
    { name: "Strict (custom)", status: verdictStatus === "pass" ? "review" as const : "fail" as const, note: "Lower thresholds, stricter sector rules" },
  ];

  return (
    <div className={styles.pageWrap}>
      {/* ── BREADCRUMB ── */}
      <nav className={styles.breadcrumb}>
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/screener">Screener</Link>
        <span>/</span>
        <Link href={`/screener?sector=${encodeURIComponent(stock.sector)}`}>{stock.sector}</Link>
        <span>/</span>
        <Link href={`/stocks/${encodeURIComponent(stock.symbol)}`}>{stock.symbol}</Link>
        <span>/</span>
        <span className={styles.breadcrumbCurrent}>Full Report</span>
      </nav>

      {/* ── REPORT HEADER ── */}
      <header className={styles.reportHeader}>
        <div className={styles.rhTop}>
          <div>
            <div className={styles.rhIdentity}>
              <div className={styles.rhLogo}>
                <StockLogo symbol={stock.symbol} size={52} status={screening.status} />
              </div>
              <div>
                <div className={styles.rhTag}>
                  {stock.symbol}
                  <span className={styles.rhExchange}>{stock.exchange}</span>
                </div>
                <div className={styles.rhName}>{stock.name}</div>
                <div className={styles.rhSector}>{stock.sector} · {stock.country || "India"}</div>
              </div>
            </div>

            <div className={styles.reportLabelRow}>
              <span>Full Shariah Screening Report</span>
              <small>Version {PRIMARY_METHODOLOGY_VERSION}</small>
              <small>· 1 credit</small>
            </div>
          </div>

          <div className={styles.rhPrice}>
            <div className={styles.rhPriceLabel}>Current Price</div>
            <div className={styles.rhPriceValue}>{formatPrice(displayPrice, quoteCurrency)}</div>
            <div className={`${styles.rhPriceChange} ${priceUp ? styles.rhPriceUp : styles.rhPriceDown}`}>
              {priceUp ? "+" : ""}{priceChange.toFixed(2)} ({priceUp ? "+" : ""}{priceChangePct.toFixed(2)}%)
            </div>
            <div className={styles.rhPriceDate}>
              Last screened {formatDate(stock.fundamentals_updated_at)}
            </div>
          </div>
        </div>

        {/* ── VERDICT STRIP ── */}
        <div className={styles.verdictStrip}>
          <div className={styles.vsCell}>
            <div className={styles.vsCellInner}>
              <div className={styles.vsLabel}>Shariah Status</div>
              <div className={`${styles.verdictBadge} ${statusClass(verdictStatus)}`}>
                <span className={styles.verdictDot} />
                {reportStatus}
              </div>
            </div>
          </div>
          <div className={styles.vsCell}>
            <div className={styles.vsCellInner}>
              <div className={styles.vsLabel}>Compliance Score</div>
              <div className={styles.vsVal}>
                <span className={styles.vsScoreVal}>{score}</span>
                <span className={styles.vsScoreSuffix}>/100</span>
              </div>
            </div>
          </div>
          <div className={styles.vsCell}>
            <div className={styles.vsCellInner}>
              <div className={styles.vsLabel}>Primary Flag</div>
              <div className={styles.vsVal}>{primaryFlag}</div>
            </div>
          </div>
          <div className={`${styles.vsCell} ${styles.vsCellLast}`}>
            <div className={styles.vsCellInner}>
              <div className={styles.vsLabel}>Methodology</div>
              <div className={`${styles.vsVal} ${styles.vsMethodText}`}>AAOIFI-aligned</div>
              <div className={styles.vsMethodVersion}>v{PRIMARY_METHODOLOGY_VERSION}</div>
            </div>
          </div>
        </div>
      </header>

      {/* ── TWO-COLUMN BODY ── */}
      <div className={styles.reportBody}>
        {/* ── MAIN ── */}
        <main className={styles.reportMain}>
          {/* Credit notice */}
          <div className={styles.creditNotice}>
            <span className={styles.cnIcon}>&#9679;</span>
            <div className={styles.cnText}>
              <strong>1 report credit used.</strong> This detailed Shariah compliance report for {stock.name} ({stock.symbol}) has been generated using your account credits.
            </div>
            <span className={styles.cnCredits}>-1 Credit</span>
          </div>

          {/* Overall verdict block */}
          <div className={`${styles.overallBlock} ${overallBlockClass(verdictStatus)}`}>
            <div className={styles.obHeader}>
              <span className={`${styles.obBadge} ${obBadgeClass(verdictStatus)}`}>
                {verdictStatus === "pass" ? "COMPLIANT" : verdictStatus === "fail" ? "NOT COMPLIANT" : "REQUIRES REVIEW"}
              </span>
              <div className={styles.obScore}>
                <div className={`${styles.obScoreVal} ${obScoreClass(verdictStatus)}`}>{score}</div>
                <div className={styles.obScoreLabel}>Compliance Score</div>
              </div>
            </div>
            <div className={styles.obTitle}>{verdictTitle}</div>
            <div className={styles.obBody}>
              {screening.reasons.length > 0 ? (
                screening.reasons.map((r, i) => (
                  <span key={i}>{r}{i < screening.reasons.length - 1 ? " " : ""}</span>
                ))
              ) : (
                <span>No additional reason text was returned by the current screening run.</span>
              )}
            </div>
            <div className={styles.obFlags}>
              {screening.manual_review_flags.map((flag) => (
                <span key={flag} className={`${styles.obFlag} ${styles.obFlagWarn}`}>{flag}</span>
              ))}
              {ratios.filter((r) => !r.isSector).map((r) => (
                <span key={r.name} className={`${styles.obFlag} ${flagClass(r.status)}`}>
                  {r.name}: {r.status === "pass" ? "Pass" : r.status === "fail" ? "Fail" : "Borderline"}
                </span>
              ))}
              <span className={`${styles.obFlag} ${flagClass(sectorStatus)}`}>
                Sector: {sectorAllowed ? "Allowed" : "Restricted"}
              </span>
            </div>
          </div>

          {/* ── RATIO BREAKDOWN ── */}
          <section className={styles.ratiosSection}>
            <div className={styles.secHead}>Ratio-by-Ratio Breakdown</div>
            {ratios.map((r) => (
              <div key={r.name} className={styles.ratioRow}>
                <div>
                  <div className={styles.ratioName}>{r.name}</div>
                  <div className={styles.ratioDesc}>{r.desc}</div>
                  <div className={styles.ratioDetail}>{r.detail}</div>
                  {!r.isSector && (
                    <div className={styles.ratioBarWrap}>
                      <div className={styles.ratioBarTrack}>
                        <div
                          className={`${styles.ratioBarFill} ${barColorClass(r.status)}`}
                          style={{ width: `${barWidth(r.value, r.threshold)}%` }}
                        />
                      </div>
                      <span className={styles.ratioThreshold}>{r.thresholdLabel}</span>
                    </div>
                  )}
                </div>
                <div className={`${styles.ratioValue} ${r.isSector ? styles.ratioValueNeutral : ratioValueClass(r.status)}`}>
                  {r.displayValue}
                </div>
                <div className={styles.ratioStatus}>
                  <span className={`${styles.ratioBadge} ${ratioBadgeClass(r.status)}`}>
                    {r.status === "pass" ? "Pass" : r.status === "fail" ? "Fail" : "Borderline"}
                  </span>
                </div>
              </div>
            ))}
          </section>

          {/* ── BUSINESS SEGMENTS ── */}
          <section className={styles.sectorSection}>
            <div className={styles.secHead}>Business Segment Analysis</div>
            <div className={`${styles.sectorVerdict} ${sectorVerdictClass(sectorStatus)}`}>
              <div className={`${styles.svTitle} ${svTitleClass(sectorStatus)}`}>
                {sectorAllowed ? "SECTOR PERMISSIBLE" : "SECTOR FLAGGED"}
              </div>
              <div className={styles.svBody}>
                <strong>{stock.name}</strong> operates in the <strong>{stock.sector}</strong> sector.
                {sectorAllowed
                  ? " This sector is generally considered permissible under Shariah guidelines. The company's core business activities do not fall within prohibited categories."
                  : " This sector raises concerns under Shariah screening. One or more of the company's primary activities may be in restricted categories."}
              </div>
            </div>
            <div className={styles.segmentGrid}>
              {segments.map((seg) => (
                <div key={seg.name} className={styles.segmentCell}>
                  <div className={styles.segName}>{seg.name}</div>
                  <div className={styles.segDesc}>{seg.desc}</div>
                  <span className={`${styles.segStatus} ${segStatusClass(seg.status)}`}>
                    {segStatusLabel(seg.status)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* ── PURIFICATION ── */}
          <section className={styles.purificationSection}>
            <div className={styles.secHead}>Purification Guidance</div>
            <div className={styles.purifBox}>
              <div className={styles.purifIntro}>
                <strong>Purification</strong> is the process of cleansing investment returns from any impure income component.
                If a stock passes Shariah screening but has a small percentage of non-permissible income, that portion
                should be donated to charity. The purification ratio indicates what percentage of dividends or capital gains
                should be given away.
              </div>
              <div className={styles.purifCalc}>
                <div className={styles.purifCalcTitle}>Purification Calculator</div>
                <div className={styles.purifRow}>
                  <span className={styles.purifLabel}>Investment Amount</span>
                  <span className={styles.purifVal}>₹1,00,000</span>
                </div>
                <div className={styles.purifRow}>
                  <span className={styles.purifLabel}>Purification Ratio</span>
                  <span className={`${styles.purifVal} ${purRatio != null && purRatio > 0 ? styles.purifValWarn : ""}`}>
                    {purRatio != null ? `${purRatio.toFixed(2)}%` : "N/A"}
                  </span>
                </div>
                <div className={styles.purifRow}>
                  <span className={styles.purifLabel}>Estimated Purification</span>
                  <span className={`${styles.purifVal} ${purRatio != null && purRatio > 0 ? styles.purifValWarn : ""}`}>
                    {purRatio != null ? `₹${((100000 * purRatio) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "N/A"}
                  </span>
                </div>
                <div className={styles.purifRow}>
                  <span className={styles.purifLabel}>Payable To</span>
                  <span className={styles.purifVal} style={{ fontSize: 14 }}>Charity</span>
                </div>
              </div>
              <div className={styles.purifNote}>
                This calculation is based on dividend income. For capital gains purification, the ratio is applied to the
                profit portion of your sale proceeds. Consult a qualified scholar for your specific situation.
              </div>
              <div className={styles.purifCta}>
                <Link href="/purification-calculator" className={styles.btnGhostSm}>
                  Open Purification Calculator
                </Link>
              </div>
            </div>
          </section>

          {/* ── METHODOLOGY ── */}
          <section className={styles.methodologySection}>
            <div className={styles.secHead}>How This Stock Was Screened</div>
            <div className={styles.methodGrid}>
              <div className={styles.methodCell}>
                <div className={styles.mcLabel}>Screening Standard</div>
                <div className={styles.mcVal}>AAOIFI-aligned</div>
                <div className={styles.mcNote}>Adapted from AAOIFI Shariah Standard No. 21 with BarakFi enhancements</div>
              </div>
              <div className={styles.methodCell}>
                <div className={styles.mcLabel}>Data Source</div>
                <div className={styles.mcVal}>{stock.data_source || "Public filings"}</div>
                <div className={styles.mcNote}>Financial statements and market data</div>
              </div>
              <div className={styles.methodCell}>
                <div className={styles.mcLabel}>Last Updated</div>
                <div className={styles.mcVal}>{formatDate(stock.fundamentals_updated_at)}</div>
                <div className={styles.mcNote}>Balance sheet and income statement data</div>
              </div>
              <div className={styles.methodCell}>
                <div className={styles.mcLabel}>Version</div>
                <div className={styles.mcVal}>v{PRIMARY_METHODOLOGY_VERSION}</div>
                <div className={styles.mcNote}>Engine version and rulebook applied</div>
              </div>
            </div>

            <div className={styles.methodCompare}>
              <div className={styles.methodCompareTitle}>Cross-Standard Comparison</div>
              <table className={styles.mcTable}>
                <thead>
                  <tr>
                    <th>Standard</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {multiScreening
                    ? Object.entries(multiScreening.methodologies).map(([code, result]) => {
                        const pStatus = normalizeStatus(result.status);
                        return (
                          <tr key={code}>
                            <td>{code.replace(/_/g, " ")}</td>
                            <td className={mcCellClass(pStatus)}>
                              {screeningUiLabel(result.status)}
                            </td>
                            <td>Score: {Math.round(result.screening_score)}/100</td>
                          </tr>
                        );
                      })
                    : staticStandards.map((s) => (
                        <tr key={s.name}>
                          <td>{s.name}</td>
                          <td className={mcCellClass(s.status)}>
                            {s.status === "pass" ? "Compliant" : s.status === "fail" ? "Not Compliant" : "Requires Review"}
                          </td>
                          <td>{s.note}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
              <div className={styles.mcTableNote}>
                Different standards use different denominators and thresholds. A stock may be compliant under one methodology but not another.
              </div>
            </div>
          </section>

          {/* ── SCHOLAR PERSPECTIVE ── */}
          <section className={styles.scholarSection}>
            <div className={styles.secHead}>Scholar Perspective</div>
            <div className={styles.scholarBox}>
              <div className={styles.scholarQ}>
                {verdictStatus === "pass"
                  ? "Is it sufficient to rely on automated screening for Shariah compliance?"
                  : verdictStatus === "fail"
                    ? "Can a stock that fails screening ever be held by a Muslim investor?"
                    : "What should an investor do when a stock's compliance status is uncertain?"}
              </div>
              <div className={styles.scholarBody}>
                {verdictStatus === "pass" ? (
                  <>
                    <strong>Position 1 (Majority view):</strong> Automated screening based on AAOIFI or similar standards
                    provides a reliable initial filter. Scholars generally accept that stocks passing all quantitative
                    thresholds are permissible to invest in, provided the investor also purifies any non-permissible income
                    component.
                    <br /><br />
                    <strong>Position 2 (Stricter view):</strong> Some scholars advise additional qualitative review beyond
                    ratio-based screening, including examining the company&apos;s actual business practices, board
                    governance, and whether any recent activities raise concerns not captured by financial ratios alone.
                  </>
                ) : verdictStatus === "fail" ? (
                  <>
                    <strong>Position 1 (Majority view):</strong> Stocks that fail quantitative screening should generally be
                    avoided. The thresholds exist to ensure a meaningful level of Shariah compliance, and exceeding them
                    indicates the company&apos;s financial structure is not aligned with Islamic principles.
                    <br /><br />
                    <strong>Position 2 (Contextual view):</strong> Some scholars note that if a company is transitioning
                    toward compliance or has temporary ratio exceedances due to extraordinary circumstances, there may be
                    room for continued holding with the intention of engaging the company toward better practices.
                  </>
                ) : (
                  <>
                    <strong>Position 1 (Cautious approach):</strong> When a stock&apos;s compliance status is borderline or
                    uncertain, the prudent approach is to avoid the investment until clarity is obtained. The principle of
                    caution (wara&apos;) suggests erring on the side of avoidance in doubtful matters.
                    <br /><br />
                    <strong>Position 2 (Pragmatic approach):</strong> Some scholars allow holding borderline stocks if the
                    investor actively monitors the ratios and commits to divesting if the stock moves into non-compliance.
                    The key is conscious engagement rather than passive neglect.
                  </>
                )}
              </div>
              <div className={styles.scholarCta}>
                Have questions about this ruling?{" "}
                <Link href="/methodology">Read our full methodology guide</Link>
              </div>
            </div>
          </section>

          {/* ── SCREENING HISTORY ── */}
          <section className={styles.historySection}>
            <div className={styles.secHead}>Screening History</div>
            {complianceHistory && complianceHistory.length > 0 ? (
              complianceHistory.map((entry, i) => {
                const entryStatus = normalizeStatus(entry.status);
                return (
                  <div key={`${entry.recorded_at}-${i}`} className={styles.historyItem}>
                    <div className={styles.hiDate}>{formatDate(entry.recorded_at)}</div>
                    <div>
                      <div className={styles.hiEvent}>
                        {screeningUiLabel(entry.status)}
                        {i === 0 && <span className={styles.currentTag}>Current</span>}
                      </div>
                      <div className={styles.hiNote}>Profile: {entry.profile_code}</div>
                    </div>
                    <span className={`${styles.hiBadge} ${hiBadgeClass(entryStatus)}`}>
                      {entryStatus === "pass" ? "PASS" : entryStatus === "fail" ? "FAIL" : "REVIEW"}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className={styles.historyItem}>
                <div className={styles.hiDate}>{formatDate(stock.fundamentals_updated_at)}</div>
                <div>
                  <div className={styles.hiEvent}>
                    {reportStatus}
                    <span className={styles.currentTag}>Current</span>
                  </div>
                  <div className={styles.hiNote}>
                    Profile: {screening.profile} · Score: {score}/100
                  </div>
                </div>
                <span className={`${styles.hiBadge} ${hiBadgeClass(verdictStatus)}`}>
                  {verdictStatus === "pass" ? "PASS" : verdictStatus === "fail" ? "FAIL" : "REVIEW"}
                </span>
              </div>
            )}
          </section>
        </main>

        {/* ── SIDEBAR ── */}
        <aside className={styles.reportSidebar}>
          {/* Score gauge */}
          <div className={styles.sidebarCard}>
            <div className={styles.scoreGauge}>
              <div
                className={styles.gaugeRing}
                style={{
                  background: `conic-gradient(${gaugeColor(verdictStatus)} 0deg ${score * 3.6}deg, rgba(230,226,216,0.1) ${score * 3.6}deg 360deg)`,
                }}
              >
                <span className={`${styles.gaugeVal} ${gaugeValClass(verdictStatus)}`}>{score}</span>
              </div>
              <div className={styles.gaugeLabel}>Compliance Score</div>
              <div className={styles.gaugeSub}>
                {verdictStatus === "pass"
                  ? "This stock meets all Shariah screening thresholds."
                  : verdictStatus === "fail"
                    ? "One or more ratios exceed permitted limits."
                    : "Some ratios are near the threshold boundary."}
              </div>
            </div>
          </div>

          {/* Key ratios mini */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardHead}>Key Ratios</div>
            <div className={styles.sidebarCardBody}>
              {ratios.filter((r) => !r.isSector).map((r) => {
                const rmrValCls =
                  r.status === "pass" ? styles.rmrValPass : r.status === "fail" ? styles.rmrValFail : styles.rmrValWarn;
                const rmrFillCls =
                  r.status === "pass" ? styles.rmrFillPass : r.status === "fail" ? styles.rmrFillFail : styles.rmrFillWarn;
                return (
                  <div key={r.name} className={styles.ratioMiniRow}>
                    <span className={styles.rml}>{r.name}</span>
                    <div className={styles.rmr}>
                      <div className={`${styles.rmrVal} ${rmrValCls}`}>{formatPctShort(r.value)}</div>
                      <div className={styles.rmrBar}>
                        <div
                          className={`${styles.rmrFill} ${rmrFillCls}`}
                          style={{ width: `${barWidth(r.value, r.threshold)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stock info */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardHead}>Stock Info</div>
            <div className={styles.sidebarCardBody}>
              <div className={styles.sbRow}>
                <span className={styles.sbLabel}>Ticker</span>
                <span className={styles.sbVal}>{stock.symbol}</span>
              </div>
              <div className={styles.sbRow}>
                <span className={styles.sbLabel}>Exchange</span>
                <span className={styles.sbVal}>{stock.exchange}</span>
              </div>
              <div className={styles.sbRow}>
                <span className={styles.sbLabel}>Sector</span>
                <span className={styles.sbVal}>{stock.sector}</span>
              </div>
              {stock.index_memberships && stock.index_memberships.length > 0 && (
                <div className={styles.sbRow}>
                  <span className={styles.sbLabel}>Indices</span>
                  <span className={styles.sbVal}>{stock.index_memberships.slice(0, 3).join(", ")}</span>
                </div>
              )}
              <div className={styles.sbRow}>
                <span className={styles.sbLabel}>Market Cap</span>
                <span className={styles.sbVal}>{formatMcap(stock.market_cap)}</span>
              </div>
              {stock.pe_ratio != null && (
                <div className={styles.sbRow}>
                  <span className={styles.sbLabel}>P/E Ratio</span>
                  <span className={styles.sbVal}>{stock.pe_ratio.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Report metadata */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardHead}>Report Metadata</div>
            <div className={styles.sidebarCardBody}>
              <div className={styles.sbRow}>
                <span className={styles.sbLabel}>Version</span>
                <span className={styles.sbVal}>v{PRIMARY_METHODOLOGY_VERSION}</span>
              </div>
              <div className={styles.sbRow}>
                <span className={styles.sbLabel}>Generated</span>
                <span className={styles.sbVal}>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
              <div className={styles.sbRow}>
                <span className={styles.sbLabel}>Data Period</span>
                <span className={styles.sbVal}>{formatDate(stock.fundamentals_updated_at)}</span>
              </div>
            </div>
          </div>

          {/* Watchlist CTA */}
          <div className={styles.watchlistCta}>
            <div className={styles.wlTitle}>Track This Stock</div>
            <div className={styles.wlBody}>
              Add {stock.symbol} to your watchlist to receive compliance status change alerts and quarterly re-screening notifications.
            </div>
            <Link href={`/stocks/${encodeURIComponent(stock.symbol)}`} className={styles.btnSolid}>
              Add to Watchlist
            </Link>
          </div>

          {/* Methodology note */}
          <div className={styles.methodSideNote}>
            <div className={styles.methodSideNoteTitle}>Methodology Note</div>
            <div className={styles.methodSideNoteText}>
              This report uses an <strong>AAOIFI-aligned</strong> screening methodology. Ratios are calculated using
              the most recent publicly available financial statements. Market capitalisation figures use the
              36-month average where available.{" "}
              <Link href="/methodology">Learn more about our methodology</Link>.
            </div>
          </div>
        </aside>
      </div>

      {/* ── DISCLAIMER ── */}
      <div className={styles.disclaimer}>
        <strong>Disclaimer:</strong> This report is for educational and informational purposes only. It does not constitute
        a religious ruling (fatwa), Shariah certification, financial advice, or investment recommendation. The screening
        is based on publicly available data and standard quantitative methodologies. Users should verify compliance with
        qualified Shariah scholars and conduct their own due diligence before making any investment decisions. BarakFi
        accepts no liability for investment decisions made based on this report.
      </div>
    </div>
  );
}

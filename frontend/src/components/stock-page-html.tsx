import Link from "next/link";
import { PRIMARY_METHODOLOGY_VERSION } from "@/lib/methodology-version";
import {
  capTierLabel,
  formatFundamentalAmountCompact,
  formatFundamentalsLastUpdatedIst,
} from "@/lib/fundamentals-format";
import { displayCountryForStock } from "@/lib/stock-display";
import { screeningUiLabel } from "@/lib/screening-status";
import { StockLogo } from "@/components/stock-logo";
import { StockPageActionButtons } from "@/components/stock-page-action-buttons";
import { RouteLocalAuth } from "@/components/route-local-auth";
import type { EquityQuote, IndexQuote, ScreeningResult, Stock } from "@/lib/api";
import styles from "@/app/stock-page-html.module.css";

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
  isInWatchlist: boolean;
};

type RatioRow = {
  key: string;
  name: string;
  desc: string;
  valueLabel: string;
  thresholdLabel?: string;
  tone: "pass" | "warn" | "fail";
  badge: string;
  fillPct?: number;
};

type RailIconName = "compliance" | "market" | "about" | "similar" | "watchlist" | "share";

const FALLBACK_TICKER = [
  { name: "NIFTY 50", value: 23842.75, change_percent: 0.54 },
  { name: "SENSEX", value: 78553.2, change_percent: 0.54 },
  { name: "NIFTY BANK", value: 51236.8, change_percent: -0.17 },
  { name: "NIFTY IT", value: 33156.4, change_percent: 0.75 },
  { name: "NIFTY PHARMA", value: 19872.35, change_percent: 0.28 },
  { name: "NIFTY AUTO", value: 23145.9, change_percent: -0.48 },
  { name: "NIFTY FMCG", value: 56234.15, change_percent: 0.32 },
  { name: "INDIA VIX", value: 13.42, change_percent: -2.75 },
] as const;

const STATUS_META: Record<string, { label: string; dotClass: string; badgeClass: string; shortLabel: string }> = {
  HALAL: {
    label: "Shariah Compliant",
    shortLabel: "Compliant",
    dotClass: styles.verdictDotCompliant,
    badgeClass: styles.statusCompliant,
  },
  CAUTIOUS: {
    label: "Requires Review",
    shortLabel: "Requires Review",
    dotClass: styles.verdictDotReview,
    badgeClass: styles.statusReview,
  },
  NON_COMPLIANT: {
    label: "Not Compliant",
    shortLabel: "Not Compliant",
    dotClass: styles.verdictDotFail,
    badgeClass: styles.statusFail,
  },
};

function toneClassName(status: string) {
  if (status === "HALAL") return styles.toneCompliant;
  if (status === "NON_COMPLIANT") return styles.toneFail;
  return styles.toneReview;
}

function formatPrice(value: number, currency: string = "INR") {
  const locale = currency === "GBP" ? "en-GB" : currency === "USD" ? "en-US" : "en-IN";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTickerValue(value: number) {
  return value.toLocaleString("en-IN", { maximumFractionDigits: value >= 100 ? 2 : 2 });
}

function formatPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatRatio(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function formatVolume(volume: number | null | undefined, currency: string) {
  if (volume == null || !Number.isFinite(volume)) return "—";
  if (currency === "INR") {
    if (volume >= 1e7) return `${(volume / 1e7).toFixed(2)} Cr`;
    if (volume >= 1e5) return `${(volume / 1e5).toFixed(1)} L`;
  }
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return String(Math.round(volume));
}

function formatRange(low: number | null | undefined, high: number | null | undefined, currency: string) {
  if (low == null || high == null || !Number.isFinite(low) || !Number.isFinite(high)) return "—";
  return `${formatPrice(low, currency)} – ${formatPrice(high, currency)}`;
}

function clampPercent(value: number, threshold: number) {
  return Math.max(0, Math.min(100, (value / threshold) * 100));
}

function ratioTone(value: number, threshold: number): RatioRow["tone"] {
  if (value <= threshold * 0.7) return "pass";
  if (value <= threshold) return "warn";
  return "fail";
}

function ratioBadge(tone: RatioRow["tone"]) {
  if (tone === "pass") return "Pass";
  if (tone === "warn") return "Borderline";
  return "Fail";
}

function buildRatioRows(stock: Stock, screening: ScreeningResult): RatioRow[] {
  const b = screening.breakdown;
  const sectorTone: RatioRow["tone"] = b.sector_allowed ? "pass" : screening.status === "CAUTIOUS" ? "warn" : "fail";

  return [
    {
      key: "debt",
      name: "Debt Ratio",
      desc: "Interest-bearing debt compared to current market value. Must stay below 33%.",
      valueLabel: formatRatio(b.debt_to_market_cap_ratio),
      thresholdLabel: "Threshold: 33%",
      tone: ratioTone(b.debt_to_market_cap_ratio, 0.33),
      badge: ratioBadge(ratioTone(b.debt_to_market_cap_ratio, 0.33)),
      fillPct: clampPercent(b.debt_to_market_cap_ratio, 0.33),
    },
    {
      key: "interest-income",
      name: "Interest Income",
      desc: "Interest and treasury-based income as a share of business income. Must stay below 5%.",
      valueLabel: formatRatio(b.interest_income_ratio),
      thresholdLabel: "Threshold: 5%",
      tone: ratioTone(b.interest_income_ratio, 0.05),
      badge: ratioBadge(ratioTone(b.interest_income_ratio, 0.05)),
      fillPct: clampPercent(b.interest_income_ratio, 0.05),
    },
    {
      key: "non-permissible",
      name: "Non-permissible Income",
      desc: "Non-halal income compared to total business income. Must stay below 5%.",
      valueLabel: formatRatio(b.non_permissible_income_ratio),
      thresholdLabel: "Threshold: 5%",
      tone: ratioTone(b.non_permissible_income_ratio, 0.05),
      badge: ratioBadge(ratioTone(b.non_permissible_income_ratio, 0.05)),
      fillPct: clampPercent(b.non_permissible_income_ratio, 0.05),
    },
    {
      key: "receivables",
      name: "Accounts Receivable",
      desc: "Receivables compared to market value. Must stay below 33%.",
      valueLabel: formatRatio(b.receivables_to_market_cap_ratio),
      thresholdLabel: "Threshold: 33%",
      tone: ratioTone(b.receivables_to_market_cap_ratio, 0.33),
      badge: ratioBadge(ratioTone(b.receivables_to_market_cap_ratio, 0.33)),
      fillPct: clampPercent(b.receivables_to_market_cap_ratio, 0.33),
    },
    {
      key: "business-activity",
      name: "Business Activity",
      desc: "Core business lines should avoid prohibited sectors and interest-driven revenue dependence.",
      valueLabel: b.sector_allowed ? "Allowed" : "Mixed",
      tone: sectorTone,
      badge: sectorTone === "pass" ? "Pass" : sectorTone === "warn" ? "Review" : "Fail",
    },
    {
      key: "cash-assets",
      name: "Cash & Interest-bearing Assets",
      desc: "Cash, equivalents, and interest-bearing balances compared to total assets. Must stay below 33%.",
      valueLabel: formatRatio(b.cash_and_interest_bearing_to_assets_ratio),
      thresholdLabel: "Threshold: 33%",
      tone: ratioTone(b.cash_and_interest_bearing_to_assets_ratio, 0.33),
      badge: ratioBadge(ratioTone(b.cash_and_interest_bearing_to_assets_ratio, 0.33)),
      fillPct: clampPercent(b.cash_and_interest_bearing_to_assets_ratio, 0.33),
    },
  ];
}

function buildVerdictExplanation(stock: Stock, screening: ScreeningResult) {
  const reasons = screening.reasons.length ? screening.reasons : ["No hard-rule violations were reported by the current screening run."];
  const reviewFlags = screening.manual_review_flags.length
    ? `Manual review flags: ${screening.manual_review_flags.join(", ")}.`
    : "";
  return `${stock.name} currently screens as ${screeningUiLabel(screening.status).toLowerCase()} on BarakFi. ${reasons.join(" ")} ${reviewFlags}`.trim();
}

function buildAboutParagraphs(stock: Stock) {
  const capTier = capTierLabel(stock.market_cap, stock.currency);
  const country = displayCountryForStock(stock.exchange, stock.country);
  const indexLine = stock.index_memberships && stock.index_memberships.length > 0
    ? stock.index_memberships.slice(0, 3).join(" · ")
    : "Broad market universe";

  return [
    `${stock.name} (${stock.symbol}) is listed on ${stock.exchange} and operates in the ${stock.sector} sector, with BarakFi classifying it as a ${capTier.toLowerCase()} name in ${country}.`,
    `This page brings together filing-driven screening ratios, market-cap context, and live quote snapshots so you can review the stock from a Shariah-screening perspective without losing the company and market background around it.`,
    `Index and universe context: ${indexLine}. Data source: ${stock.data_source || "BarakFi pipeline"}.`,
  ];
}

function buildAboutContent(stock: Stock) {
  const summary = stock.company_summary?.trim();
  if (!summary) return buildAboutParagraphs(stock);

  const summaryParagraphs = summary
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (summaryParagraphs.length === 0) {
    return buildAboutParagraphs(stock);
  }

  const indexLine = stock.index_memberships && stock.index_memberships.length > 0
    ? stock.index_memberships.slice(0, 3).join(" · ")
    : "Broad market universe";

  return [
    ...summaryParagraphs,
    "BarakFi combines that company context with filing-driven screening ratios, market-cap evidence, and live quote snapshots so you can review the stock through a Shariah-screening lens without losing the underlying business picture.",
    `Index and universe context: ${indexLine}. Data source: ${stock.data_source || "BarakFi pipeline"}.`,
  ];
}

function statusMeta(status: string) {
  return STATUS_META[status] ?? STATUS_META.CAUTIOUS;
}

function sidebarMetricValue(stock: Stock, screening: ScreeningResult, ratioKey: RatioRow["key"]) {
  const rows = buildRatioRows(stock, screening);
  return rows.find((row) => row.key === ratioKey)?.valueLabel ?? "—";
}

function RailIcon({ kind }: { kind: RailIconName }) {
  if (kind === "compliance") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></svg>;
  }
  if (kind === "market") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
  }
  if (kind === "about") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
  }
  if (kind === "similar") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>;
  }
  if (kind === "watchlist") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>;
}

export function StockPageHtml({ stock, screening, liveQuote, indices, similarStocks, isInWatchlist }: Props) {
  const tickerItems = indices.length > 0 ? indices : FALLBACK_TICKER;
  const quoteCurrency = liveQuote?.currency?.trim() || stock.currency || "INR";
  const displayPrice = liveQuote?.last_price ?? stock.price;
  const status = statusMeta(screening.status);
  const ratioRows = buildRatioRows(stock, screening);
  const aboutParagraphs = buildAboutContent(stock);
  const lastScreened = formatFundamentalsLastUpdatedIst(stock.fundamentals_updated_at) ?? "Awaiting synced fundamentals";
  const shareUrl = `https://barakfi.in/stocks/${encodeURIComponent(stock.symbol)}`;
  const sectorLink = `/screener?sector=${encodeURIComponent(stock.sector)}`;
  const marketCapLabel = formatFundamentalAmountCompact(stock.market_cap, stock.currency);
  const averageMarketCapLabel = formatFundamentalAmountCompact(stock.average_market_cap_36m, stock.currency);
  const toneClass = toneClassName(screening.status);
  const displayPeRatio = stock.pe_ratio != null && Number.isFinite(stock.pe_ratio)
    ? `${stock.pe_ratio.toFixed(1)}×`
    : stock.eps != null && Number.isFinite(stock.eps) && displayPrice > 0
      ? `${(displayPrice / stock.eps).toFixed(1)}×`
      : "—";

  return (
    <main className={styles.stockPage}>
      <div className={styles.localTicker} aria-label="Market ticker">
        <div className={styles.localTickerTrack}>
          {[...tickerItems, ...tickerItems].map((item, index) => {
            const change = item.change_percent ?? 0;
            return (
              <span className={styles.localTickerItem} key={`${item.name}-${index}`}>
                <b>{item.name}</b>
                {formatTickerValue(item.value)}
                <span className={change >= 0 ? styles.tickerUp : styles.tickerDown}>{formatPercent(change)}</span>
              </span>
            );
          })}
        </div>
      </div>

      <nav className={styles.localNav} aria-label="Stock page navigation">
        <Link className={styles.localLogo} href="/">
          Barak<span className={styles.localLogoAccent}>Fi</span>
        </Link>
        <div className={styles.localNavRight}>
          <div className={styles.localNavLinks}>
            <Link className={styles.localNavLink} href="/screener">Screener</Link>
            <Link className={styles.localNavLink} href="/watchlist">Watchlist</Link>
            <Link className={styles.localNavLink} href="/methodology">Methodology</Link>
            <Link className={`${styles.localNavLink} ${styles.localNavCta}`} href="/screener">Open Screener</Link>
          </div>
          <RouteLocalAuth
            className={styles.localNavAuth}
            ghostClassName={`${styles.localNavLink} ${styles.localNavAuthGhost}`}
            primaryClassName={`${styles.localNavLink} ${styles.localNavAuthPrimary}`}
            userClassName={styles.localNavUser}
          />
        </div>
      </nav>

      <div className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>›</span>
        <Link href="/screener">Screener</Link>
        <span>›</span>
        <Link href={sectorLink}>{stock.sector}</Link>
        <span>›</span>
        <span className={styles.breadcrumbCurrent}>{stock.symbol}</span>
      </div>

      <section className={styles.stockHero}>
        <div className={styles.stockHeroTop}>
          <div>
            <div className={styles.stockIdentity}>
              <div className={styles.stockLogoWrap}>
                <StockLogo symbol={stock.symbol} size={52} exchange={stock.exchange} />
              </div>
              <div className={styles.stockNameBlock}>
                <div className={styles.stockTickerTag}>
                  {stock.symbol}
                  <span className={styles.exchangeTag}>{stock.exchange}</span>
                  {stock.exchange_code ? <span className={styles.exchangeTag}>{stock.exchange_code}</span> : null}
                </div>
                <h1 className={styles.stockFullName}>{stock.name}</h1>
                <div className={styles.stockSector}>
                  {stock.sector} · {capTierLabel(stock.market_cap, stock.currency)} · {displayCountryForStock(stock.exchange, stock.country)}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.priceBlock}>
            <div className={styles.priceMain}>{formatPrice(displayPrice, quoteCurrency)}</div>
            <div className={liveQuote?.change_percent != null && liveQuote.change_percent < 0 ? styles.priceChangeDown : styles.priceChangeUp}>
              {liveQuote?.change != null ? `${liveQuote.change >= 0 ? "▲" : "▼"} ${formatPrice(Math.abs(liveQuote.change), quoteCurrency)} ` : ""}
              {liveQuote?.change_percent != null ? `(${formatPercent(liveQuote.change_percent)}) today` : "Live quote unavailable"}
            </div>
            <div className={styles.priceMeta}>
              Day Range: {formatRange(liveQuote?.day_low, liveQuote?.day_high, quoteCurrency)}
              <br />
              Volume: {formatVolume(liveQuote?.volume, quoteCurrency)} · as of {liveQuote?.as_of ? new Date(liveQuote.as_of).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "latest sync"}
            </div>
            <div className={styles.actionButtonsWrap}>
              <StockPageActionButtons
                symbol={stock.symbol}
                stockName={stock.name}
                initialInWatchlist={isInWatchlist}
                shareUrl={shareUrl}
              />
            </div>
          </div>
        </div>

        <div className={styles.verdictBar}>
          <div className={styles.verdictCell}>
            <div>
              <div className={styles.verdictLabel}>Shariah Status</div>
              <div className={styles.verdictBadgeRow}>
                <span className={`${styles.verdictBadge} ${status.badgeClass}`}>
                  <span className={`${styles.verdictDot} ${status.dotClass}`} />
                  {status.label}
                </span>
              </div>
            </div>
          </div>
          <div className={styles.verdictCell}>
            <div className={styles.verdictCellInner}>
              <div className={styles.verdictLabel}>Last Screened</div>
              <div className={styles.verdictValue}>{lastScreened}</div>
            </div>
          </div>
          <div className={`${styles.verdictCell} ${styles.verdictCellRight}`}>
            <div>
              <div className={styles.verdictLabel}>Methodology</div>
              <div className={styles.verdictValue}>AAOIFI aligned · {PRIMARY_METHODOLOGY_VERSION}</div>
              <div className={styles.verdictButtonRow}>
                <a className={styles.actionSolidButton} href="#compliance-breakdown">See Full Breakdown</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.contentGrid}>
        <aside className={styles.leftRail} aria-label="Section navigation">
          <div className={styles.railVerdict}>
            <div className={`${styles.railVerdictDot} ${status.dotClass}`} />
            <div className={styles.railTooltip}>{status.label}</div>
          </div>
          <div className={styles.railDivider} />
          <a className={styles.railIcon} href="#compliance-breakdown"><RailIcon kind="compliance" /><div className={styles.railTooltip}>Compliance</div></a>
          <a className={styles.railIcon} href="#market-data"><RailIcon kind="market" /><div className={styles.railTooltip}>Market Data</div></a>
          <a className={styles.railIcon} href="#about-company"><RailIcon kind="about" /><div className={styles.railTooltip}>About</div></a>
          <a className={styles.railIcon} href="#similar-stocks"><RailIcon kind="similar" /><div className={styles.railTooltip}>Similar Stocks</div></a>
          <div className={styles.railDivider} />
          <Link className={styles.railIcon} href="/watchlist"><RailIcon kind="watchlist" /><div className={styles.railTooltip}>Add to Watchlist</div></Link>
          <a className={styles.railIcon} href={shareUrl}><RailIcon kind="share" /><div className={styles.railTooltip}>Share</div></a>
        </aside>

        <div className={styles.contentMain}>
          <section id="compliance-breakdown" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>Shariah Compliance Breakdown</div>
            <div className={styles.ratioGrid}>
              {ratioRows.map((row) => (
                <div key={row.key} className={styles.ratioRow}>
                  <div>
                    <div className={styles.ratioName}>{row.name}</div>
                    <div className={styles.ratioDesc}>{row.desc}</div>
                    {typeof row.fillPct === "number" ? (
                      <div className={styles.ratioBarWrap}>
                        <div className={styles.ratioBarTrack}>
                          <div className={`${styles.ratioBarFill} ${row.tone === "pass" ? styles.ratioBarFillPass : row.tone === "warn" ? styles.ratioBarFillWarn : styles.ratioBarFillFail}`} style={{ width: `${row.fillPct}%` }} />
                        </div>
                        <span className={styles.ratioThreshold}>{row.thresholdLabel}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className={`${styles.ratioValue} ${row.tone === "pass" ? styles.ratioValuePass : row.tone === "warn" ? styles.ratioValueWarn : styles.ratioValueFail}`}>{row.valueLabel}</div>
                  <div className={styles.ratioStatus}><span className={`${styles.ratioBadge} ${row.tone === "pass" ? styles.ratioBadgePass : row.tone === "warn" ? styles.ratioBadgeWarn : styles.ratioBadgeFail}`}>{row.badge}</span></div>
                </div>
              ))}
            </div>
            <div className={`${styles.verdictExplain} ${toneClass}`}>
              <div className={`${styles.verdictExplainTitle} ${toneClass}`}>Why {status.label}</div>
              <div className={styles.verdictExplainBody}>{buildVerdictExplanation(stock, screening)}</div>
            </div>
          </section>

          <section id="market-data" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>Market Data</div>
            <div className={styles.priceStats}>
              <div className={styles.priceStatCell}><div className={styles.priceStatLabel}>Current Price</div><div className={styles.priceStatValue}>{formatPrice(displayPrice, quoteCurrency)}</div></div>
              <div className={styles.priceStatCell}><div className={styles.priceStatLabel}>Day Range</div><div className={`${styles.priceStatValue} ${styles.priceStatValueSmall}`}>{formatRange(liveQuote?.day_low, liveQuote?.day_high, quoteCurrency)}</div></div>
              <div className={styles.priceStatCell}><div className={styles.priceStatLabel}>52-Week Range</div><div className={`${styles.priceStatValue} ${styles.priceStatValueSmall}`}>{formatRange(liveQuote?.week_52_low ?? stock.week_52_low, liveQuote?.week_52_high ?? stock.week_52_high, quoteCurrency)}</div></div>
              <div className={styles.priceStatCell}><div className={styles.priceStatLabel}>Volume</div><div className={styles.priceStatValue}>{formatVolume(liveQuote?.volume ?? stock.avg_volume, quoteCurrency)}</div></div>
              <div className={styles.priceStatCell}><div className={styles.priceStatLabel}>Market Cap</div><div className={styles.priceStatValue}>{marketCapLabel}</div></div>
              <div className={styles.priceStatCell}><div className={styles.priceStatLabel}>P/E Ratio</div><div className={styles.priceStatValue}>{displayPeRatio}</div></div>
            </div>
          </section>

          <section id="about-company" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>About {stock.name}</div>
            <div className={styles.aboutBody}>
              {aboutParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className={styles.aboutTags}>
              <span className={styles.aboutTag}>{stock.sector}</span>
              <span className={styles.aboutTag}>{capTierLabel(stock.market_cap, stock.currency)}</span>
              <span className={styles.aboutTag}>{displayCountryForStock(stock.exchange, stock.country)}</span>
              <span className={styles.aboutTag}>{stock.exchange}</span>
              {stock.index_memberships?.slice(0, 3).map((membership) => (
                <span key={membership} className={styles.aboutTag}>{membership}</span>
              ))}
            </div>
          </section>

          <section id="similar-stocks" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>Other Stocks in {stock.sector}</div>
            <div className={styles.similarList}>
              {similarStocks.length > 0 ? similarStocks.map(({ stock: peer, screening: peerScreening }) => {
                const peerStatus = statusMeta(peerScreening?.status || "CAUTIOUS");
                return (
                  <Link key={peer.symbol} href={`/stocks/${encodeURIComponent(peer.symbol)}`} className={styles.similarItem}>
                    <div>
                      <div className={styles.similarTicker}>{peer.symbol}</div>
                      <div className={styles.similarName}>{peer.name}</div>
                    </div>
                    <span className={`${styles.similarBadge} ${peerStatus.badgeClass}`}>{peerStatus.shortLabel}</span>
                  </Link>
                );
              }) : <div className={styles.emptySimilar}>No nearby sector peers available yet.</div>}
            </div>
          </section>
        </div>

        <aside className={styles.contentSidebar}>
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardHead}>Key Compliance Ratios</div>
            <div className={styles.sidebarCardBody}>
              <div className={styles.sidebarRow}><span className={styles.sidebarLabel}>Debt Ratio</span><span className={styles.sidebarValue}>{sidebarMetricValue(stock, screening, "debt")}</span></div>
              <div className={styles.sidebarRow}><span className={styles.sidebarLabel}>Interest Income</span><span className={styles.sidebarValue}>{sidebarMetricValue(stock, screening, "interest-income")}</span></div>
              <div className={styles.sidebarRow}><span className={styles.sidebarLabel}>Non-permissible Income</span><span className={styles.sidebarValue}>{sidebarMetricValue(stock, screening, "non-permissible")}</span></div>
              <div className={styles.sidebarRow}><span className={styles.sidebarLabel}>Receivables Ratio</span><span className={styles.sidebarValue}>{sidebarMetricValue(stock, screening, "receivables")}</span></div>
              <div className={styles.sidebarRow}><span className={styles.sidebarLabel}>Overall Status</span><span className={styles.sidebarValue}>{status.shortLabel}</span></div>
            </div>
          </div>

          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardHead}>Stock Information</div>
            <div className={styles.sidebarCardBody}>
              <div className={styles.sidebarRow}><span className={styles.sidebarLabel}>Ticker</span><span className={styles.sidebarValue}>{stock.symbol}</span></div>
              <div className={styles.sidebarRow}><span className={styles.sidebarLabel}>Exchange</span><span className={styles.sidebarValue}>{stock.exchange_code ? `${stock.exchange} · ${stock.exchange_code}` : stock.exchange}</span></div>
              <div className={styles.sidebarRow}><span className={styles.sidebarLabel}>Sector</span><span className={styles.sidebarValue}>{stock.sector}</span></div>
              <div className={styles.sidebarRow}><span className={styles.sidebarLabel}>Country</span><span className={styles.sidebarValue}>{displayCountryForStock(stock.exchange, stock.country)}</span></div>
              <div className={styles.sidebarRow}><span className={styles.sidebarLabel}>Market Cap</span><span className={styles.sidebarValue}>{marketCapLabel}</span></div>
              <div className={styles.sidebarRow}><span className={styles.sidebarLabel}>36M Avg MCap</span><span className={styles.sidebarValue}>{averageMarketCapLabel}</span></div>
              <div className={styles.sidebarRow}><span className={styles.sidebarLabel}>Cap Size</span><span className={styles.sidebarValue}>{capTierLabel(stock.market_cap, stock.currency)}</span></div>
            </div>
          </div>

          <div className={styles.methodNote}>
            <div className={styles.methodNoteTitle}>About this Screening</div>
            <div className={styles.methodNoteBody}>
              This page uses an <strong>AAOIFI-aligned</strong> methodology version <strong>{PRIMARY_METHODOLOGY_VERSION}</strong>, checking debt, interest income, non-permissible income, receivables, and balance-sheet context from the current filings dataset.
              <br /><br />
              This is <strong>educational only</strong> — not a religious ruling or financial advice. Read the full methodology for threshold context and update cadence.
              <br /><br />
              <Link href="/methodology">Read full methodology →</Link>
            </div>
          </div>

          <div className={styles.watchlistCta} id="watchlist-cta">
            <div className={styles.watchlistTitle}>Track this stock</div>
            <div className={styles.watchlistBody}>Add {stock.symbol} to your watchlist so you can revisit its status after the next fundamentals sync.</div>
            <Link className={styles.watchlistLinkButton} href="/watchlist">Open Watchlist</Link>
          </div>
        </aside>
      </div>

      <div className={styles.disclaimer}>
        <strong>Disclaimer:</strong> The information on this page is for educational purposes only and does not constitute a religious ruling (fatwa) or financial advice. Shariah compliance status is derived from publicly available financial data and BarakFi&apos;s methodology mapping. Individual scholars may reach different conclusions. Always consult a qualified Islamic finance scholar and a licensed financial advisor before making investment decisions.
      </div>

      <footer className={styles.footer}>
        <div>
          <div className={styles.footerBrand}>Barak<span className={styles.localLogoAccent}>Fi</span></div>
          <div className={styles.footerSub}>Shariah-compliant stock research for Indian equities. Educational only.</div>
        </div>
        <div className={styles.footerCols}>
          <div className={styles.footerCol}>
            <div className={styles.footerColHead}>Product</div>
            <Link href="/screener">Screener</Link>
            <Link href="/watchlist">Watchlist</Link>
            <Link href="/compare">Compare</Link>
          </div>
          <div className={styles.footerCol}>
            <div className={styles.footerColHead}>Learn</div>
            <Link href="/methodology">Methodology</Link>
            <Link href="/about-us">About</Link>
          </div>
          <div className={styles.footerCol}>
            <div className={styles.footerColHead}>Legal</div>
            <Link href="/privacy">Privacy</Link>
            <Link href="/disclaimer">Disclaimer</Link>
          </div>
        </div>
      </footer>

      <div className={styles.footerBottom}>
        <span>© 2026 BarakFi · Educational screening · Not a religious ruling or financial advice</span>
        <span>Made in India</span>
      </div>
    </main>
  );
}

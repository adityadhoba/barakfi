import Link from "next/link";
import { Logo } from "@/components/logo";
import { getStocks, getBulkScreeningResults } from "@/lib/api";
import type { ScreeningResult, Stock } from "@/lib/api";
import { AnimatedCounter } from "@/components/animated-counter";
import { AdUnit } from "@/components/ad-unit";
import styles from "./home-dashboard.module.css";

const MAX_SCREEN_ON_HOME = 100;

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMcap(value: number) {
  if (value >= 1e7) return `\u20B9${(value / 1e7).toFixed(0)} Cr`;
  if (value >= 1e5) return `\u20B9${(value / 1e5).toFixed(1)} L`;
  return formatPrice(value);
}

type Screened = Stock & { screening: ScreeningResult };

async function loadScreenedUniverse(stocks: Stock[]): Promise<{
  screened: Screened[];
  skippedFullStats: boolean;
}> {
  if (stocks.length > MAX_SCREEN_ON_HOME) {
    return { screened: [], skippedFullStats: true };
  }
  // Single bulk request instead of N individual calls
  const symbols = stocks.map((s) => s.symbol);
  const screeningResults = await getBulkScreeningResults(symbols);
  const screeningMap = new Map(screeningResults.map((r) => [r.symbol, r]));
  const screened: Screened[] = [];
  for (const stock of stocks) {
    const screening = screeningMap.get(stock.symbol);
    if (screening) screened.push({ ...stock, screening });
  }
  return { screened, skippedFullStats: false };
}

type Props = {
  isSignedIn: boolean;
};

export async function HomeDashboard({ isSignedIn }: Props) {
  const stocks = await getStocks();
  const { screened, skippedFullStats } = await loadScreenedUniverse(stocks);
  const total = stocks.length;

  let halal = 0;
  let review = 0;
  let fail = 0;
  for (const s of screened) {
    if (s.screening.status === "HALAL") halal++;
    else if (s.screening.status === "REQUIRES_REVIEW") review++;
    else fail++;
  }
  const hasStats = screened.length > 0;
  const compliancePct = hasStats ? Math.round((halal / screened.length) * 100) : null;

  const sectorSet = new Set(stocks.map((s) => s.sector));
  const sectorCount = sectorSet.size;

  const topHalal = hasStats
    ? [...screened].filter((s) => s.screening.status === "HALAL").sort((a, b) => b.market_cap - a.market_cap).slice(0, 6)
    : [...stocks].sort((a, b) => b.market_cap - a.market_cap).slice(0, 6);

  return (
    <div className={styles.home}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            Shariah-Compliant Indian Equities
          </div>
          <h1 className={styles.heroTitle}>
            {isSignedIn ? (
              <>Welcome back.</>
            ) : (
              <>
                Invest with <span className={styles.heroGradient}>clarity</span> and <span className={styles.heroGradient}>conviction</span>.
              </>
            )}
          </h1>
          <p className={styles.heroSub}>
            Screen Indian stocks against S&amp;P Shariah rules. Track compliance in real-time.
            Build a portfolio that aligns with your values.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/screener" className={styles.heroCtaPrimary}>
              Open Screener
              <span className={styles.heroCtaArrow}>&rarr;</span>
            </Link>
            {!isSignedIn && (
              <Link href="/sign-up" className={styles.heroCtaSecondary}>
                Create free account
              </Link>
            )}
            {isSignedIn && (
              <Link href="/workspace" className={styles.heroCtaSecondary}>
                My Portfolio
              </Link>
            )}
          </div>

          {/* Social Proof Numbers */}
          <div className={styles.socialProof}>
            <div className={styles.proofItem}>
              <span className={styles.proofValue}>
                <AnimatedCounter end={total} suffix="+" />
              </span>
              <span className={styles.proofLabel}>Stocks Screened</span>
            </div>
            <span className={styles.proofDivider} />
            <div className={styles.proofItem}>
              <span className={styles.proofValue}>
                <AnimatedCounter end={sectorCount} />
              </span>
              <span className={styles.proofLabel}>Sectors Covered</span>
            </div>
            <span className={styles.proofDivider} />
            <div className={styles.proofItem}>
              <span className={styles.proofValue}>
                <AnimatedCounter end={5} />
              </span>
              <span className={styles.proofLabel}>Compliance Ratios</span>
            </div>
            {compliancePct != null && (
              <>
                <span className={styles.proofDivider} />
                <div className={styles.proofItem}>
                  <span className={styles.proofValue}>
                    <AnimatedCounter end={compliancePct} suffix="%" />
                  </span>
                  <span className={styles.proofLabel}>Pass Rate</span>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Ad: after hero ── */}
      <AdUnit format="responsive" />

      {/* ── Feature Showcase ── */}
      <section className={styles.features}>
        <div className={styles.featuresHeader}>
          <span className={styles.featuresKicker}>Why Barakfi</span>
          <h2 className={styles.featuresTitle}>
            Everything you need for compliant investing
          </h2>
        </div>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={`${styles.featureIcon} ${styles.featureIconScreen}`}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            </div>
            <h3 className={styles.featureTitle}>Shariah Screening</h3>
            <p className={styles.featureDesc}>
              Every stock tested against 5 S&amp;P financial ratios plus sector exclusions. Instant pass/fail with full transparency.
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={`${styles.featureIcon} ${styles.featureIconPortfolio}`}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
            </div>
            <h3 className={styles.featureTitle}>Portfolio Tracker</h3>
            <p className={styles.featureDesc}>
              Add research notes, record your reasoning, and track compliance drift across your entire portfolio.
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={`${styles.featureIcon} ${styles.featureIconChart}`}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
            </div>
            <h3 className={styles.featureTitle}>Price Charts</h3>
            <p className={styles.featureDesc}>
              Interactive candlestick charts powered by TradingView. 52-week data, volume, and key technical levels at a glance.
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={`${styles.featureIcon} ${styles.featureIconWatch}`}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <h3 className={styles.featureTitle}>Watchlist Alerts</h3>
            <p className={styles.featureDesc}>
              Bookmark stocks you&apos;re researching. Track compliance changes and never miss when a stock flips status.
            </p>
          </div>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <section className={styles.statsGrid}>
        <Link href="/screener" className={styles.statCard}>
          <span className={styles.statIcon}>&#x25A3;</span>
          <div className={styles.statBody}>
            <span className={styles.statLabel}>Universe</span>
            <span className={styles.statValue}>{total}</span>
            <span className={styles.statSub}>Stocks screened</span>
          </div>
        </Link>
        <Link href="/screener?status=HALAL" className={`${styles.statCard} ${styles.statCardHalal}`}>
          <span className={`${styles.statIcon} ${styles.statIconHalal}`}>&#x2713;</span>
          <div className={styles.statBody}>
            <span className={styles.statLabel}>Halal</span>
            <span className={`${styles.statValue} ${styles.valueHalal}`}>{hasStats ? halal : "\u2014"}</span>
            <span className={styles.statSub}>{skippedFullStats ? "Open screener" : "Pass all rules"}</span>
          </div>
        </Link>
        <Link href="/screener?status=REQUIRES_REVIEW" className={`${styles.statCard} ${styles.statCardReview}`}>
          <span className={`${styles.statIcon} ${styles.statIconReview}`}>?</span>
          <div className={styles.statBody}>
            <span className={styles.statLabel}>Review</span>
            <span className={`${styles.statValue} ${styles.valueReview}`}>{hasStats ? review : "\u2014"}</span>
            <span className={styles.statSub}>Need verification</span>
          </div>
        </Link>
        <Link href="/screener?status=NON_COMPLIANT" className={`${styles.statCard} ${styles.statCardFail}`}>
          <span className={`${styles.statIcon} ${styles.statIconFail}`}>&#x2717;</span>
          <div className={styles.statBody}>
            <span className={styles.statLabel}>Avoid</span>
            <span className={`${styles.statValue} ${styles.valueFail}`}>{hasStats ? fail : "\u2014"}</span>
            <span className={styles.statSub}>Outside rules</span>
          </div>
        </Link>
      </section>

      {/* ── Compliance Pulse ── */}
      {compliancePct != null && (
        <section className={styles.pulse}>
          <div className={styles.pulseRing}>
            <svg viewBox="0 0 36 36" className={styles.pulseRingSvg} role="img" aria-label={`Compliance rate: ${compliancePct}%`}>
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--line)"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="3"
                strokeDasharray={`${compliancePct}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className={styles.pulseRingText}>{compliancePct}%</span>
          </div>
          <div className={styles.pulseBody}>
            <span className={styles.pulseLabel}>Compliance Rate</span>
            <span className={styles.pulseTitle}>
              {compliancePct >= 45 ? "Wide halal choice" : compliancePct >= 25 ? "Selective universe" : "Strict screening"}
            </span>
            <span className={styles.pulseSub}>
              {compliancePct >= 45
                ? "Many stocks pass the strict Shariah screen. Explore sectors in the screener."
                : compliancePct >= 25
                  ? "Quality matters more than quantity \u2014 filter by compliance and sector."
                  : "Most stocks need review. Use the screener to find compliant options."}
            </span>
          </div>
          <Link href="/screener" className={styles.pulseCta}>
            View all &rarr;
          </Link>
        </section>
      )}

      {/* ── Top Stocks ── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            {hasStats ? "Top Halal Stocks" : "Largest by Market Cap"}
          </h2>
          <Link href="/screener" className={styles.seeAll}>Full list &rarr;</Link>
        </div>
        <div className={styles.stockGrid}>
          {topHalal.map((row) => {
            const scr = 'screening' in row ? (row as Screened) : null;
            return (
              <Link className={styles.stockItem} href={`/stocks/${encodeURIComponent(row.symbol)}`} key={row.symbol}>
                <div className={styles.stockItemTop}>
                  <div className={styles.stockAvatar}>
                    {row.symbol.slice(0, 2).toUpperCase()}
                  </div>
                  <div className={styles.stockIdentity}>
                    <span className={styles.stockSymbol}>{row.symbol}</span>
                    <span className={styles.stockName}>{row.name}</span>
                  </div>
                </div>
                <div className={styles.stockItemBottom}>
                  <div className={styles.stockPrice}>{formatPrice(row.price)}</div>
                  <div className={styles.stockMcap}>{formatMcap(row.market_cap)}</div>
                </div>
                {scr && (
                  <div className={styles.stockStatus}>
                    <span className={`${styles.statusDot} ${
                      scr.screening.status === 'HALAL' ? styles.statusDotHalal
                      : scr.screening.status === 'REQUIRES_REVIEW' ? styles.statusDotReview
                      : styles.statusDotFail
                    }`} />
                    {scr.screening.status === 'HALAL' ? 'Halal' : scr.screening.status === 'REQUIRES_REVIEW' ? 'Review' : 'Avoid'}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Ad: between sections ── */}
      <AdUnit format="rectangle" />

      {/* ── How It Works ── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
        </div>
        <div className={styles.howGrid}>
          <div className={styles.howCard}>
            <span className={styles.howStep}>1</span>
            <h3 className={styles.howTitle}>Screen</h3>
            <p className={styles.howDesc}>We pull financial data for Indian stocks and run them through S&amp;P Shariah screening rules — debt, income purity, receivables, and sector checks.</p>
          </div>
          <div className={styles.howCard}>
            <span className={styles.howStep}>2</span>
            <h3 className={styles.howTitle}>Research</h3>
            <p className={styles.howDesc}>Dive into any stock to see detailed compliance gauges, 52-week charts, financial breakdowns, and manual review flags — everything in one place.</p>
          </div>
          <div className={styles.howCard}>
            <span className={styles.howStep}>3</span>
            <h3 className={styles.howTitle}>Decide</h3>
            <p className={styles.howDesc}>Add research notes, track your halal portfolio over time, and run compliance checks. Your reasoning is always recorded.</p>
          </div>
        </div>
      </section>

      {/* ── Trust & Methodology Bar ── */}
      <section className={styles.trustBar}>
        <div className={styles.trustItem}>
          <span className={styles.trustIcon}>&#x1F6E1;</span>
          <div className={styles.trustText}>
            <span className={styles.trustTitle}>S&amp;P Shariah Methodology</span>
            <span className={styles.trustDesc}>Industry-standard screening rules</span>
          </div>
        </div>
        <div className={styles.trustItem}>
          <span className={styles.trustIcon}>&#x1F512;</span>
          <div className={styles.trustText}>
            <span className={styles.trustTitle}>Secure &amp; Private</span>
            <span className={styles.trustDesc}>Your portfolio data stays yours</span>
          </div>
        </div>
        <div className={styles.trustItem}>
          <span className={styles.trustIcon}>&#x26A1;</span>
          <div className={styles.trustText}>
            <span className={styles.trustTitle}>Real-Time Data</span>
            <span className={styles.trustDesc}>Live prices from NSE &amp; Yahoo Finance</span>
          </div>
        </div>
        <div className={styles.trustItem}>
          <span className={styles.trustIcon}>&#x1F4F1;</span>
          <div className={styles.trustText}>
            <span className={styles.trustTitle}>Mobile-First PWA</span>
            <span className={styles.trustDesc}>Install on any device, works offline</span>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <Logo size={24} showText />
            <p className={styles.footerTagline}>Shariah-compliant equity screening for the Indian market.</p>
          </div>
          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <span className={styles.footerColTitle}>Product</span>
              <Link href="/screener" className={styles.footerLink}>Screener</Link>
              <Link href="/watchlist" className={styles.footerLink}>Watchlist</Link>
              <Link href="/workspace" className={styles.footerLink}>Portfolio</Link>
            </div>
            <div className={styles.footerCol}>
              <span className={styles.footerColTitle}>Resources</span>
              <Link href="/methodology" className={styles.footerLink}>Methodology</Link>
              <Link href="/compare" className={styles.footerLink}>Compare Stocks</Link>
              <Link href="/tools" className={styles.footerLink}>Calculators</Link>
              <Link href="/shariah-compliance" className={styles.footerLink}>Shariah Compliance</Link>
            </div>
            <div className={styles.footerCol}>
              <span className={styles.footerColTitle}>Legal</span>
              <Link href="/terms" className={styles.footerLink}>Terms of Service</Link>
              <Link href="/privacy" className={styles.footerLink}>Privacy Policy</Link>
              <Link href="/disclaimer" className={styles.footerLink}>Risk Disclaimer</Link>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>Built for disciplined investors. Always confirm with your scholar or advisor before investing.</p>
          <p>Screening methodology anchored to S&amp;P Shariah Indices. &copy; {new Date().getFullYear()} Barakfi.</p>
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";
import { Logo } from "@/components/logo";
import { getStocks, getBulkScreeningResults, getTrending, getCollections, getSuperInvestors, getETFs, getNewsFeed } from "@/lib/api";
import type { ScreeningResult, Stock } from "@/lib/api";
import { AnimatedCounter } from "@/components/animated-counter";
import { AdUnit } from "@/components/ad-unit";
import { StockLogo } from "@/components/stock-logo";
import {
  StatIconAvoid,
  StatIconCautious,
  StatIconHalal,
  StatIconUniverse,
} from "@/components/home-stats-icons";
import { CollectionIcon } from "@/components/collection-icon";
import { NewsCarousel } from "@/app/news/news-carousel";
import { HomeHeroAuth } from "@/components/home-hero-auth";
import { HomeTopStocksLive } from "@/components/home-top-stocks-live";
import styles from "./home-dashboard.module.css";

const MAX_SCREEN_ON_HOME = 500;

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

export async function HomeDashboard() {
  const [stocks, trendingStocks, collections, investors, etfs, newsResult] = await Promise.all([
    getStocks(),
    getTrending("popular", undefined, 6),
    getCollections(),
    getSuperInvestors(),
    getETFs(),
    getNewsFeed(12),
  ]);
  const newsFeed = newsResult.items;
  const newsLoadStatus = newsResult.loadStatus;
  const newsErrorHint = newsResult.errorHint;
  const { screened, skippedFullStats } = await loadScreenedUniverse(stocks);
  const total = stocks.length;

  let halal = 0;
  let review = 0;
  let fail = 0;
  for (const s of screened) {
    if (s.screening.status === "HALAL") halal++;
    else if (s.screening.status === "CAUTIOUS") review++;
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
          <HomeHeroAuth />

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
          <StatIconUniverse />
          <div className={styles.statBody}>
            <span className={styles.statLabel}>Universe</span>
            <span className={styles.statValue}>{total}</span>
            <span className={styles.statSub}>Stocks screened</span>
          </div>
        </Link>
        <Link href="/screener?status=HALAL" className={`${styles.statCard} ${styles.statCardHalal}`}>
          <StatIconHalal />
          <div className={styles.statBody}>
            <span className={styles.statLabel}>Halal</span>
            <span className={`${styles.statValue} ${styles.valueHalal}`}>{hasStats ? halal : "\u2014"}</span>
            <span className={styles.statSub}>{skippedFullStats ? "Open screener" : "Pass all rules"}</span>
          </div>
        </Link>
        <Link href="/screener?status=CAUTIOUS" className={`${styles.statCard} ${styles.statCardReview}`}>
          <StatIconCautious />
          <div className={styles.statBody}>
            <span className={styles.statLabel}>Cautious</span>
            <span className={`${styles.statValue} ${styles.valueReview}`}>{hasStats ? review : "\u2014"}</span>
            <span className={styles.statSub}>Need verification</span>
          </div>
        </Link>
        <Link href="/screener?status=NON_COMPLIANT" className={`${styles.statCard} ${styles.statCardFail}`}>
          <StatIconAvoid />
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
                  : "Most stocks are cautious. Use the screener to find compliant options."}
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
        <p className={styles.sectionFootnote}>Based on S&P Shariah screening criteria</p>
        <HomeTopStocksLive rows={topHalal as (Stock & { screening?: ScreeningResult })[]} />
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

      {/* ── Islamic finance headlines ── */}
      {(newsFeed.length > 0 || newsLoadStatus !== "ok") && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Islamic finance headlines</h2>
            {newsFeed.length > 0 ? <Link href="/news" className={styles.seeAll}>All news →</Link> : null}
          </div>
          {newsFeed.length > 0 ? (
            <NewsCarousel items={newsFeed.slice(0, 8)} />
          ) : (
            <p className={styles.newsHint}>
              {newsLoadStatus === "empty"
                ? "No headlines in the database yet. Trigger POST /api/internal/news/sync on your API with the X-Internal-Service-Token header (INTERNAL_SERVICE_TOKEN on Render). RSS uses the default feed unless you set NEWS_RSS_URL; NEWSDATA_API_KEY adds NewsData.io articles."
                : newsErrorHint ||
                  "News could not be loaded. Check NEXT_PUBLIC_API_BASE_URL on Vercel and that the API is reachable."}
            </p>
          )}
        </section>
      )}

      {/* ── Trending Preview ── */}
      {trendingStocks.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Trending Stocks</h2>
            <Link href="/trending" className={styles.seeAll}>View all →</Link>
          </div>
          <div className={styles.trendingGrid}>
            {trendingStocks.slice(0, 6).map((stock, i) => (
              <Link key={stock.symbol} href={`/stocks/${stock.symbol}`} className={styles.trendingCard}>
                <span className={styles.trendingRank}>{i + 1}</span>
                <StockLogo symbol={stock.symbol} size={40} exchange={stock.exchange} />
                <div className={styles.trendingBody}>
                  <span className={styles.trendingSymbol}>{stock.symbol}</span>
                  <span className={styles.trendingName}>{stock.name}</span>
                </div>
                <span className={styles.trendingExchange}>{stock.exchange}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Collections Preview ── */}
      {collections.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Halal Stock Collections</h2>
            <Link href="/collections" className={styles.seeAll}>View all →</Link>
          </div>
          <div className={styles.collectionsGrid}>
            {collections.slice(0, 4).map((coll) => (
              <Link key={coll.slug} href={`/collections/${coll.slug}`} className={styles.collectionCard}>
                <CollectionIcon slug={coll.slug} />
                <span className={styles.collectionName}>{coll.name}</span>
                <span className={styles.collectionCount}>{coll.stock_count} stocks</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Super Investors Preview ── */}
      {investors.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Super Investor Tracker</h2>
            <Link href="/super-investors" className={styles.seeAll}>View all →</Link>
          </div>
          <div className={styles.investorsGrid}>
            {investors.slice(0, 4).map((inv) => (
              <Link key={inv.slug} href={`/super-investors/${inv.slug}`} className={styles.investorCard}>
                {inv.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={inv.image_url} alt="" className={styles.investorAvatarImg} width={40} height={40} />
                ) : (
                  <div className={styles.investorAvatar}>{inv.name.charAt(0)}</div>
                )}
                <div className={styles.investorBody}>
                  <span className={styles.investorName}>{inv.name}</span>
                  <span className={styles.investorTitle}>{inv.title}</span>
                </div>
                <span className={styles.investorCountry}>{inv.country}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── ETFs Preview ── */}
      {etfs.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Halal ETFs</h2>
            <Link href="/etfs" className={styles.seeAll}>View all →</Link>
          </div>
          <div className={styles.etfsGrid}>
            {etfs.slice(0, 4).map((etf) => (
              <div key={etf.symbol} className={styles.etfCard}>
                <span className={styles.etfSymbol}>{etf.symbol}</span>
                <span className={styles.etfName}>{etf.name}</span>
                <span className={styles.etfExchange}>{etf.exchange}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Halal Investing in India ── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Halal Investing in India</h2>
          <Link href="/halal-stocks" className={styles.seeAll}>View halal stocks &rarr;</Link>
        </div>
        <div className={styles.marketingGrid}>
          <div className={styles.marketingCard}>
            <div className={`${styles.marketingIcon} ${styles.marketingIconShield}`}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className={styles.marketingTitle}>What Is Shariah-Compliant Investing?</h3>
            <p className={styles.marketingDesc}>
              Shariah-compliant investing follows Islamic financial principles &mdash; avoiding interest (riba),
              excessive uncertainty (gharar), and prohibited industries. Stocks are screened against financial
              ratios to ensure the company&apos;s business and finances align with Islamic law.
            </p>
          </div>
          <div className={styles.marketingCard}>
            <div className={`${styles.marketingIcon} ${styles.marketingIconIndia}`}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className={styles.marketingTitle}>Why India Needs a Halal Stock Screener</h3>
            <p className={styles.marketingDesc}>
              With over 200 million Muslims, India has one of the world&apos;s largest Muslim populations.
              Yet access to reliable, free Shariah screening tools for Indian stocks has been limited.
              Barakfi fills this gap with transparent, technology-driven screening built for the Indian market.
            </p>
          </div>
          <div className={styles.marketingCard}>
            <div className={`${styles.marketingIcon} ${styles.marketingIconBook}`}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className={styles.marketingTitle}>3 Global Shariah Standards</h3>
            <p className={styles.marketingDesc}>
              Every stock is screened through S&amp;P, AAOIFI, and FTSE/Maxis methodologies.
              Each methodology evaluates debt ratios, income purity, receivables, and prohibited business activities
              with its own thresholds — giving you a transparent, multi-standard compliance view.
            </p>
          </div>
        </div>
      </section>

      {/* ── Trust & Methodology Bar ── */}
      <section className={styles.trustBar}>
        <div className={styles.trustItem}>
          <span className={styles.trustIcon}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </span>
          <div className={styles.trustText}>
            <span className={styles.trustTitle}>Multi-Standard Screening</span>
            <span className={styles.trustDesc}>S&amp;P, AAOIFI &amp; FTSE methodologies</span>
          </div>
        </div>
        <div className={styles.trustItem}>
          <span className={styles.trustIcon}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </span>
          <div className={styles.trustText}>
            <span className={styles.trustTitle}>Secure &amp; Private</span>
            <span className={styles.trustDesc}>Your portfolio data stays yours</span>
          </div>
        </div>
        <div className={styles.trustItem}>
          <span className={styles.trustIcon}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </span>
          <div className={styles.trustText}>
            <span className={styles.trustTitle}>Real-Time Data</span>
            <span className={styles.trustDesc}>Live prices from NSE &amp; Yahoo Finance</span>
          </div>
        </div>
        <div className={styles.trustItem}>
          <span className={styles.trustIcon}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16" />
            </svg>
          </span>
          <div className={styles.trustText}>
            <span className={styles.trustTitle}>Responsive web</span>
            <span className={styles.trustDesc}>Fast on phone and desktop — no app install</span>
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
              <Link href="/trending" className={styles.footerLink}>Trending</Link>
            </div>
            <div className={styles.footerCol}>
              <span className={styles.footerColTitle}>Resources</span>
              <Link href="/halal-stocks" className={styles.footerLink}>Halal Stocks India</Link>
              <Link href="/methodology" className={styles.footerLink}>Methodology</Link>
              <Link href="/compare" className={styles.footerLink}>Compare Stocks</Link>
              <Link href="/tools/purification" className={styles.footerLink}>Purification Calculator</Link>
              <Link href="/tools/zakat" className={styles.footerLink}>Zakat Calculator</Link>
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
          <p>Screening powered by S&amp;P, AAOIFI &amp; FTSE/Maxis Shariah methodologies. &copy; {new Date().getFullYear()} Barakfi.</p>
        </div>
      </footer>
    </div>
  );
}

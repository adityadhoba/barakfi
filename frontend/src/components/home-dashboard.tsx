import Link from "next/link";
import { Logo } from "@/components/logo";
import { getStocks, getTrending } from "@/lib/api";
import { HomeHeroSearch } from "@/components/home-hero-search";
import { HomeTopStocksLive } from "@/components/home-top-stocks-live";
import { SCREENING_LEGAL_DISCLAIMER } from "@/lib/screening-status";
import styles from "./home-dashboard.module.css";

export async function HomeDashboard() {
  const [stocks, trendingStocks] = await Promise.all([
    getStocks(),
    getTrending("popular", undefined, 8),
  ]);

  const popular = [...stocks]
    .sort((a, b) => b.market_cap - a.market_cap)
    .slice(0, 8);

  const trendingChips = (trendingStocks.length > 0 ? trendingStocks : popular).slice(0, 3);

  return (
    <div className={styles.home}>
      {/* ── Hero: one action ── */}
      <section className={styles.heroClean}>
        <span className={styles.heroKicker}>Check Halal Stocks</span>
        <h1 className={styles.heroHeadline}>
          Screen Indian stocks using standard Shariah criteria
        </h1>
        <p className={styles.heroSub}>
          Shariah-compliant screening for Indian stocks using real financial data
        </p>
        <HomeHeroSearch trendingSymbols={trendingChips.map((s) => s.symbol)} />
      </section>

      {/* ── Popular Stocks ── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Popular Stocks Right Now</h2>
          <Link href="/screener" className={styles.seeAll}>Browse all stocks &rarr;</Link>
        </div>
        <HomeTopStocksLive rows={popular} />
      </section>

      {/* ── How It Works ── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
        </div>
        <div className={styles.howGrid}>
          <div className={styles.howCard}>
            <span className={styles.howStep}>1</span>
            <h3 className={styles.howTitle}>Search a stock</h3>
            <p className={styles.howDesc}>Type any NSE stock symbol or company name.</p>
          </div>
          <div className={styles.howCard}>
            <span className={styles.howStep}>2</span>
            <h3 className={styles.howTitle}>Screening runs</h3>
            <p className={styles.howDesc}>Our engine tests 5 financial ratios against Shariah standards in seconds.</p>
          </div>
          <div className={styles.howCard}>
            <span className={styles.howStep}>3</span>
            <h3 className={styles.howTitle}>Get your result</h3>
            <p className={styles.howDesc}>See whether a stock screens as Shariah Compliant, Requires Review, or Not Compliant — with full transparency.</p>
          </div>
        </div>
      </section>

      {/* ── Trust ── */}
      <section className={styles.authoritySection} aria-labelledby="trust-heading">
        <div className={styles.authorityCard}>
          <h2 id="trust-heading" className={styles.authorityTitle}>
            Why trust our screening
          </h2>
          <div className={styles.trustGrid}>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>📄</span>
              <span className={styles.trustLabel}>Based on BSE &amp; NSE official filings</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>📐</span>
              <span className={styles.trustLabel}>Uses 4 global Shariah standards</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>🔄</span>
              <span className={styles.trustLabel}>Updated with latest financial data</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>🔓</span>
              <span className={styles.trustLabel}>Transparent methodology — see every ratio</span>
            </div>
          </div>
          <p className={styles.authorityDisclaimer}>
            {SCREENING_LEGAL_DISCLAIMER}
          </p>
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
              <Link href="/tools/purification" className={styles.footerLink}>Purification Calculator</Link>
              <Link href="/tools/zakat" className={styles.footerLink}>Zakat Calculator</Link>
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
          <p>&copy; {new Date().getFullYear()} Barakfi. Screening powered by S&amp;P, AAOIFI &amp; FTSE/Maxis Shariah methodologies.</p>
        </div>
      </footer>
    </div>
  );
}

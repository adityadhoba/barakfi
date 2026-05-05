import Link from "next/link";
import { Logo } from "@/components/logo";
import { getStocks, getTrending } from "@/lib/api";
import { HomeHeroSearch } from "@/components/home-hero-search";
import { HomeTopStocksLive } from "@/components/home-top-stocks-live";
import { MethodologyTrustCard } from "@/components/methodology-trust-card";
import { SCREENING_LEGAL_DISCLAIMER } from "@/lib/screening-status";
import styles from "./home-dashboard.module.css";

export async function HomeDashboard() {
  const popularFromStocks = await getStocks({
    limit: 12,
    orderBy: "market_cap_desc",
    revalidateSeconds: 300,
  });
  const popular =
    popularFromStocks.length > 0
      ? popularFromStocks
      : await getTrending("popular", "NSE", 12);
  const trendingChips = popular.slice(0, 3);

  return (
    <div className={styles.home}>
      {/* ── Hero: one action ── */}
      <section className={styles.heroClean}>
        <span className={styles.heroKicker}>Financially Grounded Screening</span>
        <h1 className={styles.heroHeadline}>
          Screen Indian stocks with transparent Shariah compliance checks
        </h1>
        <p className={styles.heroSub}>
          Built for NSE and BSE investors who want evidence-first outcomes across debt, income purity,
          interest exposure, receivables, and balance-sheet quality.
        </p>
        <HomeHeroSearch trendingSymbols={trendingChips.map((s) => s.symbol)} />
        <div className={styles.methodologyCardWrap}>
          <MethodologyTrustCard />
        </div>
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
            <p className={styles.howDesc}>Our engine runs 6 core financial checks against widely used Shariah thresholds.</p>
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
              <span className={styles.trustIcon} aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M8 3h6l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 13h6M9 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              <span className={styles.trustLabel}>Grounded in published company financial disclosures</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon} aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="m4 18 7-12 9 12H4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M11 6v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              <span className={styles.trustLabel}>Benchmarked against multiple global screening methodologies</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon} aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6v5h-5M4 18v-5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6.4 9A7 7 0 0 1 18.2 7M17.6 15A7 7 0 0 1 5.8 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              <span className={styles.trustLabel}>Continuously refreshed with latest fundamentals and pricing snapshots</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon} aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3a6 6 0 0 0-6 6v3h12V9a6 6 0 0 0-6-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <rect x="4" y="12" width="16" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M12 15v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              <span className={styles.trustLabel}>Transparent ratios, thresholds, and result reasoning on every stock</span>
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
              <Link href="/about-us" className={styles.footerLink}>About Us</Link>
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

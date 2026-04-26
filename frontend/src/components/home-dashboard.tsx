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
      <section className={styles.stocksSection}>
        <div className={styles.stocksHeader}>
          <div>
            <span className={styles.sectionEyebrow}>Live Screening</span>
            <h2 className={styles.stocksTitle}>Popular Stocks Right Now</h2>
          </div>
          <Link href="/screener" className={styles.seeAll}>
            Browse all stocks →
          </Link>
        </div>
        <HomeTopStocksLive rows={popular} />
      </section>

      {/* ── How It Works ── */}
      <section className={styles.howSection}>
        <div className={styles.howHeader}>
          <span className={styles.sectionEyebrow}>Simple Process</span>
          <h2 className={styles.howTitle}>How It Works</h2>
          <p className={styles.howSub}>
            From question to answer in seconds. No jargon, no waiting.
          </p>
        </div>
        <div className={styles.howGrid}>
          <div className={styles.howCard}>
            <span className={styles.howNum}>01</span>
            <h3 className={styles.howCardTitle}>Search a stock</h3>
            <p className={styles.howCardDesc}>
              Type any NSE or BSE stock symbol or company name in the search bar.
            </p>
          </div>
          <div className={styles.howCard}>
            <span className={styles.howNum}>02</span>
            <h3 className={styles.howCardTitle}>Six checks run</h3>
            <p className={styles.howCardDesc}>
              Our engine runs 6 core financial checks against widely-used Shariah
              thresholds — debt, income purity, interest exposure, and more.
            </p>
          </div>
          <div className={styles.howCard}>
            <span className={styles.howNum}>03</span>
            <h3 className={styles.howCardTitle}>See your result</h3>
            <p className={styles.howCardDesc}>
              Compliant, Requires Review, or Not Compliant — with full ratio
              transparency so you can make an informed decision.
            </p>
          </div>
        </div>
      </section>

      {/* ── Methodology Trust ── */}
      <section className={styles.trustSection} aria-labelledby="trust-heading">
        <div className={styles.trustInner}>
          <span className={styles.sectionEyebrowLight}>Why Trust Us</span>
          <h2 id="trust-heading" className={styles.trustTitle}>
            Built on published<br />Shariah standards
          </h2>
          <div className={styles.trustGrid}>
            <div className={styles.trustItem}>
              <span className={styles.trustItemNum}>—</span>
              <p className={styles.trustItemText}>
                Grounded in published company financial disclosures from NSE and BSE
              </p>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustItemNum}>—</span>
              <p className={styles.trustItemText}>
                Benchmarked against S&amp;P, AAOIFI &amp; FTSE/Maxis Shariah methodologies
              </p>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustItemNum}>—</span>
              <p className={styles.trustItemText}>
                Continuously refreshed with latest fundamentals and pricing snapshots
              </p>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustItemNum}>—</span>
              <p className={styles.trustItemText}>
                Transparent ratios, thresholds, and full result reasoning on every stock
              </p>
            </div>
          </div>
          <p className={styles.trustDisclaimer}>{SCREENING_LEGAL_DISCLAIMER}</p>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>
            Ready to screen your portfolio?
          </h2>
          <p className={styles.ctaSub}>
            Search any Indian stock and get an instant Shariah compliance result — completely free.
          </p>
          <div className={styles.ctaActions}>
            <Link href="/screener" className={styles.ctaPrimary}>
              Open Screener
            </Link>
            <Link href="/methodology" className={styles.ctaSecondary}>
              Read our Methodology
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <Logo size={24} showText />
            <p className={styles.footerTagline}>
              Shariah-compliant equity screening for the Indian market.
            </p>
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

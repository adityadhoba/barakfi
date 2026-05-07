"use client";

import Link from "next/link";
import { useState } from "react";
import { StockLogo } from "@/components/stock-logo";
import { RouteLocalAuth } from "@/components/route-local-auth";
import { formatMcapShort, formatMoney, resolveDisplayCurrency } from "@/lib/currency-format";
import type { Collection, SuperInvestorSummary } from "@/lib/api";
import styles from "./explore.module.css";

export type ExploreFeaturedStock = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  marketCap: number;
  exchange: string;
  status: string | null;
};

export type ExploreLearnCard = {
  href: string;
  category: string;
  title: string;
  description: string;
  meta: string;
};

export type ExploreAcademyCard = {
  href: string;
  number: string;
  level: string;
  title: string;
  description: string;
  lessons: number;
};

export type ExploreTab = "collections" | "halal" | "learn" | "superinvestors" | "academy";

const TAB_LABELS: Array<{ id: ExploreTab; label: string }> = [
  { id: "collections", label: "Collections" },
  { id: "halal", label: "Compliant Stocks" },
  { id: "learn", label: "Learn" },
  { id: "superinvestors", label: "Super Investors" },
  { id: "academy", label: "Academy" },
];

const LOCAL_TICKER = [
  { name: "NIFTY 50", value: "23,842.75", change: "+0.54%", positive: true },
  { name: "SENSEX", value: "78,553.20", change: "+0.54%", positive: true },
  { name: "NIFTY BANK", value: "51,236.80", change: "−0.17%", positive: false },
  { name: "NIFTY IT", value: "33,156.40", change: "+0.75%", positive: true },
  { name: "NIFTY PHARMA", value: "19,872.35", change: "+0.28%", positive: true },
  { name: "NIFTY AUTO", value: "23,145.90", change: "−0.48%", positive: false },
  { name: "NIFTY FMCG", value: "56,234.15", change: "+0.32%", positive: true },
  { name: "INDIA VIX", value: "13.42", change: "−2.75%", positive: false },
] as const;

function badgeClass(status: string | null) {
  if (status === "HALAL") return styles.badgeCompliant;
  if (status === "CAUTIOUS") return styles.badgeReview;
  return styles.badgeFail;
}

function badgeLabel(status: string | null) {
  if (status === "HALAL") return "Compliant";
  if (status === "CAUTIOUS") return "Requires Review";
  return "Not Compliant";
}

export function ExplorePageClient({
  collections,
  collectionsTotal,
  compliantCount,
  reviewCount,
  screenedCount,
  sectorCount,
  sectors,
  featuredStocks,
  learnCards,
  investors,
  academyCards,
  initialTab,
}: {
  collections: Collection[];
  collectionsTotal: number;
  compliantCount: number;
  reviewCount: number;
  screenedCount: number;
  sectorCount: number;
  sectors: Array<{ name: string; count: number }>;
  featuredStocks: ExploreFeaturedStock[];
  learnCards: ExploreLearnCard[];
  investors: SuperInvestorSummary[];
  academyCards: ExploreAcademyCard[];
  initialTab?: ExploreTab;
}) {
  const [activeTab, setActiveTab] = useState<ExploreTab>(initialTab ?? "collections");
  const featuredLearn = learnCards[0] ?? null;
  const remainingLearn = learnCards.slice(1);
  const sampleInvestorHoldings = featuredStocks.slice(0, 5);

  return (
    <main className={styles.pageRoot}>
      <div className={styles.ticker}>
        <div className={styles.tickerTrack}>
          {[...LOCAL_TICKER, ...LOCAL_TICKER].map((item, index) => (
            <span className={styles.tickerItem} key={`${item.name}-${index}`}>
              <b>{item.name}</b>
              {item.value}
              <span className={item.positive ? styles.tickerUp : styles.tickerDown}>{item.change}</span>
            </span>
          ))}
        </div>
      </div>

      <nav className={styles.nav} aria-label="Explore navigation">
        <Link className={styles.logo} href="/">
          Barak<span className={styles.logoAccent}>Fi</span>
        </Link>
        <div className={styles.navRight}>
          <div className={styles.navLinks}>
            <Link href="/screener">Screener</Link>
            <Link href="/explore">Explore</Link>
            <Link href="/tools">Tools</Link>
            <Link href="/watchlist">Watchlist</Link>
          </div>
          <RouteLocalAuth
            className={styles.navAuth}
            ghostClassName={`${styles.navLink} ${styles.navAuthGhost}`}
            primaryClassName={`${styles.navLink} ${styles.navAuthPrimary}`}
            userClassName={styles.navUser}
          />
        </div>
      </nav>

      <div className={styles.pageTabs}>
        {TAB_LABELS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.pageTab} ${activeTab === tab.id ? styles.pageTabActive : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={`${styles.page} ${activeTab === "collections" ? styles.pageActive : ""}`}>
        <div className={styles.pageHero}>
          <div className={styles.eyebrow}>Explore · Collections</div>
          <div className={styles.pageHeroTitle}>Curated Stock<br />Collections</div>
          <div className={styles.pageHeroDesc}>
            Thematic baskets of <strong>Shariah-screened stocks</strong> across sectors and markets. Each collection is researched, labeled, and updated quarterly.
          </div>
        </div>

        <div className={styles.pageContentZero}>
          <div className={styles.collectionsStats}>
            <div className={styles.collectionsStatCell}><div className={styles.collectionsStatNumber}>{collectionsTotal}</div><div className={styles.collectionsStatLabel}>Collections</div></div>
            <div className={styles.collectionsStatCell}><div className={styles.collectionsStatNumber}>{screenedCount}</div><div className={styles.collectionsStatLabel}>Stocks covered</div></div>
            <div className={styles.collectionsStatCell}><div className={styles.collectionsStatNumber}>NSE &amp; BSE</div><div className={styles.collectionsStatLabel}>Both exchanges</div></div>
            <div className={styles.collectionsStatCell}><div className={styles.collectionsStatNumber}>Quarterly</div><div className={styles.collectionsStatLabel}>Updated</div></div>
          </div>

          <div className={styles.collectionsGrid}>
            {collections.map((collection) => (
              <Link key={collection.slug} className={styles.collectionCard} href={`/collections/${collection.slug}`}>
                <div className={styles.collectionTag}>{collection.icon || "Curated"}</div>
                <div className={styles.collectionTitle}>{collection.name}</div>
                <div className={styles.collectionDesc}>{collection.description}</div>
                <div className={styles.collectionFooter}><span className={styles.collectionCount}>{collection.stock_count} stocks</span><span className={styles.collectionArrow}>→</span></div>
              </Link>
            ))}
          </div>
        </div>
        <div className={styles.disclaimer}><span>Educational only · Not financial advice · Updated quarterly · <Link href="/methodology">Methodology</Link></span><span>v2026.04.2</span></div>
      </div>

      <div className={`${styles.page} ${activeTab === "halal" ? styles.pageActive : ""}`}>
        <div className={styles.pageHero}>
          <div className={styles.eyebrow}>Compliant Stocks · India 2026</div>
          <div className={styles.pageHeroTitle}>Shariah-Compliant<br />Stocks in India</div>
          <div className={styles.pageHeroDesc}>
            The complete list of <strong>Shariah-compliant equities on NSE &amp; BSE</strong>, screened using AAOIFI-aligned criteria. {compliantCount} stocks across {sectorCount} sectors pass all four compliance tests.
          </div>
        </div>

        <div className={styles.pageContent}>
          <div className={styles.hsStats}>
            <div className={styles.hsCell}><div className={styles.hsNumber}>{compliantCount}</div><div className={styles.hsLabel}>Compliant stocks</div></div>
            <div className={styles.hsCell}><div className={styles.hsNumber}>{reviewCount}</div><div className={styles.hsLabel}>Requires review</div></div>
            <div className={styles.hsCell}><div className={styles.hsNumber}>{sectorCount}</div><div className={styles.hsLabel}>Sectors</div></div>
            <div className={styles.hsCell}><div className={styles.hsNumber}>{screenedCount}</div><div className={styles.hsLabel}>Total screened</div></div>
          </div>

          <div className={styles.sectionBlock}>
            <div className={styles.sectionHeading}>Top Compliant Sectors</div>
            <div className={styles.sectorsGrid}>
              {sectors.map((sector) => (
                <Link key={sector.name} className={styles.sectorPill} href={`/screener?status=HALAL&sector=${encodeURIComponent(sector.name)}`}>
                  {sector.name} <span className={styles.sectorPillCount}>{sector.count}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.sectionHeading}>All Compliant Stocks</div>
          <table className={styles.hsTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Company</th>
                <th>Sector</th>
                <th>Price</th>
                <th>Market Cap</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {featuredStocks.map((stock, index) => (
                <tr key={stock.symbol} onClick={() => (window.location.href = `/stocks/${stock.symbol}`)}>
                  <td className={styles.rowIndex}>{index + 1}</td>
                  <td>
                    <div className={styles.hsCompany}>
                      <div className={styles.hsLogoWrap}>
                        <StockLogo symbol={stock.symbol} size={26} exchange={stock.exchange} />
                      </div>
                      <div>
                        <div className={styles.hsTicker}>{stock.symbol}</div>
                        <div className={styles.hsName}>{stock.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.hsSector}>{stock.sector}</td>
                  <td>{formatMoney(stock.price, resolveDisplayCurrency(stock.exchange, "INR"))}</td>
                  <td>{formatMcapShort(stock.marketCap, resolveDisplayCurrency(stock.exchange, "INR"))}</td>
                  <td><span className={`${styles.badge} ${badgeClass(stock.status)}`}>{badgeLabel(stock.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.loadMore}><Link className={styles.btnOutline} href="/halal-stocks">View All {compliantCount} Compliant Stocks →</Link></div>
        </div>
        <div className={styles.disclaimer}><span>Educational only · Not a religious ruling · <Link href="/methodology">Methodology</Link></span><span>Updated quarterly after results · v2026.04.2</span></div>
      </div>

      <div className={`${styles.page} ${activeTab === "learn" ? styles.pageActive : ""}`}>
        <div className={styles.pageHero}>
          <div className={styles.eyebrow}>Learn · Shariah Investing</div>
          <div className={styles.pageHeroTitle}>Understand Shariah<br />Stock Screening</div>
          <div className={styles.pageHeroDesc}>Articles on <strong>halal investing, how Shariah stock screening works on Indian exchanges</strong>, case studies, and how to use the screener responsibly.</div>
        </div>

        <div className={styles.pageContent}>
          <div className={styles.topicFilters}>
            {['All Topics', 'Shariah Basics', 'Screening Method', 'Purification', 'Zakat', 'Case Studies', 'How-To Guides'].map((chip, index) => (
              <div key={chip} className={`${styles.topicChip} ${index === 0 ? styles.topicChipActive : ''}`}>{chip}</div>
            ))}
          </div>

          <div className={styles.learnGrid}>
            {featuredLearn ? (
              <Link className={`${styles.learnCard} ${styles.learnCardFeatured}`} href={featuredLearn.href}>
                <div>
                  <div className={styles.learnCategory}>{featuredLearn.category}</div>
                  <div className={styles.learnTitle}>{featuredLearn.title}</div>
                  <div className={styles.learnDesc}>{featuredLearn.description}</div>
                  <div className={styles.learnMeta}><span>{featuredLearn.meta}</span><span>·</span><span className={styles.learnRead}>Read Article →</span></div>
                </div>
                <div className={styles.criteriaPanel}>
                  <div className={styles.criteriaHeading}>The 4 Criteria</div>
                  {[
                    ['Debt Ratio', 'Below 33%'],
                    ['Interest Income', 'Below 5%'],
                    ['Business Activity', 'Permissible'],
                    ['Receivables', 'Below 50%'],
                  ].map(([label, value], index) => (
                    <div key={label} className={`${styles.criteriaRow} ${index === 3 ? styles.criteriaRowLast : ''}`}><span>{label}</span><span>{value}</span></div>
                  ))}
                </div>
              </Link>
            ) : null}

            {remainingLearn.map((card) => (
              <Link key={card.href} className={styles.learnCard} href={card.href}>
                <div className={styles.learnCategory}>{card.category}</div>
                <div className={styles.learnTitle}>{card.title}</div>
                <div className={styles.learnDesc}>{card.description}</div>
                <div className={styles.learnMeta}><span>{card.meta}</span><span>·</span><span className={styles.learnRead}>Read →</span></div>
              </Link>
            ))}
          </div>
        </div>
        <div className={styles.disclaimer}><span>Educational articles · Not religious rulings · <Link href="/methodology">Methodology</Link></span><span>v2026.04.2</span></div>
      </div>

      <div className={`${styles.page} ${activeTab === "superinvestors" ? styles.pageActive : ""}`}>
        <div className={styles.pageHero}>
          <div className={styles.eyebrow}>Super Investors · Portfolios</div>
          <div className={styles.pageHeroTitle}>Legendary Investor<br />Portfolios</div>
          <div className={styles.pageHeroDesc}>Follow the portfolios of legendary investors — <strong>Warren Buffett, Rakesh Jhunjhunwala, Narayana Murthy, and more</strong> — and see which of their holdings pass Shariah screening.</div>
        </div>

        <div className={styles.pageContent}>
          <div className={styles.siGrid}>
            {investors.map((investor) => (
              <Link key={investor.slug} className={styles.siCard} href={`/super-investors/${investor.slug}`}>
                {investor.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.siAvatarImage} src={investor.image_url} alt={investor.name} />
                ) : (
                  <div className={styles.siAvatar}>{investor.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
                )}
                <div className={styles.siName}>{investor.name}</div>
                <div className={styles.siTitle}>{investor.title}</div>
                <div className={styles.siStyle}>{investor.investment_style}</div>
                <div className={styles.siFooter}><span className={styles.siHoldings}>{investor.holding_count} holdings</span><span className={styles.siTag}>{investor.country}</span></div>
              </Link>
            ))}
            <div className={`${styles.siCard} ${styles.siCardPlaceholder}`}>
              <div className={styles.moreSoonText}>More investors<br />coming soon</div>
              <div className={styles.moreSoonSub}>Warren Buffett · Peter Lynch · Mohnish Pabrai</div>
            </div>
          </div>

          <div className={styles.siHoldingsTable}>
            <div className={styles.sampleHeading}>Sample: Compliant Holdings</div>
            <table className={styles.siTable}>
              <thead><tr><th>Stock</th><th>Company</th><th>Sector</th><th>Compliance</th></tr></thead>
              <tbody>
                {sampleInvestorHoldings.map((stock) => (
                  <tr key={stock.symbol}>
                    <td><strong>{stock.symbol}</strong></td>
                    <td>{stock.name}</td>
                    <td>{stock.sector}</td>
                    <td><span className={`${styles.badge} ${badgeClass(stock.status)}`}>{badgeLabel(stock.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.siHoldingsCta}><Link className={styles.btnOutline} href="/super-investors">View Full Portfolios →</Link></div>
          </div>
        </div>
        <div className={styles.disclaimer}><span>Data from public disclosures · Educational only · Not financial advice · <Link href="/methodology">Methodology</Link></span><span>v2026.04.2</span></div>
      </div>

      <div className={`${styles.page} ${activeTab === "academy" ? styles.pageActive : ""}`}>
        <div className={styles.pageHero}>
          <div className={styles.eyebrow}>Academy · Islamic Finance</div>
          <div className={styles.pageHeroTitle}>Learn Islamic Finance<br />&amp; Shariah Investing</div>
          <div className={styles.pageHeroDesc}><strong>Free educational resources</strong> on Islamic finance, Shariah-compliant screening, halal stocks, purification, Zakat, and how to read financial ratios. Start from the basics or jump to a specific topic.</div>
        </div>

        <div className={styles.pageContent}>
          <div className={styles.academyHeroStrip}>
            <div className={styles.ahCell}><div className={styles.ahIcon}>◆</div><div className={styles.ahTitle}>From Zero to Screener</div><div className={styles.ahDesc}>No prior finance knowledge needed. Learn what stocks are, what Shariah compliance means, and how to use BarakFi in under an hour.</div></div>
            <div className={styles.ahCell}><div className={styles.ahIcon}>◈</div><div className={styles.ahTitle}>Understand Every Ratio</div><div className={styles.ahDesc}>Deep dives into debt ratio, interest income %, receivables, and business activity screens — with worked examples using real Indian stocks.</div></div>
            <div className={styles.ahCell}><div className={styles.ahIcon}>◇</div><div className={styles.ahTitle}>Practical Tools</div><div className={styles.ahDesc}>Guides for the Purification Calculator, Zakat Calculator, Compare tool, and Watchlist — so you get the most out of every BarakFi feature.</div></div>
          </div>

          <div className={styles.academyGrid}>
            {academyCards.map((card) => (
              <div key={card.href} className={styles.acModule}>
                <div className={styles.acNumber}>{card.number}</div>
                <div className={styles.acLevel}>{card.level}</div>
                <div className={styles.acTitle}>{card.title}</div>
                <div className={styles.acDesc}>{card.description}</div>
                <div className={styles.acLessons}>
                  <div className={styles.acLesson}>Core lesson sequence</div>
                  <div className={styles.acLesson}>Practical examples</div>
                  <div className={styles.acLesson}>BarakFi workflow guidance</div>
                  <div className={styles.acLesson}>Review checkpoints</div>
                </div>
                <div className={styles.acFooter}><span className={styles.acCount}>{card.lessons} lessons</span><Link className={styles.btnPrimary} href={card.href}>Start →</Link></div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.disclaimer}><span>Free academy modules · Educational only · <Link href="/methodology">Methodology</Link></span><span>v2026.04.2</span></div>
      </div>

      <footer className={styles.siteFooter}>
        <div className={styles.footerBrand}>Barak<span className={styles.logoAccent}>Fi</span></div>
        <div className={styles.footerLinks}>
          <Link href="/collections">Collections</Link>
          <Link href="/halal-stocks">Compliant Stocks</Link>
          <Link href="/learn">Learn</Link>
          <Link href="/academy">Academy</Link>
        </div>
      </footer>
    </main>
  );
}

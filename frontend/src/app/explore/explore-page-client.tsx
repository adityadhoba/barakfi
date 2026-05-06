"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HubRouteShell } from "@/components/hub-route-shell";
import { CollectionIcon } from "@/components/collection-icon";
import { StockLogo } from "@/components/stock-logo";
import { formatMcapShort, formatMoney, resolveDisplayCurrency } from "@/lib/currency-format";
import { screeningUiLabel } from "@/lib/screening-status";
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

type ExploreTab = "collections" | "halal" | "learn" | "investors" | "academy";

const TAB_LABELS: Array<{ id: ExploreTab; label: string }> = [
  { id: "collections", label: "Collections" },
  { id: "halal", label: "Compliant Stocks" },
  { id: "learn", label: "Learn" },
  { id: "investors", label: "Super Investors" },
  { id: "academy", label: "Academy" },
];

function statusClass(status: string | null) {
  if (status === "HALAL") return styles.badgeCompliant;
  if (status === "CAUTIOUS") return styles.badgeReview;
  return styles.badgeFail;
}

export function ExplorePageClient({
  collections,
  collectionsTotal,
  compliantCount,
  screenedCount,
  sectors,
  featuredStocks,
  learnCards,
  investors,
  investorsTotal,
  academyCards,
}: {
  collections: Collection[];
  collectionsTotal: number;
  compliantCount: number;
  screenedCount: number;
  sectors: Array<{ name: string; count: number }>;
  featuredStocks: ExploreFeaturedStock[];
  learnCards: ExploreLearnCard[];
  investors: SuperInvestorSummary[];
  investorsTotal: number;
  academyCards: ExploreAcademyCard[];
}) {
  const [activeTab, setActiveTab] = useState<ExploreTab>("collections");
  const featuredSectorLabel = useMemo(() => sectors.slice(0, 4).map((item) => item.name), [sectors]);

  return (
    <HubRouteShell>
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

      <div className={styles.pageWrap}>
        {activeTab === "collections" ? (
          <section className={styles.pageSection}>
            <div className={styles.hero}>
              <p className={styles.eyebrow}>Explore · Collections</p>
              <h1 className={styles.heroTitle}>Curated Stock Collections</h1>
              <p className={styles.heroDesc}>
                Ready-made baskets for investors who want faster discovery across sectors, themes, and halal-friendly starting points.
              </p>
            </div>
            <div className={styles.statStrip}>
              <div className={styles.statCell}><span className={styles.statNum}>{collectionsTotal}</span><span className={styles.statLabel}>Collections</span></div>
              <div className={styles.statCell}><span className={styles.statNum}>{screenedCount}</span><span className={styles.statLabel}>Stocks screened</span></div>
              <div className={styles.statCell}><span className={styles.statNum}>{compliantCount}</span><span className={styles.statLabel}>Compliant names</span></div>
            </div>
            <div className={styles.collectionGrid}>
              {collections.map((collection) => (
                <Link key={collection.slug} href={`/collections/${collection.slug}`} className={styles.collectionCard}>
                  <CollectionIcon slug={collection.slug} className={styles.collectionIcon} />
                  <span className={styles.collectionTag}>Curated</span>
                  <h2 className={styles.collectionTitle}>{collection.name}</h2>
                  <p className={styles.collectionDesc}>{collection.description}</p>
                  <div className={styles.collectionFooter}>
                    <span>{collection.stock_count} stocks</span>
                    <span>Open →</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "halal" ? (
          <section className={styles.pageSection}>
            <div className={styles.hero}>
              <p className={styles.eyebrow}>Explore · Compliant Stocks</p>
              <h1 className={styles.heroTitle}>Compliant Stocks in India</h1>
              <p className={styles.heroDesc}>
                Browse compliant names with sector context, market-cap cues, and direct links into the full stock detail and screener flows.
              </p>
            </div>
            <div className={styles.statStrip}>
              <div className={styles.statCell}><span className={styles.statNum}>{compliantCount}</span><span className={styles.statLabel}>Compliant stocks</span></div>
              <div className={styles.statCell}><span className={styles.statNum}>{featuredSectorLabel.length}</span><span className={styles.statLabel}>Featured sectors</span></div>
              <div className={styles.statCell}><span className={styles.statNum}>{screenedCount}</span><span className={styles.statLabel}>Universe screened</span></div>
            </div>
            <div className={styles.sectorGrid}>
              {sectors.map((sector) => (
                <Link key={sector.name} href={`/screener?status=HALAL&sector=${encodeURIComponent(sector.name)}`} className={styles.sectorPill}>
                  <span>{sector.name}</span>
                  <span className={styles.sectorCount}>{sector.count}</span>
                </Link>
              ))}
            </div>
            <div className={styles.stockTable}>
              {featuredStocks.map((stock) => (
                <Link key={stock.symbol} href={`/stocks/${stock.symbol}`} className={styles.stockRow}>
                  <div className={styles.stockNameCell}>
                    <StockLogo symbol={stock.symbol} size={38} exchange={stock.exchange} />
                    <div>
                      <div className={styles.stockTicker}>{stock.symbol}</div>
                      <div className={styles.stockName}>{stock.name}</div>
                    </div>
                  </div>
                  <div className={styles.stockSector}>{stock.sector}</div>
                  <div className={styles.stockMetric}>{formatMcapShort(stock.marketCap, resolveDisplayCurrency("NSE", "INR"))}</div>
                  <div className={styles.stockMetric}>{formatMoney(stock.price, resolveDisplayCurrency("NSE", "INR"))}</div>
                  <div className={`${styles.badge} ${statusClass(stock.status)}`}>{screeningUiLabel(stock.status ?? "NON_COMPLIANT")}</div>
                </Link>
              ))}
            </div>
            <div className={styles.linkBar}><Link href="/halal-stocks">View full compliant list →</Link></div>
          </section>
        ) : null}

        {activeTab === "learn" ? (
          <section className={styles.pageSection}>
            <div className={styles.hero}>
              <p className={styles.eyebrow}>Explore · Learn</p>
              <h1 className={styles.heroTitle}>Learn Halal Investing</h1>
              <p className={styles.heroDesc}>
                Practical explainers for NSE/BSE investors who want context before they screen, compare, or build a portfolio.
              </p>
            </div>
            <div className={styles.learnGrid}>
              {learnCards.map((card, index) => (
                <Link key={card.href} href={card.href} className={`${styles.learnCard} ${index === 0 ? styles.learnCardFeatured : ""}`}>
                  <span className={styles.learnCategory}>{card.category}</span>
                  <h2 className={styles.learnTitle}>{card.title}</h2>
                  <p className={styles.learnDesc}>{card.description}</p>
                  <div className={styles.learnFooter}>
                    <span>{card.meta}</span>
                    <span>Read →</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "investors" ? (
          <section className={styles.pageSection}>
            <div className={styles.hero}>
              <p className={styles.eyebrow}>Super Investors · Portfolios</p>
              <h1 className={styles.heroTitle}>Follow Super Investors</h1>
              <p className={styles.heroDesc}>
                Track notable investing styles and use BarakFi as the bridge between public portfolio inspiration and halal screening discipline.
              </p>
            </div>
            <div className={styles.statStrip}>
              <div className={styles.statCell}><span className={styles.statNum}>{investorsTotal}</span><span className={styles.statLabel}>Investor profiles</span></div>
              <div className={styles.statCell}><span className={styles.statNum}>{investors.reduce((sum, inv) => sum + inv.holding_count, 0)}</span><span className={styles.statLabel}>Total holdings shown</span></div>
            </div>
            <div className={styles.investorGrid}>
              {investors.map((investor) => (
                <Link key={investor.slug} href={`/super-investors/${investor.slug}`} className={styles.investorCard}>
                  {investor.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={styles.investorAvatar} src={investor.image_url} alt={investor.name} />
                  ) : (
                    <div className={styles.investorAvatarFallback}>{investor.name.charAt(0)}</div>
                  )}
                  <h2 className={styles.investorName}>{investor.name}</h2>
                  <p className={styles.investorTitle}>{investor.title}</p>
                  <p className={styles.investorStyle}>{investor.investment_style}</p>
                  <div className={styles.investorFooter}>
                    <span>{investor.country}</span>
                    <span>{investor.holding_count} holdings</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "academy" ? (
          <section className={styles.pageSection}>
            <div className={styles.hero}>
              <p className={styles.eyebrow}>Academy · Islamic Finance</p>
              <h1 className={styles.heroTitle}>BarakFi Academy</h1>
              <p className={styles.heroDesc}>
                Structured lessons that connect screening theory, portfolio building, purification, zakat, and product workflows in one place.
              </p>
            </div>
            <div className={styles.academyGrid}>
              {academyCards.map((card) => (
                <Link key={card.href} href={card.href} className={styles.academyCard}>
                  <div className={styles.academyTop}>
                    <span className={styles.academyNum}>{card.number}</span>
                    <span className={styles.academyLevel}>{card.level}</span>
                  </div>
                  <h2 className={styles.academyTitle}>{card.title}</h2>
                  <p className={styles.academyDesc}>{card.description}</p>
                  <div className={styles.academyFooter}>
                    <span>{card.lessons} lessons</span>
                    <span>Open →</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <footer className={styles.disclaimer}>
          <p>This hub is educational and product-guidance oriented. Use detail pages and methodology notes for deeper stock-by-stock context.</p>
          <div className={styles.disclaimerLinks}>
            <Link href="/collections">Collections</Link>
            <Link href="/halal-stocks">Halal Stocks India</Link>
            <Link href="/learn">Learn</Link>
            <Link href="/academy">Academy</Link>
          </div>
        </footer>
      </div>
    </HubRouteShell>
  );
}

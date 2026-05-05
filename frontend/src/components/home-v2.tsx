import Link from "next/link";
import { DM_Serif_Display } from "next/font/google";
import {
  getBulkScreeningResults,
  getMarketIndices,
  getScreenerSnapshot,
  getStocks,
  getTrending,
  type TrendingStock,
} from "@/lib/api";
import { screeningUiLabel } from "@/lib/screening-status";
import { HomeV2Search } from "@/components/home-v2-search";
import styles from "./home-v2.module.css";

const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400" });

type HomeStockRow = TrendingStock & { status?: string };

function formatMcap(v: number, currency: string = "INR") {
  if (!Number.isFinite(v) || v <= 0) return "—";
  if (currency === "INR") {
    if (v >= 1e12) return `₹${(v / 1e12).toFixed(2)}L Cr`;
    if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
    return `₹${(v / 1e5).toFixed(2)} L`;
  }
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  return Math.round(v).toLocaleString("en-US");
}

function formatPrice(v: number, currency: string = "INR") {
  const cur = currency || "INR";
  const locale = cur === "INR" ? "en-IN" : "en-US";
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: cur,
    maximumFractionDigits: cur === "INR" ? 2 : 2,
  }).format(v);
}

function statusClass(status?: string) {
  if (status === "HALAL") return styles.badgeCompliant;
  if (status === "CAUTIOUS") return styles.badgeReview;
  if (status === "NON_COMPLIANT") return styles.badgeNonCompliant;
  return styles.badgeReview;
}

function statusLabel(status?: string) {
  if (!status) return "Requires Review";
  return screeningUiLabel(status);
}

export async function HomeV2() {
  const [indices, stocksRaw, trending, snapshot] = await Promise.all([
    getMarketIndices().catch(() => []),
    getStocks({ orderBy: "market_cap_desc", revalidateSeconds: 300 }).catch(() => []),
    getTrending("popular", "NSE", 20).catch(() => []),
    getScreenerSnapshot().catch(() => []),
  ]);

  const stocks = stocksRaw.length > 0 ? stocksRaw : trending;
  const featured = stocks.slice(0, 12);
  const featuredSymbols = featured.map((s) => s.symbol);

  const featuredScreening = featuredSymbols.length
    ? await getBulkScreeningResults(featuredSymbols).catch(() => [])
    : [];
  const statusMap = new Map<string, string>();
  for (const row of featuredScreening) statusMap.set(row.symbol.toUpperCase(), row.status);
  for (const snap of snapshot) statusMap.set(snap.stock.symbol.toUpperCase(), snap.screening.status);

  const featuredWithStatus: HomeStockRow[] = featured.map((s) => ({
    ...s,
    status: statusMap.get(s.symbol.toUpperCase()),
  }));

  const totalStocks = stocks.length;
  const totalSectors = new Set(stocks.map((s) => s.sector)).size;
  const compliantInFeatured = featuredWithStatus.filter((s) => s.status === "HALAL").length;

  const sectorCounts = Array.from(
    stocks.reduce((acc, s) => {
      acc.set(s.sector, (acc.get(s.sector) || 0) + 1);
      return acc;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const tickerItems = indices.length
    ? indices
    : featuredWithStatus.slice(0, 8).map((s, idx) => ({
        name: s.symbol,
        value: s.price,
        change: idx % 2 === 0 ? 1 : -1,
        change_percent: idx % 2 === 0 ? 0.7 : -0.4,
        source: "stocks",
        as_of: "",
      }));

  const trendingSymbols = featuredWithStatus.slice(0, 7).map((s) => s.symbol);
  const marqueeItems = [
    "Shariah Screener",
    "Debt Ratio Analysis",
    "Interest Income %",
    "Non-Compliant Revenue Filter",
    "Sector Filters",
    "Market Cap Filter",
    "Compliant Watchlist",
    "Zakat Calculator",
    "Purification Calculator",
    "NIFTY 50 · 100 · 500",
    "AAOIFI Methodology",
  ];

  return (
    <div className={`${styles.home} ${dmSerif.className}`}>
      <section className={styles.ticker} aria-label="Live market tape">
        <div className={styles.tickerTrack}>
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span className={styles.tickerItem} key={`${item.name}-${i}`}>
              <b>{item.name}</b>
              {typeof item.value === "number" ? item.value.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}
              <span className={item.change_percent >= 0 ? styles.up : styles.down}>
                {item.change_percent >= 0 ? "+" : ""}
                {item.change_percent.toFixed(2)}%
              </span>
            </span>
          ))}
        </div>
      </section>

      <section className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.heroLeft}>
            <div className={styles.eyebrow}>NSE &amp; BSE · Shariah Screening · AAOIFI Aligned</div>
            <h1 className={styles.heroTitle}>
              Know every
              <br />
              stock.
              <br />
              <span className={styles.hl}>Clearly.</span>
            </h1>
            <p className={styles.heroDesc}>
              BarakFi screens <strong>{totalStocks || "500+"} NSE &amp; BSE stocks</strong> for Shariah compliance with transparent ratio context.
            </p>
            <div className={styles.heroActions}>
              <Link href="/screener" className={styles.btnSolid}>Open Screener</Link>
              <Link href="/methodology" className={styles.btnOutline}>Read Methodology</Link>
            </div>
          </div>

          <HomeV2Search trendingSymbols={trendingSymbols} />
        </div>

        <div className={styles.heroStats}>
          <div className={styles.hstat}>
            <div className={styles.hstatN}>{totalStocks || "500+"}</div>
            <div className={styles.hstatL}>Stocks screened</div>
          </div>
          <div className={styles.hstat}>
            <div className={styles.hstatN}>{totalSectors || "25+"}</div>
            <div className={styles.hstatL}>Sectors covered</div>
          </div>
          <div className={styles.hstat}>
            <div className={styles.hstatN}>{compliantInFeatured}</div>
            <div className={styles.hstatL}>Compliant in top set</div>
          </div>
          <div className={styles.hstat}>
            <div className={styles.hstatN}>Free</div>
            <div className={styles.hstatL}>Always · No login required</div>
          </div>
        </div>
      </section>

      <section className={styles.mq} aria-label="Capabilities marquee">
        <div className={styles.mqInner}>
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span className={styles.mqItem} key={`${item}-${i}`}>
              {item}
              <span>◆</span>
            </span>
          ))}
        </div>
      </section>

      <section className={styles.how}>
        <div className={styles.sectionEyebrow}>How it works</div>
        <div className={styles.steps}>
          <article className={styles.step}>
            <div className={styles.stepNum}>01</div>
            <h3 className={styles.stepTitle}>Search or Browse</h3>
            <p className={styles.stepBody}>
              Enter any stock name or ticker. Or browse by <strong>sector, market cap, or index</strong>.
            </p>
          </article>
          <article className={styles.step}>
            <div className={styles.stepNum}>02</div>
            <h3 className={styles.stepTitle}>See the Verdict</h3>
            <p className={styles.stepBody}>
              Every stock gets one of three states: <strong>Shariah Compliant, Requires Review, or Not Compliant</strong>.
            </p>
          </article>
          <article className={styles.step}>
            <div className={styles.stepNum}>03</div>
            <h3 className={styles.stepTitle}>Understand the Why</h3>
            <p className={styles.stepBody}>
              Open any stock to review the ratio breakdown: debt, interest income, and non-compliant revenue.
            </p>
          </article>
        </div>
      </section>

      <section className={styles.preview}>
        <div className={styles.previewHead}>
          <div className={styles.previewTitle}>527 stocks. One <span className={styles.hl}>clear answer</span> each.</div>
          <div className={styles.previewSub}>
            Filter by compliance status, sector, and market cap in the screener. Every verdict is backed by transparent methodology.
          </div>
        </div>

        <div className={styles.filterRow}>
          <Link href="/screener" className={`${styles.filterChip} ${styles.filterChipActive}`}>All Stocks</Link>
          <Link href="/screener?status=HALAL" className={styles.filterChip}>Shariah Compliant</Link>
          <Link href="/screener?status=CAUTIOUS" className={styles.filterChip}>Requires Review</Link>
          <Link href="/screener?status=NON_COMPLIANT" className={styles.filterChip}>Not Compliant</Link>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.stkTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Sector</th>
                <th>Market Cap</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {featuredWithStatus.map((stock, idx) => (
                <tr key={stock.symbol}>
                  <td>{idx + 1}</td>
                  <td>
                    <Link href={`/screening/${encodeURIComponent(stock.symbol)}`} className={styles.nameLink}>
                      <div className={styles.tk}>{stock.symbol}</div>
                      <div className={styles.co}>{stock.name}</div>
                    </Link>
                  </td>
                  <td><span className={styles.sect}>{stock.sector}</span></td>
                  <td>{formatMcap(stock.market_cap, stock.currency)}</td>
                  <td>{formatPrice(stock.price, stock.currency)}</td>
                  <td><span className={`${styles.badge} ${statusClass(stock.status)}`}>{statusLabel(stock.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.tableFooter}>
          <div className={styles.tableNote}>Live data sourced from backend APIs with periodic refresh.</div>
          <Link href="/screener" className={styles.btnSolid}>Open Full Screener</Link>
        </div>
      </section>

      <section className={styles.tools}>
        <div className={styles.sectionEyebrow}>Tools</div>
        <div className={styles.toolsGrid}>
          <article className={styles.toolCard}>
            <div className={styles.toolTag}>Calculator</div>
            <h3 className={styles.toolTitle}>Purification Calculator</h3>
            <p className={styles.toolBody}>Estimate the non-permissible portion from dividends and gains.</p>
            <Link href="/tools/purification" className={styles.toolLink}>Open tool →</Link>
          </article>
          <article className={styles.toolCard}>
            <div className={styles.toolTag}>Calculator</div>
            <h3 className={styles.toolTitle}>Zakat Calculator</h3>
            <p className={styles.toolBody}>Compute zakat with an equity-aware workflow designed for investors.</p>
            <Link href="/tools/zakat" className={styles.toolLink}>Open tool →</Link>
          </article>
          <article className={styles.toolCard}>
            <div className={styles.toolTag}>Insights</div>
            <h3 className={styles.toolTitle}>Trending Stocks</h3>
            <p className={styles.toolBody}>Track frequently checked symbols and compare compliance movement.</p>
            <Link href="/trending" className={styles.toolLink}>View trends →</Link>
          </article>
          <article className={styles.toolCard}>
            <div className={styles.toolTag}>Research</div>
            <h3 className={styles.toolTitle}>Methodology</h3>
            <p className={styles.toolBody}>Understand thresholds and screening logic before taking decisions.</p>
            <Link href="/methodology" className={styles.toolLink}>Read methodology →</Link>
          </article>
        </div>
      </section>

      <section className={styles.method}>
        <div className={styles.methodLeft}>
          Screening built on <span className={styles.hl}>transparent criteria</span>
        </div>
        <div className={styles.methodRight}>
          <div className={styles.criteria}>
            <div className={styles.criterion}>
              <span className={styles.critNum}>01</span>
              <div>
                <div className={styles.critTitle}>Debt to market cap</div>
                <div className={styles.critBody}>Assesses leverage against valuation thresholds.</div>
              </div>
            </div>
            <div className={styles.criterion}>
              <span className={styles.critNum}>02</span>
              <div>
                <div className={styles.critTitle}>Interest and non-permissible income</div>
                <div className={styles.critBody}>Flags revenue streams beyond accepted limits.</div>
              </div>
            </div>
            <div className={styles.criterion}>
              <span className={styles.critNum}>03</span>
              <div>
                <div className={styles.critTitle}>Receivables and cash composition</div>
                <div className={styles.critBody}>Evaluates balance-sheet quality for screening context.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.sectors}>
        <div className={styles.sectionEyebrow}>Top sectors by coverage</div>
        <div className={styles.sectorGrid}>
          {sectorCounts.map(([sector, count]) => (
            <Link key={sector} href={`/screener?sector=${encodeURIComponent(sector)}`} className={styles.sectorCell}>
              <div className={styles.scName}>{sector}</div>
              <div className={styles.scCount}>{count} stocks</div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.ctaLeft}>
          <h2>
            Start screening with
            <br />
            <span className={styles.hl}>confidence</span>
          </h2>
        </div>
        <div className={styles.ctaRight}>
          <p>
            Use BarakFi to review debt exposure, non-permissible income, and other screening ratios before deeper research.
          </p>
          <Link href="/screener" className={styles.btnSolid}>Check Stocks</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div>
          <div className={styles.footerBrand}>Barak<span>Fi</span></div>
          <p className={styles.footerSub}>Shariah-compliant equity screening for the Indian market.</p>
        </div>
        <div className={styles.footerCols}>
          <div>
            <div className={styles.footerColH}>Product</div>
            <Link href="/screener">Screener</Link>
            <Link href="/watchlist">Watchlist</Link>
            <Link href="/trending">Trending</Link>
          </div>
          <div>
            <div className={styles.footerColH}>Resources</div>
            <Link href="/halal-stocks">Halal Stocks India</Link>
            <Link href="/methodology">Methodology</Link>
            <Link href="/tools/purification">Purification</Link>
          </div>
          <div>
            <div className={styles.footerColH}>Legal</div>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/disclaimer">Disclaimer</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

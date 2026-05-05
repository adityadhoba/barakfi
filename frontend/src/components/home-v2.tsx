import Link from "next/link";
import { DM_Serif_Display } from "next/font/google";
import {
  getMarketIndices,
  getScreenerSnapshot,
  getStocks,
  type IndexQuote,
  type ScreenerSnapshotEntry,
  type Stock,
} from "@/lib/api";
import { screeningUiLabel } from "@/lib/screening-status";
import styles from "./home-v2.module.css";

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

type AboutTicker = {
  name: string;
  value: number;
  change: number;
  changePercent: number;
};

type AboutRow = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  status: string;
};

const FALLBACK_TICKER: AboutTicker[] = [
  { name: "NIFTY 50", value: 23842.75, change: 127.3, changePercent: 0.54 },
  { name: "SENSEX", value: 78553.2, change: 418.45, changePercent: 0.54 },
  { name: "NIFTY BANK", value: 51236.8, change: -89.15, changePercent: -0.17 },
  { name: "NIFTY IT", value: 33156.4, change: 245.6, changePercent: 0.75 },
  { name: "NIFTY PHARMA", value: 19872.35, change: 56.2, changePercent: 0.28 },
  { name: "INDIA VIX", value: 13.42, change: -0.38, changePercent: -2.75 },
];

function normalizeIndices(indices: IndexQuote[]): AboutTicker[] {
  return indices.map((i) => ({
    name: i.name,
    value: i.value,
    change: i.change,
    changePercent: i.change_percent,
  }));
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function formatRupee(value: number): string {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatMarketCapToLakhCrore(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  const lakhCrore = value / 1e12;
  if (lakhCrore >= 1) return `₹${lakhCrore.toFixed(2)} L`;
  const crore = value / 1e7;
  return `₹${crore.toFixed(0)} Cr`;
}

function sortByMarketCap(entries: ScreenerSnapshotEntry[]): ScreenerSnapshotEntry[] {
  return [...entries].sort((a, b) => (b.stock.market_cap || 0) - (a.stock.market_cap || 0));
}

function buildRows(snapshot: ScreenerSnapshotEntry[], stocks: Stock[]): AboutRow[] {
  if (snapshot.length > 0) {
    return sortByMarketCap(snapshot).slice(0, 6).map((entry) => ({
      symbol: entry.stock.symbol,
      name: entry.stock.name,
      sector: entry.stock.sector || "—",
      price: entry.stock.price || 0,
      status: screeningUiLabel(entry.screening.status),
    }));
  }

  return stocks.slice(0, 6).map((s) => ({
    symbol: s.symbol,
    name: s.name,
    sector: s.sector || "—",
    price: s.price || 0,
    status: "Requires Review",
  }));
}

function statusClass(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized.includes("COMPLIANT") && !normalized.includes("NOT")) return styles.badgePass;
  if (normalized.includes("NOT COMPLIANT")) return styles.badgeFail;
  return styles.badgeReview;
}

export async function HomeV2() {
  const [stocks, indices, snapshot] = await Promise.all([
    getStocks({ limit: 600, orderBy: "market_cap_desc", revalidateSeconds: 300 }),
    getMarketIndices(),
    getScreenerSnapshot().catch(() => [] as ScreenerSnapshotEntry[]),
  ]);

  const ticker = indices.length > 0 ? normalizeIndices(indices) : FALLBACK_TICKER;
  const rows = buildRows(snapshot, stocks);
  const stockCount = stocks.length || 527;
  const sectorCount = new Set(stocks.map((s) => s.sector).filter(Boolean)).size || 29;
  const compliantCount = snapshot.filter((s) => s.screening.status === "HALAL").length;
  const reviewCount = snapshot.filter((s) => s.screening.status === "CAUTIOUS").length;
  const nonCompliantCount = snapshot.filter((s) => s.screening.status === "NON_COMPLIANT").length;

  return (
    <main className={styles.page}>
      <section className={styles.ticker}>
        <div className={styles.tickerTrack}>
          {[...ticker, ...ticker].map((item, idx) => {
            const up = item.change >= 0;
            return (
              <span key={`${item.name}-${idx}`} className={styles.tickerItem}>
                <b>{item.name}</b> {formatNumber(item.value)}{" "}
                <span className={up ? styles.up : styles.down}>
                  {up ? "+" : ""}
                  {item.changePercent.toFixed(2)}%
                </span>
              </span>
            );
          })}
        </div>
      </section>

      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <p className={styles.eyebrow}>NSE &amp; BSE · {stockCount} Stocks · AAOIFI Methodology</p>
          <h1 className={`${styles.heroTitle} ${dmSerif.className}`}>
            Know every <span>stock.</span>
          </h1>
          <p className={styles.heroCopy}>
            BarakFi screens <strong>{stockCount} NSE &amp; BSE stocks</strong> for Shariah compliance with
            transparent ratio context across debt, interest, receivables, and non-permissible income.
          </p>
          <div className={styles.heroActions}>
            <Link href="/screener" className={styles.btnPrimary}>Open Screener</Link>
            <Link href="/methodology" className={styles.btnText}>Read our methodology →</Link>
          </div>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.bigStat}>
            <span className={`${styles.bigNumber} ${dmSerif.className}`}>{stockCount}</span>
            <span className={styles.bigLabel}>Stocks screened across NSE &amp; BSE</span>
          </div>
          <div className={styles.statGrid}>
            <div className={styles.statCell}>
              <span className={`${styles.statNumber} ${dmSerif.className}`}>3 Verdicts</span>
              <span className={styles.statLabel}>Compliant · Review · Not Compliant</span>
            </div>
            <div className={styles.statCell}>
              <span className={`${styles.statNumber} ${dmSerif.className}`}>AAOIFI</span>
              <span className={styles.statLabel}>Aligned methodology</span>
            </div>
            <div className={styles.statCell}>
              <span className={`${styles.statNumber} ${dmSerif.className}`}>Free</span>
              <span className={styles.statLabel}>Always · No login required</span>
            </div>
            <div className={styles.statCell}>
              <span className={`${styles.statNumber} ${dmSerif.className}`}>{sectorCount} Sectors</span>
              <span className={styles.statLabel}>Filter by sector &amp; cap</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.statement}>
        <p className={`${styles.statementLead} ${dmSerif.className}`}>
          The market has thousands of stocks. Most of them, you should not touch.
        </p>
        <p className={styles.statementBody}>
          We run listed companies through an evidence-first Shariah screening framework and convert
          complexity into one clear verdict: Shariah Compliant, Requires Review, or Not Compliant.
        </p>
      </section>

      <section className={styles.pillars}>
        <article className={styles.pillar}>
          <span className={styles.pillarNum}>01</span>
          <h2 className={`${styles.pillarTitle} ${dmSerif.className}`}>Shariah Stock Screener</h2>
          <p className={styles.pillarBody}>
            Screen across debt, income purity, receivables, and sector exposure with transparent thresholds and rationale.
          </p>
        </article>
        <article className={styles.pillar}>
          <span className={styles.pillarNum}>02</span>
          <h2 className={`${styles.pillarTitle} ${dmSerif.className}`}>Compliant Watchlist</h2>
          <p className={styles.pillarBody}>
            Save stocks and revisit compliance changes over time with the same consistent methodology context.
          </p>
        </article>
        <article className={styles.pillar}>
          <span className={styles.pillarNum}>03</span>
          <h2 className={`${styles.pillarTitle} ${dmSerif.className}`}>Tools &amp; Calculators</h2>
          <p className={styles.pillarBody}>
            Use purification and zakat tools to complete your workflow with practical Islamic finance utilities.
          </p>
        </article>
      </section>

      <section className={styles.tableSection}>
        <div className={styles.tableCopy}>
          <h2 className={`${styles.tableTitle} ${dmSerif.className}`}>One verdict. No ambiguity.</h2>
          <p>
            Live snapshot from our screening engine and market data stack.
            {snapshot.length > 0
              ? ` ${compliantCount} compliant · ${reviewCount} review · ${nonCompliantCount} not compliant.`
              : " Showing safe fallback rows while live screening data refreshes."}
          </p>
          <Link href="/screener" className={styles.btnPrimary}>Open Screener</Link>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Stock</th>
                <th>Sector</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.symbol}>
                  <td>
                    <div className={styles.symbol}>{row.symbol}</div>
                    <div className={styles.company}>{row.name}</div>
                  </td>
                  <td>{row.sector}</td>
                  <td>{formatRupee(row.price)}</td>
                  <td>
                    <span className={`${styles.badge} ${statusClass(row.status)}`}>{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 0 && (
            <p className={styles.tableMeta}>
              Largest row market cap: {formatMarketCapToLakhCrore(snapshot[0]?.stock?.market_cap || stocks[0]?.market_cap || 0)}
            </p>
          )}
        </div>
      </section>

      <section className={styles.closing}>
        <h2 className={`${styles.closingTitle} ${dmSerif.className}`}>Know more. Always.</h2>
        <div className={styles.closingBody}>
          <p>
            BarakFi gives clear outcomes with transparent evidence. Educational only — not a religious ruling or investment advice.
          </p>
          <Link href="/screener" className={styles.btnPrimary}>Open Screener</Link>
        </div>
      </section>

      <footer className={styles.localFooter}>
        <div>
          <p className={`${styles.localBrand} ${dmSerif.className}`}>BarakFi</p>
          <p className={styles.localSub}>Shariah-compliant stock research for Indian markets.</p>
        </div>
        <div className={styles.localCols}>
          <div>
            <p className={styles.localHead}>Product</p>
            <Link href="/screener">Screener</Link>
            <Link href="/watchlist">Watchlist</Link>
            <Link href="/compare">Compare</Link>
          </div>
          <div>
            <p className={styles.localHead}>Learn</p>
            <Link href="/methodology">Methodology</Link>
            <Link href="/about-us">About Us</Link>
          </div>
          <div>
            <p className={styles.localHead}>Legal</p>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/disclaimer">Disclaimer</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

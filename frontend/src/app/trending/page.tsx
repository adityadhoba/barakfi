import type { Metadata } from "next";
import Link from "next/link";
import { DM_Serif_Display } from "next/font/google";
import { EditorialChrome } from "@/components/editorial-chrome";
import { getBulkScreeningResults, getMarketIndices, getTrending, type IndexQuote } from "@/lib/api";
import styles from "./trending.module.css";

export const metadata: Metadata = {
  title: "Trending Stocks — Halal Gainers, Losers & Most Active",
  description: "Discover trending halal stocks on NSE and BSE with live market context and screening status.",
  alternates: { canonical: "https://barakfi.in/trending" },
};

export const dynamic = "force-dynamic";

const serif = DM_Serif_Display({ subsets: ["latin"], weight: "400" });

const TABS = [
  { key: "popular", label: "All" },
  { key: "gainers", label: "Gainers" },
  { key: "losers", label: "Losers" },
  { key: "most-active", label: "Most Active" },
  { key: "52w-high", label: "52W High" },
  { key: "52w-low", label: "52W Low" },
];

const PANEL_CONFIG = [
  { key: "gainers", label: "Top Gainers", tone: "up" },
  { key: "losers", label: "Top Losers", tone: "down" },
  { key: "most-active", label: "Most Active", tone: "gold" },
  { key: "52w-high", label: "52W High", tone: "amber" },
] as const;

function isValidCategory(value: string | undefined): value is (typeof TABS)[number]["key"] {
  return !!value && TABS.some((tab) => tab.key === value);
}

function formatCurrency(value: number, currency: string = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function statusLabel(status?: string | null) {
  if (status === "HALAL") return "Compliant";
  if (status === "NON_COMPLIANT") return "Not Compliant";
  return "Requires Review";
}

function statusClass(status?: string | null) {
  if (status === "HALAL") return styles.badgeCompliant;
  if (status === "NON_COMPLIANT") return styles.badgeNonCompliant;
  return styles.badgeReview;
}

function toneClass(tone: (typeof PANEL_CONFIG)[number]["tone"]) {
  if (tone === "up") return styles.panelDotUp;
  if (tone === "down") return styles.panelDotDown;
  if (tone === "amber") return styles.panelDotAmber;
  return styles.panelDotGold;
}

function pickIndices(indices: IndexQuote[]) {
  const wanted = ["NIFTY 50", "SENSEX", "NIFTY BANK", "INDIA VIX"];
  return wanted.map((name) => indices.find((item) => item.name.toUpperCase().includes(name)) ?? null);
}

export default async function TrendingPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const activeCategory = isValidCategory(params.category) ? params.category : "popular";

  const [indices, activeStocks, ...panelSets] = await Promise.all([
    getMarketIndices(),
    getTrending(activeCategory, undefined, 14),
    ...PANEL_CONFIG.map((panel) => getTrending(panel.key, undefined, 6).catch(() => [])),
  ]);

  const allSymbols = Array.from(new Set([activeStocks, ...panelSets].flat().map((stock) => stock.symbol)));
  const screenings = allSymbols.length ? await getBulkScreeningResults(allSymbols).catch(() => []) : [];
  const screeningMap = new Map(screenings.map((item) => [item.symbol, item]));
  const selectedIndices = pickIndices(indices);

  return (
    <EditorialChrome activeHref="/trending">
      <main className={styles.page}>
        <header className={styles.pageHeader}>
          <div>
            <div className={styles.eyebrow}>Market Pulse</div>
            <h1 className={`${styles.title} ${serif.className}`}>Trending<br /><em>Halal Stocks</em></h1>
            <p className={styles.subtitle}>Top gainers, losers, most-searched and 52-week extremes — filtered to show Shariah compliance status alongside every move.</p>
          </div>
          <div className={styles.headerMeta}>
            <div className={styles.metaLabel}>Stocks Covered</div>
            <div className={`${styles.metaValue} ${serif.className}`}>{allSymbols.length || 527}</div>
            <div className={styles.metaSub}>NSE &amp; BSE · Updated daily</div>
          </div>
        </header>

        <section className={styles.indexStrip}>
          {selectedIndices.map((item, index) => (
            <div key={item?.name || index} className={styles.indexCard}>
              <div className={styles.indexName}>{item?.name || ["NIFTY 50", "SENSEX", "NIFTY BANK", "INDIA VIX"][index]}</div>
              <div className={`${styles.indexValue} ${serif.className}`}>{item ? Math.round(item.value).toLocaleString("en-IN") : "—"}</div>
              <div className={styles.indexChangeRow}>
                <span className={(item?.change_percent ?? 0) >= 0 ? styles.up : styles.down}>
                  {(item?.change_percent ?? 0) >= 0 ? "▲" : "▼"} {item ? `${item.change >= 0 ? "+" : ""}${item.change.toFixed(2)}` : "—"}
                </span>
                <span className={styles.indexMuted}>{item ? `${item.change_percent >= 0 ? "+" : ""}${item.change_percent.toFixed(2)}%` : "—"}</span>
              </div>
            </div>
          ))}
        </section>

        <nav className={styles.tabsBar}>
          {TABS.map((tab) => (
            <Link key={tab.key} href={tab.key === "popular" ? "/trending" : `/trending?category=${tab.key}`} className={`${styles.tab} ${activeCategory === tab.key ? styles.activeTab : ""}`}>
              {tab.label}
            </Link>
          ))}
        </nav>

        <section className={styles.panels}>
          {PANEL_CONFIG.map((panel, panelIndex) => {
            const stocks = panelSets[panelIndex] ?? [];
            return (
              <article key={panel.key} className={styles.panel}>
                <div className={styles.panelTitle}><span className={toneClass(panel.tone)} />{panel.label}</div>
                {stocks.map((stock) => {
                  const screening = screeningMap.get(stock.symbol);
                  return (
                    <Link key={`${panel.key}-${stock.symbol}`} href={`/stocks/${encodeURIComponent(stock.symbol)}`} className={styles.miniRow}>
                      <div className={styles.miniLeft}>
                        <div className={styles.miniTicker}>{stock.symbol}</div>
                        <div className={styles.miniCompany}>{stock.name}</div>
                      </div>
                      <div className={styles.miniRight}>
                        <div className={styles.miniPrice}>{formatCurrency(stock.price, stock.currency)}</div>
                        <div className={`${styles.miniStatus} ${statusClass(screening?.status)}`}>{statusLabel(screening?.status)}</div>
                      </div>
                    </Link>
                  );
                })}
              </article>
            );
          })}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionEyebrow}>Live Board</div>
          <div className={styles.sectionTabs}>
            {TABS.map((tab) => (
              <Link key={tab.key} href={tab.key === "popular" ? "/trending" : `/trending?category=${tab.key}`} className={`${styles.sectionTab} ${activeCategory === tab.key ? styles.sectionTabActive : ""}`}>
                {tab.label}
              </Link>
            ))}
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Stock</th>
                <th>Sector</th>
                <th>Price</th>
                <th>Market Cap</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeStocks.map((stock, index) => {
                const screening = screeningMap.get(stock.symbol);
                return (
                  <tr key={`${activeCategory}-${stock.symbol}`}>
                    <td className={styles.rank}>{String(index + 1).padStart(2, "0")}</td>
                    <td>
                      <Link href={`/stocks/${encodeURIComponent(stock.symbol)}`} className={styles.stockLink}>
                        <span className={styles.stockTicker}>{stock.symbol}</span>
                        <span className={styles.stockName}>{stock.name}</span>
                      </Link>
                    </td>
                    <td><span className={styles.sector}>{stock.sector || "—"}</span></td>
                    <td>{formatCurrency(stock.price, stock.currency)}</td>
                    <td>{stock.market_cap ? formatCompact(stock.market_cap) : "—"}</td>
                    <td><span className={`${styles.badge} ${statusClass(screening?.status)}`}>{statusLabel(screening?.status)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </main>
    </EditorialChrome>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { DM_Serif_Display } from "next/font/google";
import { useBatchQuotes } from "@/hooks/use-batch-quotes";
import type { ScreeningResult, WatchlistEntry } from "@/lib/api";
import { formatMoney, resolveDisplayCurrency, resolveMarketLabel } from "@/lib/currency-format";
import { exchangeForBatchQuote } from "@/lib/exchange-for-quotes";
import { useToast } from "@/components/toast";
import { LocalMarketingNav } from "@/components/local-marketing-nav";
import styles from "./watchlist-html-page.module.css";

const serif = DM_Serif_Display({ subsets: ["latin"], weight: "400" });

type EnrichedEntry = WatchlistEntry & {
  screening: ScreeningResult | null;
};

const TICKER_ITEMS = [
  { label: "NIFTY 50", value: "23,842.75", change: "+0.54%", positive: true },
  { label: "SENSEX", value: "78,553.20", change: "+0.54%", positive: true },
  { label: "NIFTY BANK", value: "51,236.80", change: "-0.17%", positive: false },
  { label: "NIFTY IT", value: "33,156.40", change: "+0.75%", positive: true },
  { label: "NIFTY PHARMA", value: "19,872.35", change: "+0.28%", positive: true },
  { label: "NIFTY AUTO", value: "23,145.90", change: "-0.48%", positive: false },
  { label: "NIFTY FMCG", value: "56,234.15", change: "+0.32%", positive: true },
  { label: "INDIA VIX", value: "13.42", change: "-2.75%", positive: false },
];

const PUBLIC_ROWS = [
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "IT", price: "₹3,577", change: "+0.84%", status: "compliant" },
  { symbol: "INFY", name: "Infosys Limited", sector: "IT", price: "₹1,829", change: "+0.61%", status: "compliant" },
  { symbol: "MARUTI", name: "Maruti Suzuki India", sector: "Auto", price: "₹13,335", change: "+0.42%", status: "compliant" },
  { symbol: "CGPOWER", name: "CG Power & Industrial Solutions", sector: "Capital Goods", price: "₹802", change: "-0.21%", status: "review" },
];

const STATUS_LABELS: Record<string, string> = {
  HALAL: "Compliant",
  CAUTIOUS: "Requires Review",
  NON_COMPLIANT: "Not Compliant",
};

const NAV_ITEMS = [
  { href: "/screener", label: "Screener" },
  { href: "/trending", label: "Trending" },
  { href: "/methodology", label: "Methodology" },
  { href: "/watchlist", label: "Watchlist" },
];

function badgeVariant(status: string | null | undefined) {
  if (status === "HALAL" || status === "compliant") return styles.badgeCompliant;
  if (status === "NON_COMPLIANT" || status === "not_compliant") return styles.badgeNonCompliant;
  return styles.badgeReview;
}

function labelForStatus(status: string | null | undefined) {
  if (!status) return "Requires Review";
  if (status === "compliant") return "Compliant";
  if (status === "review") return "Requires Review";
  if (status === "not_compliant") return "Not Compliant";
  return STATUS_LABELS[status] || status.replaceAll("_", " ");
}

export function WatchlistHtmlPage({
  signedIn,
  entries,
}: {
  signedIn: boolean;
  entries: EnrichedEntry[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "HALAL" | "CAUTIOUS" | "NON_COMPLIANT">("all");
  const [pendingSymbol, setPendingSymbol] = useState<string | null>(null);

  const symbols = useMemo(() => entries.map((entry) => entry.stock.symbol), [entries]);
  const exchangeBySymbol = useMemo(() => {
    const map: Record<string, string> = {};
    for (const entry of entries) {
      map[entry.stock.symbol] = exchangeForBatchQuote(entry.stock.exchange, entry.stock.currency);
    }
    return map;
  }, [entries]);

  const quotes = useBatchQuotes(symbols, exchangeBySymbol);

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const matchesQuery =
        query.trim().length === 0 ||
        entry.stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
        entry.stock.name.toLowerCase().includes(query.toLowerCase());
      const status = entry.screening?.status || "CAUTIOUS";
      const matchesFilter = filter === "all" || status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [entries, filter, query]);

  const summary = useMemo(
    () => ({
      compliant: entries.filter((entry) => entry.screening?.status === "HALAL").length,
      review: entries.filter((entry) => entry.screening?.status === "CAUTIOUS" || !entry.screening?.status).length,
      nonCompliant: entries.filter((entry) => entry.screening?.status === "NON_COMPLIANT").length,
    }),
    [entries],
  );

  async function removeSymbol(symbol: string) {
    setPendingSymbol(symbol);
    try {
      const response = await fetch(`/api/watchlist/${encodeURIComponent(symbol)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.detail || payload?.error || "Could not remove watchlist item");
      }
      toast(`${symbol} removed from watchlist`, "info");
      startTransition(() => router.refresh());
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not remove watchlist item", "error");
    } finally {
      setPendingSymbol(null);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.ticker}>
        <div className={styles.tickerTrack}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, index) => (
            <span className={styles.tickerItem} key={`${item.label}-${index}`}>
              <b>{item.label}</b> {item.value}{" "}
              <span className={item.positive ? styles.tickerUp : styles.tickerDown}>{item.change}</span>
            </span>
          ))}
        </div>
      </div>

      <LocalMarketingNav activeHref="/watchlist" items={NAV_ITEMS} />

      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.eyebrow}>Your Watchlist</div>
          <h1 className={`${styles.title} ${serif.className}`}>
            Track what
            <br />
            <span>matters</span> to you.
          </h1>
          <p className={styles.heroCopy}>
            Save stocks, monitor their compliance status over time, and keep your BarakFi research list in one place with
            <strong> live prices and status labels.</strong>
          </p>
        </div>

        <div className={styles.heroRight}>
          <div className={styles.featureList}>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>◎</div>
              <div className={styles.featureText}>
                <strong>Track screened stocks</strong>
                Save any NSE stock from the screener and revisit it from one clean dashboard.
              </div>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>◌</div>
              <div className={styles.featureText}>
                <strong>Live context</strong>
                See fresh price snapshots beside the saved compliance status you care about.
              </div>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>◇</div>
              <div className={styles.featureText}>
                <strong>Filter quickly</strong>
                View only Compliant, Requires Review, or Not Compliant names in seconds.
              </div>
            </div>
          </div>

          {signedIn ? (
            <div className={styles.heroCard}>
              <div className={`${styles.heroCardTitle} ${serif.className}`}>Your saved view</div>
              <p className={styles.heroCardBody}>
                {entries.length} saved {entries.length === 1 ? "stock" : "stocks"} across your BarakFi watchlist.
                Use the filters below or jump back to the screener to add more.
              </p>
              <div className={styles.heroStats}>
                <div><strong>{summary.compliant}</strong><span>Compliant</span></div>
                <div><strong>{summary.review}</strong><span>Review</span></div>
                <div><strong>{summary.nonCompliant}</strong><span>Not compliant</span></div>
              </div>
              <div className={styles.heroActions}>
                <Link href="/screener" className={styles.primaryButton}>Open Screener</Link>
                <Link href="/account" className={styles.secondaryButton}>Open Account</Link>
              </div>
            </div>
          ) : (
            <div className={styles.heroCard}>
              <div className={`${styles.heroCardTitle} ${serif.className}`}>Sign in to view your watchlist</div>
              <p className={styles.heroCardBody}>
                Your saved stocks live in your BarakFi account. Sign in to access them across devices and keep your list synced.
              </p>
              <div className={styles.heroActions}>
                <Link href="/sign-in?redirect_url=%2Fwatchlist" className={styles.primaryButton}>Sign In</Link>
                <Link href="/screener" className={styles.secondaryButton}>Browse Screener</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionEyebrow}>Watchlist Dashboard</div>
        <div className={`${styles.sectionTitle} ${serif.className}`}>
          {signedIn ? "Your saved stocks" : "What it looks like"}
        </div>
        <p className={styles.sectionSub}>
          {signedIn
            ? "Use search and status filters to scan your watchlist quickly. Removing a stock updates your BarakFi account immediately."
            : "Once signed in, you’ll see all your saved stocks here with live prices, compliance labels, and a faster research workflow."}
        </p>

        <div className={styles.toolbar}>
          <label className={styles.searchBox}>
            <span aria-hidden>⌕</span>
            <input
              disabled={!signedIn}
              placeholder={signedIn ? "Search your watchlist…" : "Search your watchlist…"}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className={styles.chips}>
            {[
              { key: "all", label: "All" },
              { key: "HALAL", label: "Compliant" },
              { key: "CAUTIOUS", label: "Review" },
              { key: "NON_COMPLIANT", label: "Not Compliant" },
            ].map((chip) => (
              <button
                key={chip.key}
                type="button"
                disabled={!signedIn}
                className={`${styles.filterChip} ${filter === chip.key ? styles.filterChipActive : ""}`}
                onClick={() => setFilter(chip.key as "all" | "HALAL" | "CAUTIOUS" | "NON_COMPLIANT")}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {signedIn ? (
          filtered.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Stock</th>
                    <th>Sector</th>
                    <th>Price</th>
                    <th>Today</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => {
                    const quote = quotes[entry.stock.symbol];
                    const currentPrice = quote?.last_price ?? entry.stock.price;
                    const change = quote?.change_percent;
                    const status = entry.screening?.status || "CAUTIOUS";
                    return (
                      <tr key={entry.id}>
                        <td>
                          <Link href={`/stocks/${encodeURIComponent(entry.stock.symbol)}`} className={styles.stockLink}>
                            <span className={styles.stockTicker}>{entry.stock.symbol}</span>
                            <span className={styles.stockCompany}>{entry.stock.name}</span>
                          </Link>
                        </td>
                        <td><span className={styles.secondaryText}>{entry.stock.sector || "—"}</span></td>
                        <td>{formatMoney(currentPrice, resolveDisplayCurrency(entry.stock.exchange, entry.stock.currency))}</td>
                        <td className={change == null ? styles.secondaryText : change >= 0 ? styles.up : styles.down}>
                          {change == null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
                        </td>
                        <td><span className={`${styles.badge} ${badgeVariant(status)}`}>{labelForStatus(status)}</span></td>
                        <td>
                          <span className={styles.secondaryText}>
                            {entry.latest_research_summary || `Saved from ${resolveMarketLabel(entry.stock.exchange, entry.stock.currency)}`}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.removeButton}
                            disabled={pendingSymbol === entry.stock.symbol}
                            onClick={() => void removeSymbol(entry.stock.symbol)}
                          >
                            {pendingSymbol === entry.stock.symbol ? "…" : "×"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={`${styles.emptyTitle} ${serif.className}`}>Your watchlist is empty</div>
              <p className={styles.emptyBody}>
                Save stocks from the screener to build a cleaner research list and revisit names faster.
              </p>
              <Link href="/screener" className={styles.primaryButton}>Browse Screener</Link>
            </div>
          )
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Stock</th>
                  <th>Sector</th>
                  <th>Price</th>
                  <th>Today</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {PUBLIC_ROWS.map((row) => (
                  <tr key={row.symbol}>
                    <td>
                      <div className={styles.stockLink}>
                        <span className={styles.stockTicker}>{row.symbol}</span>
                        <span className={styles.stockCompany}>{row.name}</span>
                      </div>
                    </td>
                    <td><span className={styles.secondaryText}>{row.sector}</span></td>
                    <td>{row.price}</td>
                    <td className={row.change.startsWith("-") ? styles.down : styles.up}>{row.change}</td>
                    <td><span className={`${styles.badge} ${badgeVariant(row.status)}`}>{labelForStatus(row.status)}</span></td>
                    <td><button type="button" className={styles.removeButton} disabled>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className={styles.footer}>
        <div>
          <div className={`${styles.footerBrand} ${serif.className}`}>Barak<span>Fi</span></div>
          <div className={styles.footerSub}>Shariah-compliant stock research for Indian markets. Built with care.</div>
        </div>
        <div className={styles.footerCols}>
          <div className={styles.footerCol}>
            <div className={styles.footerHeading}>Product</div>
            <Link href="/screener">Screener</Link>
            <Link href="/watchlist">Watchlist</Link>
            <Link href="/tools">Tools</Link>
          </div>
          <div className={styles.footerCol}>
            <div className={styles.footerHeading}>Learn</div>
            <Link href="/methodology">Methodology</Link>
            <Link href="/about-us">About</Link>
          </div>
          <div className={styles.footerCol}>
            <div className={styles.footerHeading}>Legal</div>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/disclaimer">Disclaimer</Link>
          </div>
        </div>
      </footer>
      <div className={styles.footerBottom}>
        <span>© 2026 BarakFi · Educational screening · Not a religious ruling or financial advice</span>
        <span>Made in India</span>
      </div>
    </main>
  );
}

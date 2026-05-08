import Link from "next/link";
import { DM_Serif_Display } from "next/font/google";
import { LocalMarketingNav } from "@/components/local-marketing-nav";
import styles from "./editorial-chrome.module.css";

const serif = DM_Serif_Display({ subsets: ["latin"], weight: "400" });

const TICKER_ITEMS = [
  { label: "NIFTY 50", value: "23,842.75", change: "+0.54%", positive: true },
  { label: "SENSEX", value: "78,553.20", change: "+0.54%", positive: true },
  { label: "NIFTY BANK", value: "51,236.80", change: "−0.17%", positive: false },
  { label: "NIFTY IT", value: "33,156.40", change: "+0.75%", positive: true },
  { label: "NIFTY PHARMA", value: "19,872.35", change: "+0.28%", positive: true },
  { label: "NIFTY AUTO", value: "23,145.90", change: "−0.48%", positive: false },
  { label: "NIFTY FMCG", value: "56,234.15", change: "+0.32%", positive: true },
  { label: "INDIA VIX", value: "13.42", change: "−2.75%", positive: false },
];

export function EditorialChrome({
  activeHref,
  children,
}: {
  activeHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <div className={styles.ticker}>
        <div className={styles.track}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, index) => (
            <span className={styles.item} key={`${item.label}-${index}`}>
              <b>{item.label}</b> {item.value}{" "}
              <span className={item.positive ? styles.up : styles.down}>{item.change}</span>
            </span>
          ))}
        </div>
      </div>

      <LocalMarketingNav activeHref={activeHref} />

      {children}

      <footer className={styles.footer}>
        <div>
          <div className={`${styles.footerBrand} ${serif.className}`}>Barak<span>Fi</span></div>
          <div className={styles.footerSub}>Shariah-compliant stock research for Indian equities. Educational only. Not a religious ruling or financial advice.</div>
        </div>
        <div className={styles.footerCols}>
          <div>
            <div className={styles.footerHead}>Product</div>
            <Link href="/screener">Screener</Link>
            <Link href="/watchlist">Watchlist</Link>
            <Link href="/trending">Trending</Link>
          </div>
          <div>
            <div className={styles.footerHead}>Learn</div>
            <Link href="/methodology">Methodology</Link>
          </div>
          <div>
            <div className={styles.footerHead}>Legal</div>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/disclaimer">Disclaimer</Link>
          </div>
        </div>
      </footer>
      <div className={styles.footerBottom}>
        <span>© 2025 BarakFi · Educational screening · Not a religious ruling or financial advice</span>
        <span>Made in India</span>
      </div>
    </div>
  );
}

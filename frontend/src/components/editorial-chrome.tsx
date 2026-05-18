import Link from "next/link";
import { DM_Serif_Display } from "next/font/google";
import { GlobalMarketTicker } from "@/components/global-market-ticker";
import { LocalMarketingNav } from "@/components/local-marketing-nav";
import styles from "./editorial-chrome.module.css";

const serif = DM_Serif_Display({ subsets: ["latin"], weight: "400" });

export function EditorialChrome({
  activeHref,
  children,
}: {
  activeHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <GlobalMarketTicker />

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

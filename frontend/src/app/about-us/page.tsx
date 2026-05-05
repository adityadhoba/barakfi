import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "About Us — Barakfi",
  description:
    "Learn how BarakFi screens Indian stocks for Shariah compliance with transparent methodology, live market context, and evidence-first verdicts.",
  alternates: { canonical: "/about-us" },
  robots: { index: true, follow: true },
};

export default async function AboutUsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.ticker}>
        <div className={styles.tTrack}>
          {[
            ["NIFTY 50", "23,842", "+0.54%", true],
            ["SENSEX", "78,553", "+0.54%", true],
            ["NIFTY BANK", "51,236", "−0.17%", false],
            ["NIFTY IT", "33,156", "+0.75%", true],
            ["NIFTY PHARMA", "19,872", "+0.28%", true],
            ["INDIA VIX", "13.42", "−2.75%", false],
            ["NIFTY AUTO", "23,145", "−0.48%", false],
            ["NIFTY FMCG", "56,234", "+0.32%", true],
          ]
            .concat([
              ["NIFTY 50", "23,842", "+0.54%", true],
              ["SENSEX", "78,553", "+0.54%", true],
              ["NIFTY BANK", "51,236", "−0.17%", false],
              ["NIFTY IT", "33,156", "+0.75%", true],
              ["NIFTY PHARMA", "19,872", "+0.28%", true],
              ["INDIA VIX", "13.42", "−2.75%", false],
              ["NIFTY AUTO", "23,145", "−0.48%", false],
              ["NIFTY FMCG", "56,234", "+0.32%", true],
            ])
            .map((item, idx) => (
              <span key={`${item[0]}-${idx}`} className={styles.ti}>
                <b>{item[0]}</b> {item[1]}{" "}
                <span className={item[3] ? styles.g : styles.r}>{item[2]}</span>
              </span>
            ))}
        </div>
      </section>

      <nav className={styles.nav}>
        <Link className={styles.logo} href="/">Barak<span>Fi</span></Link>
        <div className={styles.nl}>
          <Link href="/screener">Screener</Link>
          <Link href="/watchlist">Watchlist</Link>
          <Link href="/methodology">Methodology</Link>
          <Link href="/screener" className={styles.nlCta}>Open Screener</Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroL}>
          <div className={styles.eyebrow}>NSE &amp; BSE · 527 Stocks · AAOIFI Methodology</div>
          <h1 className={styles.h1}>Know<br />every<br /><span>stock.</span></h1>
          <p className={styles.heroCaption}>
            BarakFi screens <strong>527 NSE &amp; BSE stocks</strong> for Shariah compliance — giving you
            <strong> Compliant, Requires Review, or Not Compliant</strong> verdicts with full ratio context.
            Educational only. Free always.
          </p>
          <div className={styles.heroActions}>
            <Link href="/screener" className={styles.btnSolid}>Open Screener</Link>
            <Link href="/methodology" className={styles.btnTxt}>Read our methodology</Link>
          </div>
        </div>
        <div className={styles.heroR}>
          <div className={styles.heroRTop}>
            <div className={styles.statBig}>527</div>
            <div className={styles.statBigLabel}>Stocks screened across NSE &amp; BSE</div>
          </div>
          <div className={styles.statsRow}>
            <div className={styles.statCell}>
              <div className={styles.statCellN}>3 Verdicts</div>
              <div className={styles.statCellL}>Compliant · Review · Not Compliant</div>
            </div>
            <div className={styles.statCell}>
              <div className={styles.statCellN}>AAOIFI</div>
              <div className={styles.statCellL}>Aligned methodology</div>
            </div>
            <div className={styles.statCell}>
              <div className={styles.statCellN}>Free</div>
              <div className={styles.statCellL}>Always · No login needed</div>
            </div>
            <div className={styles.statCell}>
              <div className={styles.statCellN}>29 Sectors</div>
              <div className={styles.statCellL}>Filter by sector &amp; cap</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.mq}>
        <div className={styles.mqInner}>
          {[
            "Shariah Screener",
            "Debt Ratio Analysis",
            "Interest Income %",
            "Sector Filters",
            "Market Cap Filter",
            "Compliant Watchlist",
            "Zakat Calculator",
            "Purification Calculator",
            "NIFTY 50 · NIFTY 500",
            "AAOIFI Methodology",
          ]
            .concat([
              "Shariah Screener",
              "Debt Ratio Analysis",
              "Interest Income %",
              "Sector Filters",
              "Market Cap Filter",
              "Compliant Watchlist",
              "Zakat Calculator",
              "Purification Calculator",
              "NIFTY 50 · NIFTY 500",
              "AAOIFI Methodology",
            ])
            .map((item, idx) => (
              <span key={`${item}-${idx}`} className={styles.mqI}>
                {item}
                <span>◆</span>
              </span>
            ))}
        </div>
      </section>

      <section className={styles.statement}>
        <div className={styles.stL}>
          The market has 5,000+ stocks.<br />
          Most of them, you <span>shouldn&apos;t</span> touch.
        </div>
        <div className={styles.stR}>
          <strong>Interest-bearing businesses. Excessive leverage. Non-compliant revenue streams.</strong>
          {" "}We run every listed company through a rigorous Shariah compliance framework — so what reaches
          your watchlist is already clean.
          <br /><br />
          No ambiguity. No guesswork. <strong>One clear verdict per stock.</strong>
        </div>
      </section>

      <section className={styles.pillars}>
        <div className={styles.pillar}>
          <div className={styles.pNum}>01</div>
          <div className={styles.pTitle}>Shariah<br />Stock Screener</div>
          <div className={styles.pBody}>
            527 NSE &amp; BSE stocks screened against <strong>AAOIFI-aligned criteria</strong> — debt ratio,
            interest income %, and non-compliant revenue segments. Filter by sector, market cap, and stock
            universe (NIFTY 50, 100, 500). <strong>Updated quarterly.</strong>
          </div>
        </div>
        <div className={styles.pillar}>
          <div className={styles.pNum}>02</div>
          <div className={styles.pTitle}>Compliant<br />Watchlist</div>
          <div className={styles.pBody}>
            Save stocks to a personal watchlist and track their <strong>compliance status over time.</strong>
            Get notified when a stock moves from Compliant to Requires Review — so your list stays accurate.
          </div>
        </div>
        <div className={styles.pillar}>
          <div className={styles.pNum}>03</div>
          <div className={styles.pTitle}>Tools &amp;<br />Calculators</div>
          <div className={styles.pBody}>
            Purpose-built tools including a <strong>Zakat calculator</strong> and <strong>purification calculator</strong>
            {" "}for non-compliant income — plus full methodology transparency so you understand every verdict.
          </div>
        </div>
      </section>

      <section className={styles.tableSec}>
        <div className={styles.tsCopy}>
          <h2>One verdict.<br />No <span>ambiguity.</span></h2>
          <p>
            Every stock gets one of three verdicts — <strong>Shariah Compliant, Requires Review, or Not Compliant</strong>
            {" "}— with full ratio context and transparent AAOIFI-aligned methodology.
          </p>
          <Link href="/screener" className={styles.btnSolid}>Open Screener</Link>
          <p className={styles.meta}>Educational only · Not a religious ruling or financial advice</p>
        </div>
        <div>
          <table className={styles.stkTable}>
            <thead>
              <tr>
                <th>Stock</th>
                <th>Sector</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><div className={styles.tk}>TCS</div><div className={styles.co}>Tata Consultancy Services</div></td>
                <td className={styles.rightMuted}>IT</td>
                <td>₹3,540</td>
                <td><span className={`${styles.badge} ${styles.h}`}>Compliant</span></td>
              </tr>
              <tr>
                <td><div className={styles.tk}>INFY</div><div className={styles.co}>Infosys Ltd</div></td>
                <td className={styles.rightMuted}>IT</td>
                <td>₹1,842</td>
                <td><span className={`${styles.badge} ${styles.h}`}>Compliant</span></td>
              </tr>
              <tr>
                <td><div className={styles.tk}>CGPOWER</div><div className={styles.co}>CG Power &amp; Industrial Solutions</div></td>
                <td className={styles.rightMuted}>Capital Goods</td>
                <td>₹802.3</td>
                <td><span className={`${styles.badge} ${styles.rv}`}>Requires Review</span></td>
              </tr>
              <tr>
                <td><div className={styles.tk}>LLOYDSME</div><div className={styles.co}>Lloyds Metals &amp; Energy</div></td>
                <td className={styles.rightMuted}>Metals</td>
                <td>₹1,797.5</td>
                <td><span className={`${styles.badge} ${styles.n}`}>Not Compliant</span></td>
              </tr>
              <tr>
                <td><div className={styles.tk}>MAZDOCK</div><div className={styles.co}>Mazagoan Dock Shipbuilders</div></td>
                <td className={styles.rightMuted}>Capital Goods</td>
                <td>₹2,611.6</td>
                <td><span className={`${styles.badge} ${styles.rv}`}>Requires Review</span></td>
              </tr>
              <tr>
                <td><div className={styles.tk}>HDFCBANK</div><div className={styles.co}>HDFC Bank Ltd</div></td>
                <td className={styles.rightMuted}>Financial</td>
                <td>₹1,620</td>
                <td><span className={`${styles.badge} ${styles.n}`}>Not Compliant</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.closing}>
        <div className={styles.clL}>
          <h2>Know<br /><span>more.</span><br />Always.</h2>
        </div>
        <div className={styles.clR}>
          <p>
            Shariah-compliant stock research for Indian equities shouldn&apos;t be complicated.
            <strong> BarakFi gives you clear verdicts</strong> — with full ratio context and transparent methodology.
            Free, always.
          </p>
          <Link href="/screener" className={styles.btnSolid}>Open Screener</Link>
          <p className={styles.meta}>Educational only · Not a religious ruling · Not financial advice</p>
        </div>
      </section>

      <footer className={styles.footer}>
        <div>
          <div className={styles.fBrand}>Barak<span>Fi</span></div>
          <div className={styles.fSub}>Shariah-compliant stock research for Indian markets. Built with care.</div>
        </div>
        <div className={styles.fCols}>
          <div className={styles.fCol}>
            <div className={styles.fColH}>Product</div>
            <Link href="/screener">Screener</Link>
            <Link href="/watchlist">Watchlist</Link>
            <Link href="/compare">Compare</Link>
          </div>
          <div className={styles.fCol}>
            <div className={styles.fColH}>Learn</div>
            <Link href="/methodology">Methodology</Link>
            <Link href="/about-us">About</Link>
          </div>
          <div className={styles.fCol}>
            <div className={styles.fColH}>Legal</div>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/disclaimer">Disclaimer</Link>
          </div>
        </div>
      </footer>
      <div className={styles.fBottom}>
        <span>© 2025 BarakFi · v2026.04.2 · Educational screening · Not a religious ruling or financial advice</span>
        <span>Made in India</span>
      </div>
    </main>
  );
}

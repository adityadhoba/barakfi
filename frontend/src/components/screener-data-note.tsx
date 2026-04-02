import styles from "@/app/screener.module.css";

/**
 * Plain-language context: how Indian fintech apps get NSE/BSE data vs broker login.
 */
export function ScreenerDataNote() {
  return (
    <details className={styles.dataNote}>
      <summary className={styles.dataNoteSummary}>
        How market data &amp; broker login work (India)
      </summary>
      <div className={styles.dataNoteBody}>
        <p>
          Apps like <strong>Tickertape</strong> don&apos;t run their own &quot;broker&quot; for prices. They license
          market and fundamental data from <strong>NSE/BSE-approved data vendors</strong>. What you see may be
          <strong> live</strong>, <strong>delayed</strong> (often 15 minutes on free tiers), or <strong>end-of-day</strong>,
          depending on the vendor contract—not on which broker you use.
        </p>
        <p>
          <strong>Zerodha, Groww, etc.</strong> let you <strong>log in with your broker</strong> so a third-party app can
          read <em>your</em> holdings or place orders via APIs like <strong>Zerodha Kite Connect</strong>. That is separate
          from a public stock screener: it needs user consent, app registration with the broker, and compliance work.
        </p>
        <p>
          <strong>Barakfi</strong> screens stocks using data served by our backend APIs. Prices and ratios are for
          research and compliance screening—not a substitute for your broker&apos;s live quotes or order execution.
        </p>
        <p>
          <strong>Future:</strong> optional <strong>Zerodha / Groww–style &quot;Connect broker&quot;</strong> login (e.g. Kite Connect)
          could let you sync holdings into this app. That requires broker partnerships, user consent, and compliance work—it
          is separate from the screener data feed above.
        </p>
      </div>
    </details>
  );
}

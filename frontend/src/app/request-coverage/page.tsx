import type { Metadata } from "next";
import Link from "next/link";
import styles from "./request.module.css";

export const metadata: Metadata = {
  title: "Request Stock Coverage — Get Any Stock Screened",
  description: "Can't find a stock on Barakfi? Request us to add and screen it for Shariah compliance. We'll notify you when it's available.",
  alternates: { canonical: "https://barakfi.in/request-coverage" },
};

export default function RequestCoveragePage() {
  return (
    <main className="shellPage">
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Request Coverage</span>
        </nav>
        <header className={styles.header}>
          <span className={styles.kicker}>Expand Our Universe</span>
          <h1 className={styles.title}>Request Stock Coverage</h1>
          <p className={styles.subtitle}>
            Can&apos;t find a stock? Let us know and we&apos;ll add it to our screening universe.
          </p>
        </header>

        <div className={styles.info}>
          <h2 className={styles.infoTitle}>How it works</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <span className={styles.stepNum}>1</span>
              <div>
                <h3 className={styles.stepTitle}>Sign in</h3>
                <p className={styles.stepDesc}>Log in to your Barakfi account to submit a request.</p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNum}>2</span>
              <div>
                <h3 className={styles.stepTitle}>Submit</h3>
                <p className={styles.stepDesc}>Enter the stock symbol and exchange (NSE, US, or LSE).</p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNum}>3</span>
              <div>
                <h3 className={styles.stepTitle}>We Screen</h3>
                <p className={styles.stepDesc}>We fetch financial data and run Shariah screening within 48 hours.</p>
              </div>
            </div>
          </div>

          <div className={styles.cta}>
            <Link href="/sign-in?redirect_url=/request-coverage" className={styles.ctaButton}>
              Sign in to request →
            </Link>
          </div>

          <p className={styles.note}>
            Currently screening 160+ NSE stocks, 100+ US stocks, and 30+ LSE stocks.
            We add new stocks every week.
          </p>
        </div>
      </div>
    </main>
  );
}

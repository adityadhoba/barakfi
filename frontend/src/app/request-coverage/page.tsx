import type { Metadata } from "next";
import Link from "next/link";
import styles from "./request.module.css";
import { RequestCoverageForm } from "./request-coverage-form";

export const metadata: Metadata = {
  title: "Request Stock Coverage — Get Any Stock Screened",
  description:
    "Can't find a stock on Barakfi? Request us to add and screen it for Shariah compliance. We'll notify you when it's available.",
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
                <p className={styles.stepDesc}>Enter the stock symbol and exchange (NSE, BSE, US, or LSE).</p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNum}>3</span>
              <div>
                <h3 className={styles.stepTitle}>We screen</h3>
                <p className={styles.stepDesc}>
                  We fetch public financial data and run Shariah screening on a best-effort basis.
                </p>
              </div>
            </div>
          </div>

          <RequestCoverageForm />

          <p className={styles.note}>
            We maintain a growing universe of NSE and BSE-listed Indian stocks and add new names regularly.
          </p>
        </div>
      </div>
    </main>
  );
}

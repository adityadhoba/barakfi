"use client";

import styles from "@/app/page.module.css";
import Link from "next/link";

export default function ScreenerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="shellPage">
      <section className={styles.onboardingState}>
        <div className={styles.onboardingCard}>
          <p className={styles.kicker}>Screener error</p>
          <h2>Something went wrong loading the screener</h2>
          <p className={styles.heroText}>
            {error.message || "An unexpected error occurred while screening stocks."}
          </p>
          <div className={styles.ctaRow}>
            <button className={styles.primaryCta} onClick={reset} type="button">
              Try again
            </button>
            <Link className={styles.secondaryCta} href="/workspace">
              Back to workspace
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

import styles from "@/app/page.module.css";
import Link from "next/link";

export default function WatchlistError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="shellPage">
      <section className={styles.onboardingState}>
        <div className={styles.onboardingCard}>
          <p className={styles.kicker}>Something went wrong</p>
          <h2>Could not load your watchlist</h2>
          <p className={styles.heroText}>
            An unexpected error occurred. Please try again.
          </p>
          <div className={styles.ctaRow}>
            <button className={styles.primaryCta} onClick={reset} type="button">
              Try again
            </button>
            <Link className={styles.secondaryCta} href="/screener">
              Go to Screener
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

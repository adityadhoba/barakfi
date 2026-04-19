"use client";

import styles from "@/app/page.module.css";
import Link from "next/link";

export default function GovernanceError({ error, reset }: { error: Error; reset: () => void }) {
  void error;
  return (
    <main className="shellPage">
      <section className={styles.onboardingState}>
        <div className={styles.onboardingCard}>
          <p className={styles.kicker}>Something went wrong</p>
          <h2>Could not load governance console</h2>
          <p className={styles.heroText}>
            An unexpected error occurred. Please try again or go back to the workspace.
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

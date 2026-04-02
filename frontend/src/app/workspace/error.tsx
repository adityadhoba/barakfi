"use client";

import styles from "@/app/page.module.css";
import Link from "next/link";

export default function WorkspaceError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="shellPage">
      <section className={styles.onboardingState}>
        <div className={styles.onboardingCard}>
          <p className={styles.kicker}>Something went wrong</p>
          <h2>Could not load your workspace</h2>
          <p className={styles.heroText}>
            An unexpected error occurred while loading the workspace. This is usually temporary.
          </p>
          <div className={styles.ctaRow}>
            <button className={styles.primaryCta} onClick={reset} type="button">
              Try again
            </button>
            <Link className={styles.secondaryCta} href="/">
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import styles from "./home-dashboard.module.css";

/**
 * Hero title + CTAs depend on sign-in; client-only to avoid server auth() without middleware context.
 */
export function HomeHeroAuth() {
  const { isLoaded, userId } = useAuth();
  const signedIn = isLoaded && Boolean(userId);

  return (
    <>
      <h1 className={styles.heroTitle}>
        {signedIn ? (
          <>As-salamu alaykum.</>
        ) : (
          <>
            Invest with <span className={styles.heroGradient}>clarity</span> and{" "}
            <span className={styles.heroGradient}>conviction</span>.
          </>
        )}
      </h1>
      <p className={styles.heroSub}>
        Screen Indian stocks using S&amp;P, AAOIFI &amp; FTSE Shariah standards. Multi-methodology compliance, real-time
        data, zero cost.
      </p>
      <div className={styles.heroCtas}>
        <Link href="/screener" className={styles.heroCtaPrimary}>
          Open Screener
          <span className={styles.heroCtaArrow}>&rarr;</span>
        </Link>
        {!signedIn && (
          <Link href="/sign-up" className={styles.heroCtaSecondary}>
            Create free account
          </Link>
        )}
        {signedIn && (
          <Link href="/watchlist" className={styles.heroCtaSecondary}>
            My Watchlist
          </Link>
        )}
      </div>
    </>
  );
}

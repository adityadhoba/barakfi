"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "@/app/stock-page-html.module.css";

export function StockDetailError({ message, symbol }: { message: string; symbol?: string }) {
  const router = useRouter();

  return (
    <section className={styles.stockFallbackWrap}>
      <div className={styles.stockFallbackCard}>
        <div className={styles.stockFallbackEyebrow}>Stock detail unavailable</div>
        <h1 className={styles.stockFallbackTitle}>We couldn't load this stock right now.</h1>
        <p className={styles.stockFallbackBody}>{message}</p>
        {symbol ? <div className={styles.stockFallbackSymbol}>{symbol}</div> : null}
        <div className={styles.stockFallbackActions}>
          <button type="button" className={styles.actionSolidButton} onClick={() => router.refresh()}>
            Try again
          </button>
          <Link href="/screener" className={styles.actionGhostButton}>
            Open Screener
          </Link>
          <Link href="/" className={styles.actionGhostButton}>
            Go home
          </Link>
        </div>
      </div>
    </section>
  );
}

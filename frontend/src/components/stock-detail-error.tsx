"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "@/app/stock-page-html.module.css";

export function StockDetailError({
  message,
  symbol,
  eyebrow = "Stock detail unavailable",
  title = "We couldn\'t load this stock right now.",
  primaryHref,
  primaryLabel,
}: {
  message: string;
  symbol?: string;
  eyebrow?: string;
  title?: string;
  primaryHref?: string;
  primaryLabel?: string;
}) {
  const router = useRouter();

  return (
    <section className={styles.stockFallbackWrap}>
      <div className={styles.stockFallbackCard}>
        <div className={styles.stockFallbackEyebrow}>{eyebrow}</div>
        <h1 className={styles.stockFallbackTitle}>{title}</h1>
        <p className={styles.stockFallbackBody}>{message}</p>
        {symbol ? <div className={styles.stockFallbackSymbol}>{symbol}</div> : null}
        <div className={styles.stockFallbackActions}>
          <button type="button" className={styles.actionSolidButton} onClick={() => router.refresh()}>
            Try again
          </button>
          {primaryHref && primaryLabel ? (
            <Link href={primaryHref} className={styles.actionGhostButton}>
              {primaryLabel}
            </Link>
          ) : null}
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

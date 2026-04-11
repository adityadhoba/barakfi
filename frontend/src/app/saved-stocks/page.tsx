"use client";

import Link from "next/link";
import { useState } from "react";
import { getLocalWatchlist, removeLocalWatchlist, type LocalWatchlistEntry } from "@/lib/local-watchlist";
import styles from "./saved-stocks.module.css";

function badgeClass(status: string | undefined): string {
  if (status === "Halal") return styles.badgeHalal;
  if (status === "Haram") return styles.badgeHaram;
  return styles.badgeDoubt;
}

export default function SavedStocksPage() {
  const [items, setItems] = useState<LocalWatchlistEntry[]>(() => getLocalWatchlist());

  return (
    <main className="shellPage">
      <div className={styles.page}>
        <h1 className={styles.title}>Watchlist</h1>
        <p className={styles.sub}>
          Saved on this device only — no account. Your list stays in the browser&apos;s localStorage.
        </p>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <p>No stocks saved yet.</p>
            <Link href="/" className={styles.link}>
              Check a stock →
            </Link>
          </div>
        ) : (
          <ul className={styles.list}>
            {items.map((e) => {
              const displayName = e.name ?? e.symbol;
              const hasStatus = Boolean(e.status);
              return (
                <li key={e.symbol} className={styles.row}>
                  <Link href={`/check/${encodeURIComponent(e.symbol)}`} className={styles.mainLink}>
                    <span className={styles.name}>{displayName}</span>
                    <span className={styles.symbol}>{e.symbol}</span>
                  </Link>
                  <div className={styles.meta}>
                    <span className={styles.score} aria-label="Compliance score">
                      {typeof e.score === "number" ? e.score : "—"}
                      {typeof e.score === "number" ? <span className={styles.scoreSuffix}>/100</span> : null}
                    </span>
                    {hasStatus ? (
                      <span className={`${styles.badge} ${badgeClass(e.status)}`}>{e.status}</span>
                    ) : (
                      <span className={styles.badgeMuted}>—</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => {
                      removeLocalWatchlist(e.symbol);
                      setItems(getLocalWatchlist());
                    }}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

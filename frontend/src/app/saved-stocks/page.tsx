"use client";

import Link from "next/link";
import { useState } from "react";
import { getLocalWatchlist, removeLocalWatchlist, type LocalWatchlistEntry } from "@/lib/local-watchlist";
import styles from "./saved-stocks.module.css";

export default function SavedStocksPage() {
  const [items, setItems] = useState<LocalWatchlistEntry[]>(() => getLocalWatchlist());

  return (
    <main className="shellPage">
      <div className={styles.page}>
        <h1 className={styles.title}>Saved stocks</h1>
        <p className={styles.sub}>Quick list stored on this device — sign in and use the watchlist for sync across devices.</p>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <p>No saved stocks yet.</p>
            <Link href="/" className={styles.link}>
              Check a stock →
            </Link>
          </div>
        ) : (
          <ul className={styles.list}>
            {items.map((e) => (
              <li key={e.symbol} className={styles.row}>
                <Link href={`/check/${encodeURIComponent(e.symbol)}`} className={styles.sym}>
                  {e.symbol}
                </Link>
                <div className={styles.actions}>
                  <Link href={`/stocks/${encodeURIComponent(e.symbol)}`} className={styles.secondary}>
                    Details
                  </Link>
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

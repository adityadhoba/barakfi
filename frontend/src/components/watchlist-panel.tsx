"use client";

import styles from "@/app/page.module.css";
import type { WatchlistEntry } from "@/lib/api";
import { WatchlistActionButton } from "@/components/watchlist-action-button";
import Link from "next/link";

type Props = {
  entries: WatchlistEntry[];
};

export function WatchlistPanel({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="emptyStateBlock">
        <div className="emptyStateIcon" aria-hidden="true">&#x2606;</div>
        <p className="emptyStateTitle">Your watchlist is empty</p>
        <p className="emptyStateDesc">Add stocks from the screener to track them here and stay on top of compliance changes.</p>
        <Link className="emptyStateCta" href="/screener">Browse stocks &rarr;</Link>
      </div>
    );
  }

  return (
    <div className={styles.simpleList}>
      {entries.map((entry) => (
        <div className={styles.watchlistCard} key={entry.id}>
          <div className={styles.watchlistHeader}>
            <div>
              <strong>
                <Link className={styles.inlineLink} href={`/stocks/${encodeURIComponent(entry.stock.symbol)}`}>
                  {entry.stock.symbol}
                </Link>
              </strong>
              <span>{entry.stock.name}</span>
            </div>
            <WatchlistActionButton
              symbol={entry.stock.symbol}
              initialInWatchlist
              addLabel="Add"
              removeLabel="Remove"
            />
          </div>
          {entry.notes && (
            <p className={styles.savedScreenerNotes}>{entry.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}

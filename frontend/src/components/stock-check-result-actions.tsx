"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { addLocalWatchlist } from "@/lib/local-watchlist";
import styles from "./stock-check-result-actions.module.css";

type WatchlistSnapshot = { name: string; score: number; status: string };

type Props = {
  symbol: string;
  /** Only the save button (used when another control handles “full analysis”). */
  variant?: "default" | "watchlistOnly";
  /** Snapshot at save time (name, score, status). */
  watchlistSnapshot?: WatchlistSnapshot;
};

export function StockCheckResultActions({ symbol, variant = "default", watchlistSnapshot }: Props) {
  const { toast } = useToast();
  const router = useRouter();

  return (
    <div className={`${styles.row} ${variant === "watchlistOnly" ? styles.rowStack : ""}`}>
      <button
        type="button"
        className={`${styles.primary} ${variant === "watchlistOnly" ? styles.primaryFull : ""}`}
        onClick={() => {
          if (!watchlistSnapshot) {
            toast("Open a stock check to save with score and status", "error");
            return;
          }
          if (
            addLocalWatchlist({
              symbol,
              name: watchlistSnapshot.name,
              score: watchlistSnapshot.score,
              status: watchlistSnapshot.status,
            })
          ) {
            toast("Added to Watchlist", "success");
            router.push("/saved-stocks");
          } else {
            toast("Could not save — try again", "error");
          }
        }}
      >
        Save to Watchlist
      </button>
      {variant === "default" ? (
        <Link href={`/stocks/${encodeURIComponent(symbol)}`} className={styles.secondary}>
          Full analysis &amp; chart
        </Link>
      ) : null}
    </div>
  );
}

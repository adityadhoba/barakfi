"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { addLocalWatchlist } from "@/lib/local-watchlist";
import styles from "./stock-check-result-actions.module.css";

type Props = {
  symbol: string;
  /** Only the save button (used when another control handles “full analysis”). */
  variant?: "default" | "watchlistOnly";
};

export function StockCheckResultActions({ symbol, variant = "default" }: Props) {
  const { toast } = useToast();
  const router = useRouter();

  return (
    <div className={`${styles.row} ${variant === "watchlistOnly" ? styles.rowStack : ""}`}>
      <button
        type="button"
        className={`${styles.primary} ${variant === "watchlistOnly" ? styles.primaryFull : ""}`}
        onClick={() => {
          if (addLocalWatchlist(symbol)) {
            toast(`Saved ${symbol} to your list`, "success");
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

"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { addLocalWatchlist, isInLocalWatchlist } from "@/lib/local-watchlist";
import styles from "./stock-check-result-actions.module.css";

type Props = {
  symbol: string;
  name: string;
  score: number;
  status: string;
  onViewDetails: () => void;
};

export function StockCheckResultActions({ symbol, name, score, status, onViewDetails }: Props) {
  const { toast } = useToast();
  const router = useRouter();

  return (
    <div className={styles.row}>
      <button type="button" className={styles.secondary} onClick={onViewDetails}>
        View Details
      </button>
      <button
        type="button"
        className={styles.primary}
        onClick={() => {
          const wasSaved = isInLocalWatchlist(symbol);
          if (
            addLocalWatchlist({
              symbol,
              name,
              score,
              status,
            })
          ) {
            toast(wasSaved ? "Watchlist updated" : "Added to Watchlist", "success");
            router.push("/saved-stocks");
          } else {
            toast("Could not save — try again", "error");
          }
        }}
      >
        Save to Watchlist
      </button>
    </div>
  );
}

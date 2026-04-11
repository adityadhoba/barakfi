"use client";

import { useToast } from "@/components/toast";
import { addLocalWatchlist } from "@/lib/local-watchlist";
import styles from "./stock-check-result-actions.module.css";

type Props = {
  symbol: string;
  name: string;
  score: number;
  status: string;
  detailsOpen: boolean;
  onToggleDetails: () => void;
};

export function StockCheckResultActions({
  symbol,
  name,
  score,
  status,
  detailsOpen,
  onToggleDetails,
}: Props) {
  const { toast } = useToast();

  return (
    <div className={styles.row}>
      <button type="button" className={styles.secondary} onClick={onToggleDetails}>
        {detailsOpen ? "Hide full details" : "View full details"}
      </button>
      <button
        type="button"
        className={styles.primary}
        onClick={() => {
          if (
            addLocalWatchlist({
              symbol,
              name,
              score,
              status,
            })
          ) {
            toast(`Saved ${symbol}`, "success");
          } else {
            toast("Could not save — try again", "error");
          }
        }}
      >
        Save
      </button>
    </div>
  );
}

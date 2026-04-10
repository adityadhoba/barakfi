"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { addLocalWatchlist } from "@/lib/local-watchlist";
import styles from "./stock-check-result-actions.module.css";

type Props = {
  symbol: string;
};

export function StockCheckResultActions({ symbol }: Props) {
  const { toast } = useToast();
  const router = useRouter();

  return (
    <div className={styles.row}>
      <button
        type="button"
        className={styles.primary}
        onClick={() => {
          if (addLocalWatchlist(symbol)) {
            toast(`Saved ${symbol} to your list`, "success");
            router.push("/saved-stocks");
          } else {
            toast("Could not save — try again", "error");
          }
        }}
      >
        Save to list
      </button>
      <Link href={`/stocks/${encodeURIComponent(symbol)}`} className={styles.secondary}>
        Full analysis &amp; chart
      </Link>
    </div>
  );
}

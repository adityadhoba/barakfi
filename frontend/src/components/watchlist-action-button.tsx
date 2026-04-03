"use client";

import styles from "@/app/page.module.css";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

type Props = {
  symbol: string;
  initialInWatchlist: boolean;
  addLabel?: string;
  removeLabel?: string;
};

export function WatchlistActionButton({
  symbol,
  initialInWatchlist,
  addLabel = "Add to watchlist",
  removeLabel = "Remove from watchlist",
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [inWatchlist, setInWatchlist] = useState(initialInWatchlist);
  const [isSaving, setIsSaving] = useState(false);

  async function handleClick() {
    setIsSaving(true);

    try {
      const response = await fetch(
        inWatchlist ? `/api/watchlist/${encodeURIComponent(symbol)}` : "/api/watchlist",
        {
          method: inWatchlist ? "DELETE" : "POST",
          headers: inWatchlist ? undefined : { "Content-Type": "application/json" },
          body: inWatchlist
            ? undefined
            : JSON.stringify({ symbol, notes: "Added from stock research." }),
        },
      );

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        console.error("[Watchlist]", response.status, errBody);
        throw new Error(errBody?.detail || errBody?.error || "Watchlist update failed");
      }

      const nextValue = !inWatchlist;
      setInWatchlist(nextValue);
      toast(
        nextValue ? `${symbol} added to watchlist` : `${symbol} removed from watchlist`,
        nextValue ? "success" : "info",
      );
      startTransition(() => { router.refresh(); });
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Could not update watchlist right now.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.watchlistAction}>
      <button
        className={inWatchlist ? styles.secondaryCta : styles.primaryCta}
        disabled={isSaving}
        onClick={handleClick}
        type="button"
      >
        {isSaving ? "Updating..." : inWatchlist ? removeLabel : addLabel}
      </button>
    </div>
  );
}

"use client";

import { useCallback, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import styles from "@/app/stock-page-html.module.css";

type Props = {
  symbol: string;
  stockName: string;
  initialInWatchlist: boolean;
  shareUrl: string;
};

export function StockPageActionButtons({
  symbol,
  stockName,
  initialInWatchlist,
  shareUrl,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [inWatchlist, setInWatchlist] = useState(initialInWatchlist);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleWatchlist = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch(
        inWatchlist ? `/api/watchlist/${encodeURIComponent(symbol)}` : "/api/watchlist",
        {
          method: inWatchlist ? "DELETE" : "POST",
          headers: inWatchlist ? undefined : { "Content-Type": "application/json" },
          body: inWatchlist
            ? undefined
            : JSON.stringify({ symbol, notes: "Added from stock detail page." }),
        },
      );

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.detail || errBody?.error || "Watchlist update failed");
      }

      const next = !inWatchlist;
      setInWatchlist(next);
      toast(next ? `${symbol} added to watchlist` : `${symbol} removed from watchlist`, next ? "success" : "info");
      startTransition(() => router.refresh());
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not update watchlist right now.", "error");
    } finally {
      setIsSaving(false);
    }
  }, [inWatchlist, router, symbol, toast]);

  const handleShare = useCallback(async () => {
    const shareText = `${stockName} (${symbol}) on BarakFi`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareText, text: shareText, url: shareUrl });
        return;
      } catch {
        // fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast("Link copied to clipboard", "success");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("Could not copy link", "error");
    }
  }, [shareUrl, stockName, symbol, toast]);

  return (
    <div className={styles.actionButtons}>
      <button className={styles.actionGhostButton} type="button" onClick={handleWatchlist} disabled={isSaving}>
        {isSaving ? "Updating..." : inWatchlist ? "★ In Watchlist" : "☆ Add to Watchlist"}
      </button>
      <button className={styles.actionGhostButton} type="button" onClick={handleShare}>
        {copied ? "✓ Copied" : "↗ Share"}
      </button>
    </div>
  );
}

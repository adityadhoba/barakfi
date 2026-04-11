"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import styles from "./broker-oauth-banner.module.css";

/**
 * Shows success/error after Upstox OAuth redirect (?broker=upstox&status=...).
 */
export function BrokerOAuthBanner() {
  const searchParams = useSearchParams();
  const broker = searchParams.get("broker");
  const status = searchParams.get("status");
  const message = searchParams.get("message");
  const bannerKey = `${broker}|${status}|${message}`;

  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const dismissed = dismissedKey === bannerKey;

  if (dismissed || broker !== "upstox" || !status) {
    return null;
  }

  const ok = status === "connected";
  const decoded = message ? decodeURIComponent(message) : "";

  return (
    <div className={ok ? styles.bannerOk : styles.bannerErr} role="status">
      <p className={styles.text}>
        {ok
          ? "Upstox is connected. Holdings import will be available soon."
          : `Could not connect Upstox${decoded ? `: ${decoded}` : "."}`}
      </p>
      <button
        type="button"
        className={styles.dismiss}
        onClick={() => {
          setDismissedKey(bannerKey);
          if (typeof window !== "undefined") {
            window.history.replaceState({}, "", "/watchlist");
          }
        }}
      >
        Dismiss
      </button>
    </div>
  );
}

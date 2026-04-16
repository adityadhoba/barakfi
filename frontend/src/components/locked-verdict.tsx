"use client";

import { useScreening } from "@/contexts/screening-context";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./locked-verdict.module.css";

interface LockedVerdictProps {
  symbol: string;
  children: React.ReactNode;
  /** Compact mode for table cells / cards (no CTA text) */
  compact?: boolean;
}

export function LockedVerdict({ symbol, children, compact }: LockedVerdictProps) {
  const { hasAccess, isAdmin, unlockDetails } = useScreening();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (isAdmin || hasAccess(symbol)) {
    return <>{children}</>;
  }

  const handleUnlock = async () => {
    setLoading(true);
    const result = await unlockDetails(symbol);
    setLoading(false);

    if (result.kind === "granted") {
      router.push(`/stocks/${encodeURIComponent(symbol)}`);
      return;
    }
    if (result.kind === "redirect") {
      router.push(result.url);
      return;
    }
    if (result.kind === "limit_exhausted" && result.redirectUrl) {
      router.push(result.redirectUrl);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        className={styles.lockBtn}
        onClick={() => void handleUnlock()}
        title="See why this stock screened this way"
        disabled={loading}
      >
        <svg className={styles.lockIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </button>
    );
  }

  return (
    <button type="button" className={styles.lockCard} onClick={() => void handleUnlock()} disabled={loading}>
      <svg className={styles.lockIconLg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <span className={styles.lockText}>{loading ? "Opening..." : "See Why?"}</span>
    </button>
  );
}

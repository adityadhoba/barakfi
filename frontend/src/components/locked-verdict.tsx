"use client";

import { useScreening } from "@/contexts/screening-context";
import { useRouter } from "next/navigation";
import styles from "./locked-verdict.module.css";

interface LockedVerdictProps {
  symbol: string;
  children: React.ReactNode;
  /** Compact mode for table cells / cards (no CTA text) */
  compact?: boolean;
}

export function LockedVerdict({ symbol, children, compact }: LockedVerdictProps) {
  const { hasAccess, isAdmin } = useScreening();
  const router = useRouter();

  if (isAdmin || hasAccess(symbol)) {
    return <>{children}</>;
  }

  const handleScreen = () => {
    router.push(`/screening/${encodeURIComponent(symbol)}`);
  };

  if (compact) {
    return (
      <button className={styles.lockBtn} onClick={handleScreen} title="Screen to reveal">
        <svg className={styles.lockIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </button>
    );
  }

  return (
    <button className={styles.lockCard} onClick={handleScreen}>
      <svg className={styles.lockIconLg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <span className={styles.lockText}>Screen to reveal</span>
    </button>
  );
}

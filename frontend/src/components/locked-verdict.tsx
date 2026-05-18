"use client";

import { useScreening } from "@/contexts/screening-context";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { GuestLimitModal } from "./guest-limit-modal";
import { QuotaLimitModal } from "./quota-limit-modal";
import styles from "./locked-verdict.module.css";

interface LockedVerdictProps {
  symbol: string;
  children: React.ReactNode;
  /** Compact mode for table cells / cards (no CTA text) */
  compact?: boolean;
}

export function LockedVerdict({ symbol, children, compact }: LockedVerdictProps) {
  const { hasAccess, isAdmin, unlockDetails } = useScreening();
  const { userId } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaMessage, setQuotaMessage] = useState("");

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
    if (result.kind === "limit_exhausted") {
      if (!userId) {
        setShowGuestModal(true);
      } else {
        setQuotaMessage(result.message);
        setShowQuotaModal(true);
      }
    }
  };

  if (compact) {
    return (
      <>
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
        <GuestLimitModal isOpen={showGuestModal} onClose={() => setShowGuestModal(false)} />
        <QuotaLimitModal isOpen={showQuotaModal} onClose={() => setShowQuotaModal(false)} message={quotaMessage} />
      </>
    );
  }

  return (
    <>
      <button type="button" className={styles.lockCard} onClick={() => void handleUnlock()} disabled={loading}>
        <svg className={styles.lockIconLg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span className={styles.lockText}>{loading ? "Opening..." : "See Why?"}</span>
      </button>
      <GuestLimitModal isOpen={showGuestModal} onClose={() => setShowGuestModal(false)} />
      <QuotaLimitModal isOpen={showQuotaModal} onClose={() => setShowQuotaModal(false)} message={quotaMessage} />
    </>
  );
}

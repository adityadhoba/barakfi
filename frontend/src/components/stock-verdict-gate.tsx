"use client";

import { useScreening } from "@/contexts/screening-context";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./stock-verdict-gate.module.css";

interface Props {
  symbol: string;
  children: React.ReactNode;
  mode?: "card" | "inline" | "hidden";
}

export function StockVerdictGate({ symbol, children, mode = "card" }: Props) {
  const { hasAccess, isAdmin, guestUnlockedSymbol, unlockDetails } = useScreening();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAdmin || hasAccess(symbol)) {
    return <>{children}</>;
  }

  async function handleUnlock() {
    setLoading(true);
    setMessage(null);
    setRedirectUrl(null);
    const result = await unlockDetails(symbol);
    setLoading(false);

    if (result.kind === "granted") {
      return;
    }

    if (result.kind === "redirect") {
      router.push(result.url);
      return;
    }

    if (result.kind === "limit_exhausted") {
      setMessage(result.message);
      setRedirectUrl(result.redirectUrl ?? null);
      return;
    }

    setMessage(result.message);
  }

  if (mode === "hidden") {
    return null;
  }

  const ctaLabel =
    guestUnlockedSymbol && guestUnlockedSymbol !== symbol ? "Sign in to continue" : "See Why?";

  if (mode === "inline") {
    return (
      <span className={styles.inlineGateWrap}>
        <button
          type="button"
          className={styles.inlineGateCta}
          onClick={() => void handleUnlock()}
          disabled={loading}
        >
          {loading ? "Opening..." : ctaLabel}
        </button>
        {message ? <span className={styles.inlineGateMessage}>{message}</span> : null}
      </span>
    );
  }

  return (
    <div className={styles.gate}>
      <div className={styles.gateCard}>
        <svg className={styles.gateIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <h3 className={styles.gateTitle}>See why this stock screened this way</h3>
        <p className={styles.gateSub}>
          {guestUnlockedSymbol && guestUnlockedSymbol !== symbol
            ? "You’ve already opened one stock as a guest. Sign in to unlock more detailed breakdowns."
            : "Open the detailed compliance breakdown for this stock. Guests can view one stock before sign-in is required."}
        </p>
        <button
          type="button"
          className={styles.gateCta}
          onClick={() => void handleUnlock()}
          disabled={loading}
        >
          {loading ? "Opening..." : ctaLabel}
        </button>
        {message ? <p className={styles.gateNote}>{message}</p> : null}
        {redirectUrl ? (
          <button
            type="button"
            className={styles.gateSecondary}
            onClick={() => router.push(redirectUrl)}
          >
            Join Early Access
          </button>
        ) : null}
      </div>
    </div>
  );
}

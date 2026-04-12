"use client";

import { useScreening } from "@/contexts/screening-context";
import { useRouter } from "next/navigation";
import styles from "./stock-verdict-gate.module.css";

interface Props {
  symbol: string;
  children: React.ReactNode;
}

export function StockVerdictGate({ symbol, children }: Props) {
  const { hasAccess, isAdmin, remaining } = useScreening();
  const router = useRouter();

  if (isAdmin || hasAccess(symbol)) {
    return <>{children}</>;
  }

  return (
    <div className={styles.gate}>
      <div className={styles.gateCard}>
        <svg className={styles.gateIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <h3 className={styles.gateTitle}>Screen to see the verdict</h3>
        <p className={styles.gateSub}>
          Tap below to run the Shariah screening for this stock. You have{" "}
          <strong>{remaining}</strong> screen{remaining !== 1 ? "s" : ""} remaining today.
        </p>
        <button
          className={styles.gateCta}
          onClick={() => router.push(`/screening/${encodeURIComponent(symbol)}`)}
        >
          Screen {symbol}
        </button>
      </div>
    </div>
  );
}

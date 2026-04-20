"use client";

import { useEffect, useState } from "react";
import styles from "@/app/screener/screener-error.module.css";

export default function ScreenerError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [countdown, setCountdown] = useState(8);

  // Auto-retry — Render free tier cold-starts in ~5-8s
  useEffect(() => {
    if (countdown <= 0) {
      reset();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, reset]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.icon} aria-hidden>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <circle cx="22" cy="22" r="20" stroke="var(--emerald)" strokeWidth="2" opacity="0.25" />
            <circle
              cx="22" cy="22" r="20"
              stroke="var(--emerald)" strokeWidth="2.5"
              strokeDasharray="125.7"
              strokeDashoffset={125.7 * (1 - countdown / 8)}
              strokeLinecap="round"
              style={{
                transition: "stroke-dashoffset 1s linear",
                transformOrigin: "center",
                transform: "rotate(-90deg)",
              }}
            />
            <path d="M22 14v9.5M22 27.5v2" stroke="var(--emerald)" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>

        <p className={styles.kicker}>Loading data</p>
        <h2 className={styles.heading}>Screener is warming up</h2>
        <p className={styles.body}>
          Our data server is starting. This usually takes a few seconds.
          <br />
          Retrying automatically in <strong className={styles.countdown}>{countdown}s</strong>
        </p>

        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={reset} type="button">
            Retry now
          </button>
          <a className={styles.secondaryBtn} href="/">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

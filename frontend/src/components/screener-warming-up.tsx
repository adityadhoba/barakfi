"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import errorStyles from "@/app/screener/screener-error.module.css";

/**
 * Shown when the screener backend is cold or unreachable.
 * Uses router.refresh() so it works with ISR — no error throw needed.
 * ISR caches this component; when the backend recovers, the next
 * router.refresh() call fetches live RSC data and updates the view.
 */
export function ScreenerWarmingUp() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(8);

  const retry = useCallback(() => {
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (countdown <= 0) {
      retry();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, retry]);

  return (
    <div className={errorStyles.wrapper}>
      <div className={errorStyles.card}>
        <div className={errorStyles.icon} aria-hidden>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <circle cx="22" cy="22" r="20" stroke="var(--emerald)" strokeWidth="2" opacity="0.25" />
            <circle
              cx="22"
              cy="22"
              r="20"
              stroke="var(--emerald)"
              strokeWidth="2.5"
              strokeDasharray="125.7"
              strokeDashoffset={125.7 * (1 - countdown / 8)}
              strokeLinecap="round"
              style={{
                transition: "stroke-dashoffset 1s linear",
                transformOrigin: "center",
                transform: "rotate(-90deg)",
              }}
            />
            <path
              d="M22 14v9.5M22 27.5v2"
              stroke="var(--emerald)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <p className={errorStyles.kicker}>Loading data</p>
        <h2 className={errorStyles.heading}>Screener is warming up</h2>
        <p className={errorStyles.body}>
          Our data server is starting. This usually takes a few seconds.
          <br />
          Retrying automatically in{" "}
          <strong className={errorStyles.countdown}>{countdown}s</strong>
        </p>

        <div className={errorStyles.actions}>
          <button className={errorStyles.primaryBtn} onClick={retry} type="button">
            Retry now
          </button>
          <Link className={errorStyles.secondaryBtn} href="/">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

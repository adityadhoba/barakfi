"use client";

import styles from "@/app/screener.module.css";
import Link from "next/link";

export default function CompareError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className={styles.screenerPage}>
      <div className={styles.screenerContainer}>
        <div style={{ textAlign: "center", padding: "64px 24px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 16, opacity: 0.4 }}>⚠</div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 8, color: "var(--text)" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>
            We couldn&apos;t load the comparison. This may be a temporary issue.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: "none",
                background: "var(--emerald)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <Link
              href="/screener"
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--panel)",
                color: "var(--text)",
                fontWeight: 600,
                fontSize: "0.85rem",
                textDecoration: "none",
              }}
            >
              Back to Screener
            </Link>
          </div>
          {error.digest && (
            <p style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", marginTop: 16 }}>
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

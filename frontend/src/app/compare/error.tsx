"use client";

import Link from "next/link";
import { ErrorState } from "@/components/error-state";

export default function CompareError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px", padding: "24px" }}>
      <div style={{ textAlign: "center", maxWidth: "500px" }}>
        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>⚠️</div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 12px", color: "var(--text)" }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 24px" }}>
          We couldn't load the comparison. This may be a temporary issue.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={reset}
            style={{
              background: "var(--emerald)",
              color: "white",
              border: "none",
              padding: "10px 24px",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
          <Link href="/screener"
            style={{
              background: "transparent",
              color: "var(--emerald)",
              border: "1px solid var(--emerald)",
              padding: "10px 24px",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.9rem",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Back to Screener
          </Link>
        </div>
        {error.digest && <p style={{ fontSize: "0.875rem", color: "var(--text-tertiary)", marginTop: "20px" }}>Error ID: {error.digest}</p>}
      </div>
    </main>
  );
}

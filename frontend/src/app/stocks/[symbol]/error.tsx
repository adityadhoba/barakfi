"use client";

import Link from "next/link";

export default function StockDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ minHeight: "calc(100vh - 56px)", display: "grid", placeItems: "center", padding: 24 }}>
      <div
        style={{
          maxWidth: 480,
          padding: 36,
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-xl)",
          background: "var(--panel)",
          textAlign: "center",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "var(--radius-lg)",
            background: "var(--gold-bg)",
            border: "1px solid var(--gold-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.4rem",
            margin: "0 auto 16px",
          }}
        >
          !
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.3rem",
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: 8,
          }}
        >
          Unable to load stock data
        </h2>
        <p
          style={{
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
            lineHeight: 1.55,
            marginBottom: 20,
          }}
        >
          {error.message.includes("not found")
            ? "This stock could not be found. It may have been delisted or the symbol is incorrect."
            : "We ran into a problem fetching this stock\u2019s data. This is usually temporary."}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: "var(--emerald)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.86rem",
              cursor: "pointer",
              boxShadow: "var(--shadow-emerald)",
            }}
          >
            Try again
          </button>
          <Link
            href="/screener"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--line)",
              background: "var(--bg-soft)",
              color: "var(--text)",
              fontWeight: 600,
              fontSize: "0.86rem",
              textDecoration: "none",
            }}
          >
            Back to screener
          </Link>
        </div>
      </div>
    </main>
  );
}

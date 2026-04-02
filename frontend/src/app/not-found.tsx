import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shellPage">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 200px)",
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(4rem, 12vw, 7rem)",
            fontWeight: 800,
            letterSpacing: "-0.06em",
            background: "linear-gradient(135deg, var(--emerald) 0%, #34d399 50%, var(--text-muted) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1,
            marginBottom: 12,
          }}
          aria-hidden="true"
        >
          404
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.2rem, 3vw, 1.6rem)",
            fontWeight: 800,
            color: "var(--text)",
            letterSpacing: "-0.02em",
            margin: "0 0 10px",
          }}
        >
          Page not found
        </h1>
        <p
          style={{
            fontSize: "0.92rem",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            maxWidth: 420,
            margin: "0 auto 28px",
          }}
        >
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          Try searching for a stock or explore the screener.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link
            href="/screener"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "11px 24px",
              borderRadius: "var(--radius-md)",
              background: "var(--emerald)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.9rem",
              textDecoration: "none",
              boxShadow: "var(--shadow-emerald)",
              transition: "all 150ms ease",
            }}
          >
            Open Screener &rarr;
          </Link>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "11px 24px",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-soft)",
              color: "var(--text)",
              fontWeight: 600,
              fontSize: "0.9rem",
              textDecoration: "none",
              border: "1px solid var(--line)",
              transition: "all 150ms ease",
            }}
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}

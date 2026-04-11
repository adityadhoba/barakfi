"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function StockDetailError({ message }: { message: string }) {
  const router = useRouter();

  return (
    <main className="shellPage">
      <div style={{ maxWidth: 560, margin: "48px auto", padding: "0 24px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.2rem, 3vw, 1.5rem)",
            fontWeight: 800,
            marginBottom: 12,
          }}
        >
          Unable to load stock
        </h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.6 }}>
          {message}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <button type="button" className="emptyStateCta" onClick={() => router.refresh()}>
            Try again
          </button>
          <Link href="/screener" className="ghostButtonLink">
            Open Screener
          </Link>
          <Link href="/" className="ghostButtonLink">
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}

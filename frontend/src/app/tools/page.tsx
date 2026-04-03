import type { Metadata } from "next";
import Link from "next/link";
import { PurificationCalculator } from "@/components/purification-calculator";
import { ZakatCalculator } from "@/components/zakat-calculator";

export const metadata: Metadata = {
  title: "Islamic Finance Tools — Purification & Zakat Calculator | Barakfi",
  description:
    "Free purification calculator and zakat calculator for halal investors. Calculate how much to donate from dividends and zakat on your stock portfolio.",
  keywords: [
    "purification calculator",
    "zakat calculator",
    "Islamic finance calculator",
    "halal investment tools",
    "dividend purification",
    "zakat on stocks",
    "Islamic finance tools India",
  ],
};

export default function ToolsPage() {
  return (
    <main className="shellPage">
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 64px" }}>
        <nav style={{ marginBottom: 16 }}>
          <Link href="/" style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", textDecoration: "none" }}>
            &larr; Home
          </Link>
        </nav>

        <header style={{ marginBottom: 32, paddingBottom: 20, borderBottom: "1px solid var(--line)" }}>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.75rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "var(--text)",
            margin: "0 0 8px",
          }}>
            Islamic Finance Tools
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
            Free tools for halal investors. No login required.
          </p>
        </header>

        <div style={{ display: "grid", gap: 24 }}>
          <section id="purification">
            <PurificationCalculator />
          </section>
          <section id="zakat">
            <ZakatCalculator />
          </section>
        </div>

        <div style={{
          marginTop: 32,
          padding: "20px 24px",
          borderRadius: "var(--radius-xl)",
          background: "var(--emerald-bg)",
          border: "1px solid var(--emerald-border)",
          textAlign: "center",
        }}>
          <p style={{ fontSize: "0.88rem", color: "var(--text)", fontWeight: 600, margin: "0 0 8px" }}>
            Want to track your portfolio compliance automatically?
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 12px" }}>
            Create a free account to save your watchlist, track holdings, and get compliance alerts.
          </p>
          <Link
            href="/sign-up"
            style={{
              display: "inline-flex",
              padding: "10px 24px",
              borderRadius: "var(--radius-full)",
              background: "var(--emerald)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.85rem",
              textDecoration: "none",
            }}
          >
            Create free account &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}


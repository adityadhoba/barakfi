import type { Metadata } from "next";
import Link from "next/link";
import { PurificationCalculator } from "@/components/purification-calculator";

export const metadata: Metadata = {
  title: "Purification Calculator — Halal Dividend Purification | Barakfi",
  description:
    "Free purification calculator for halal investors. Calculate the non-permissible portion of your stock dividends and determine how much to donate for Shariah compliance.",
  keywords: [
    "purification calculator",
    "dividend purification",
    "halal dividend calculator",
    "Islamic finance purification",
    "haram income purification",
    "stock purification India",
    "Shariah purification tool",
  ],
  alternates: { canonical: "https://barakfi.in/tools/purification" },
};

export default function PurificationPage() {
  return (
    <main className="shellPage">
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 64px" }}>
        <nav style={{ marginBottom: 16, display: "flex", gap: 8, fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
          <Link href="/" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <Link href="/tools" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>Tools</Link>
          <span>/</span>
          <span style={{ color: "var(--text-secondary)" }}>Purification</span>
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
            Purification Calculator
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
            Calculate the non-permissible portion of your dividends and determine how much to donate. No login required.
          </p>
        </header>

        <PurificationCalculator />

        <div style={{
          marginTop: 32,
          padding: "20px 24px",
          borderRadius: "var(--radius-xl)",
          background: "var(--emerald-bg)",
          border: "1px solid var(--emerald-border)",
          textAlign: "center",
        }}>
          <p style={{ fontSize: "0.88rem", color: "var(--text)", fontWeight: 600, margin: "0 0 8px" }}>
            Also check out our Zakat Calculator
          </p>
          <Link
            href="/tools/zakat"
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
            Zakat Calculator &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}

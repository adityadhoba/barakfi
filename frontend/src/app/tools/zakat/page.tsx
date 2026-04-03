import type { Metadata } from "next";
import Link from "next/link";
import { ZakatCalculator } from "@/components/zakat-calculator";

export const metadata: Metadata = {
  title: "Zakat Calculator — Zakat on Stocks & Investments | Barakfi",
  description:
    "Free zakat calculator for stock investors. Calculate zakat on your equity portfolio, gold, savings, and other assets based on current Nisab values for India.",
  keywords: [
    "zakat calculator",
    "zakat on stocks",
    "zakat on investments",
    "Islamic zakat calculator India",
    "zakat on shares",
    "Nisab calculator",
    "zakat on gold India",
  ],
};

export default function ZakatPage() {
  return (
    <main className="shellPage">
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 64px" }}>
        <nav style={{ marginBottom: 16, display: "flex", gap: 8, fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
          <Link href="/" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <Link href="/tools" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>Tools</Link>
          <span>/</span>
          <span style={{ color: "var(--text-secondary)" }}>Zakat</span>
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
            Zakat Calculator
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
            Calculate zakat on your equity portfolio, savings, gold, and other assets. No login required.
          </p>
        </header>

        <ZakatCalculator />

        <div style={{
          marginTop: 32,
          padding: "20px 24px",
          borderRadius: "var(--radius-xl)",
          background: "var(--emerald-bg)",
          border: "1px solid var(--emerald-border)",
          textAlign: "center",
        }}>
          <p style={{ fontSize: "0.88rem", color: "var(--text)", fontWeight: 600, margin: "0 0 8px" }}>
            Also check out our Purification Calculator
          </p>
          <Link
            href="/tools/purification"
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
            Purification Calculator &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}

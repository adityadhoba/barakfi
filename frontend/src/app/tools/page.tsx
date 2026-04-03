import type { Metadata } from "next";
import Link from "next/link";

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

const tools = [
  {
    href: "/tools/purification",
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="var(--emerald)" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Purification Calculator",
    description: "Calculate the non-permissible portion of your dividends and determine how much to donate for Shariah compliance.",
  },
  {
    href: "/tools/zakat",
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="var(--emerald)" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
    title: "Zakat Calculator",
    description: "Calculate zakat on your equity portfolio, gold, savings, and other assets based on current Nisab values.",
  },
];

export default function ToolsPage() {
  return (
    <main className="shellPage">
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 64px" }}>
        <nav style={{ marginBottom: 16 }}>
          <Link href="/" style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", textDecoration: "none" }}>
            &larr; Home
          </Link>
        </nav>

        <header style={{ marginBottom: 40, paddingBottom: 20, borderBottom: "1px solid var(--line)" }}>
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

        <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                padding: "28px 24px",
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--line)",
                background: "var(--bg-card)",
                textDecoration: "none",
                transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = "var(--emerald)";
                el.style.boxShadow = "0 0 0 1px var(--emerald), 0 8px 24px rgba(16,185,129,.12)";
                el.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = "var(--line)";
                el.style.boxShadow = "none";
                el.style.transform = "translateY(0)";
              }}
            >
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "var(--emerald-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {tool.icon}
              </div>
              <div>
                <h2 style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "var(--text)",
                  margin: "0 0 6px",
                }}>
                  {tool.title}
                </h2>
                <p style={{
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.55,
                  margin: 0,
                }}>
                  {tool.description}
                </p>
              </div>
              <span style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--emerald)",
                marginTop: "auto",
              }}>
                Open calculator &rarr;
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";
import { PRIMARY_METHODOLOGY_VERSION } from "@/lib/methodology-version";

const CHECKS = [
  { label: "Debt ratio", icon: "D" },
  { label: "Income purity", icon: "I" },
  { label: "Cash & liquid", icon: "C" },
  { label: "Receivables", icon: "R" },
  { label: "Interest exposure", icon: "X" },
  { label: "Business activity", icon: "B" },
];

export function MethodologyTrustCard() {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "44rem",
        borderRadius: "1rem",
        border: "1px solid var(--line)",
        background: "var(--panel)",
        overflow: "hidden",
        boxShadow: "0 0 0 1px rgba(16,185,129,0.06), 0 4px 24px rgba(0,0,0,0.18)",
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          height: "3px",
          background: "linear-gradient(90deg, #10b981 0%, #34d399 50%, transparent 100%)",
        }}
      />

      <div style={{ padding: "1.25rem 1.5rem" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "0.875rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
              {/* Shield icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--emerald)",
                }}
              >
                How we screen
              </span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
              Rules-based research from public data — not investment advice or a religious ruling.
            </p>
          </div>
          <span
            style={{
              flexShrink: 0,
              fontSize: "0.65rem",
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: "999px",
              background: "var(--emerald-bg)",
              color: "var(--emerald)",
              border: "1px solid var(--emerald-border)",
              whiteSpace: "nowrap",
            }}
          >
            v{PRIMARY_METHODOLOGY_VERSION}
          </span>
        </div>

        {/* 6 checks grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.45rem",
            marginBottom: "1rem",
          }}
        >
          {CHECKS.map((c) => (
            <div
              key={c.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.4rem 0.6rem",
                borderRadius: "0.5rem",
                background: "var(--bg-soft)",
                border: "1px solid var(--line)",
              }}
            >
              <span
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: "var(--emerald-bg)",
                  border: "1px solid var(--emerald-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.58rem",
                  fontWeight: 800,
                  color: "var(--emerald)",
                  flexShrink: 0,
                }}
              >
                {c.icon}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                {c.label}
              </span>
            </div>
          ))}
        </div>

        {/* Footer links */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link
            href="/methodology"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "var(--emerald)",
              textDecoration: "none",
              padding: "0.35rem 0.85rem",
              borderRadius: "0.5rem",
              background: "var(--emerald-bg)",
              border: "1px solid var(--emerald-border)",
              transition: "all 150ms",
            }}
          >
            Read methodology
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/shariah-compliance"
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
              textDecoration: "none",
              padding: "0.35rem 0.85rem",
              borderRadius: "0.5rem",
              background: "var(--bg-soft)",
              border: "1px solid var(--line)",
              transition: "all 150ms",
            }}
          >
            Compliance overview
          </Link>
        </div>
      </div>
    </div>
  );
}

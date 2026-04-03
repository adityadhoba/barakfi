"use client";

import { useState } from "react";
import ws from "./workspace-hero.module.css";

const BROKERS = [
  { id: "angel_one", name: "Angel One" },
  { id: "upstox", name: "Upstox" },
  { id: "groww", name: "Groww" },
  { id: "zerodha", name: "Zerodha" },
  { id: "hdfc_sky", name: "HDFC SKY" },
  { id: "motilal", name: "Motilal Oswal" },
  { id: "paytm", name: "Paytm Money" },
  { id: "fivepaisa", name: "5paisa" },
] as const;

const STEPS = [
  { icon: "\uD83D\uDD12", title: "Broker Login", desc: "You authorize read-only access to your holdings." },
  { icon: "\uD83D\uDCE5", title: "Holdings Import", desc: "We securely pull your portfolio positions." },
  { icon: "\u2714\uFE0F", title: "Shariah Screening", desc: "Each holding is instantly screened for compliance." },
];

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

const BROKER_COLORS: Record<string, string> = {
  angel_one: "#ff6b35", upstox: "#6c3bff", groww: "#00d09c", zerodha: "#387ed1",
  hdfc_sky: "#004c8f", motilal: "#e31837", paytm: "#00baf2", fivepaisa: "#3f51b5",
};

export function BrokerConnectButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={ws.connectBtn} onClick={() => setOpen(true)}>Connect</button>
      {open && <BrokerModal onClose={() => setOpen(false)} />}
    </>
  );
}

function BrokerModal({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", margin: "0 0 2px" }}>Trade, track and manage investments on</p>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>Barakfi</h3>
          </div>
          <button type="button" onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>

        {selected ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: BROKER_COLORS[selected] || "var(--emerald)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#fff", fontWeight: 700, fontSize: "0.9rem" }}>
              {getInitials(BROKERS.find((b) => b.id === selected)?.name || "")}
            </div>
            <h4 style={{ margin: "0 0 8px", fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>
              {BROKERS.find((b) => b.id === selected)?.name}
            </h4>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0 0 20px", lineHeight: 1.5 }}>
              Broker integration is being activated. We&apos;ll notify you when it&apos;s ready to connect.
            </p>
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "var(--gold-bg)", border: "1px solid var(--gold-border)", fontSize: "0.82rem", color: "var(--gold)", fontWeight: 600 }}>
              Coming Soon &mdash; Expected in a few days
            </div>
            <button type="button" onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)", padding: "6px 12px", marginTop: 16 }}>
              &larr; Back to brokers
            </button>
          </div>
        ) : (
          <>
            <h4 style={{ margin: "0 0 16px", fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>
              Login with your broker
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {BROKERS.map((broker) => (
                <button key={broker.id} type="button" onClick={() => setSelected(broker.id)} style={brokerCardStyle}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: BROKER_COLORS[broker.id], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.75rem", marginBottom: 6 }}>
                    {getInitials(broker.name)}
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text)" }}>{broker.name}</span>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
              <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
              <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>How does this work?</span>
              <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {STEPS.map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--emerald-bg)", border: "1px solid var(--emerald-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", flexShrink: 0 }}>{step.icon}</div>
                  <div>
                    <strong style={{ fontSize: "0.82rem", color: "var(--text)" }}>{step.title}</strong>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "2px 0 0", lineHeight: 1.4 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center", marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <p style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", margin: "0 0 8px" }}>Don&apos;t have a broker account?</p>
              <a href="https://zerodha.com/open-account" target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--emerald)", textDecoration: "none" }}>
                Open an account online
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.35)", display: "grid", placeItems: "center", padding: 24 };
const modalStyle: React.CSSProperties = { width: "100%", maxWidth: 460, padding: 28, borderRadius: 16, background: "var(--panel)", border: "1px solid var(--line)", boxShadow: "0 20px 40px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" };
const closeBtnStyle: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", color: "var(--text-tertiary)", padding: "4px 8px", lineHeight: 1 };
const brokerCardStyle: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 8px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--bg)", cursor: "pointer" };

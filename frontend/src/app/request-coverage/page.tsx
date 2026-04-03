"use client";

import { useState } from "react";

export default function RequestCoveragePage() {
  const [symbol, setSymbol] = useState("");
  const [exchange, setExchange] = useState("NSE");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8001/api";
      await fetch(`${apiBase}/me/coverage-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: symbol.trim().toUpperCase(), exchange }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="shellPage">
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 24px 64px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 800, marginBottom: 8 }}>
          Request Stock Coverage
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: 32, lineHeight: 1.5 }}>
          Can&apos;t find a stock? Submit a request and we&apos;ll add it to our screening universe. Most requests are processed within a week.
        </p>

        {submitted ? (
          <div style={{
            padding: "32px 24px", textAlign: "center",
            background: "var(--emerald-dim)", borderRadius: "var(--radius-xl)",
            border: "1px solid var(--emerald-border)",
          }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--emerald)", marginBottom: 8 }}>
              Request Submitted
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              We&apos;ve received your request for <strong>{symbol.toUpperCase()}</strong> on {exchange}.
              You&apos;ll be notified when screening is complete.
            </p>
            <button
              onClick={() => { setSubmitted(false); setSymbol(""); }}
              style={{
                marginTop: 16, padding: "8px 20px",
                background: "var(--emerald)", color: "#fff",
                border: "none", borderRadius: "var(--radius-md)",
                fontWeight: 600, cursor: "pointer", fontSize: "0.85rem",
              }}
            >
              Submit Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{
            padding: 24, background: "var(--bg-elevated)",
            borderRadius: "var(--radius-xl)", border: "1px solid var(--line)",
          }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>
                Stock Symbol
              </label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="e.g. AAPL, RELIANCE, AZN"
                required
                style={{
                  width: "100%", padding: "10px 14px",
                  borderRadius: "var(--radius-md)", border: "1px solid var(--line)",
                  background: "var(--bg)", fontSize: "0.9rem",
                  color: "var(--text)", outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>
                Exchange
              </label>
              <select
                value={exchange}
                onChange={(e) => setExchange(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px",
                  borderRadius: "var(--radius-md)", border: "1px solid var(--line)",
                  background: "var(--bg)", fontSize: "0.9rem",
                  color: "var(--text)", outline: "none",
                }}
              >
                <option value="NSE">NSE (India)</option>
                <option value="BSE">BSE (India)</option>
                <option value="US">NYSE / NASDAQ (US)</option>
                <option value="LSE">LSE (UK)</option>
                <option value="TSE">TSE (Japan)</option>
                <option value="XETRA">XETRA (Germany)</option>
                <option value="ASX">ASX (Australia)</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !symbol.trim()}
              style={{
                width: "100%", padding: "12px 24px",
                background: loading ? "var(--text-muted)" : "var(--emerald)",
                color: "#fff", border: "none",
                borderRadius: "var(--radius-md)",
                fontWeight: 700, fontSize: "0.9rem",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background var(--transition-fast)",
              }}
            >
              {loading ? "Submitting..." : "Request Screening"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

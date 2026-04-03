"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ws from "./workspace-hero.module.css";

type StockOption = { symbol: string; name: string };

type Props = {
  stocks: StockOption[];
};

export function AddHoldingButton({ stocks }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={ws.actionBtnPrimary}
        onClick={() => setOpen(true)}
      >
        + Add Holding
      </button>
      {open && <AddHoldingModal stocks={stocks} onClose={() => setOpen(false)} />}
    </>
  );
}

function AddHoldingModal({ stocks, onClose }: { stocks: StockOption[]; onClose: () => void }) {
  const router = useRouter();
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [thesis, setThesis] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filtered = search.trim()
    ? stocks.filter(
        (s) =>
          s.symbol.toLowerCase().includes(search.toLowerCase()) ||
          s.name.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 8)
    : [];

  async function handleSubmit() {
    if (!symbol || !quantity || !avgPrice) {
      setError("Please fill all required fields");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          quantity: parseFloat(quantity),
          average_buy_price: parseFloat(avgPrice),
          thesis: thesis.trim(),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || "Failed to add holding");
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const selectedStock = stocks.find((s) => s.symbol === symbol);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 4px", fontSize: "1.05rem", fontWeight: 700 }}>Add Holding</h3>
        <p style={{ margin: "0 0 16px", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
          Track a stock you own in your portfolio
        </p>

        {/* Stock search */}
        <label style={labelStyle}>Stock *</label>
        {selectedStock ? (
          <div style={selectedStyle}>
            <span><strong>{selectedStock.symbol}</strong> &mdash; {selectedStock.name}</span>
            <button type="button" onClick={() => { setSymbol(""); setSearch(""); }} style={clearBtnStyle}>&times;</button>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <input
              style={inputStyle}
              type="text"
              placeholder="Search by name or symbol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {filtered.length > 0 && (
              <div style={dropdownStyle}>
                {filtered.map((s) => (
                  <button
                    key={s.symbol}
                    type="button"
                    style={dropdownItemStyle}
                    onClick={() => { setSymbol(s.symbol); setSearch(""); }}
                  >
                    <strong>{s.symbol}</strong>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.78rem", marginLeft: 8 }}>{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quantity */}
        <label style={labelStyle}>Quantity *</label>
        <input
          style={inputStyle}
          type="number"
          placeholder="e.g. 10"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          min="0.01"
          step="any"
        />

        {/* Average buy price */}
        <label style={labelStyle}>Average Buy Price (INR) *</label>
        <input
          style={inputStyle}
          type="number"
          placeholder="e.g. 1500"
          value={avgPrice}
          onChange={(e) => setAvgPrice(e.target.value)}
          min="0.01"
          step="any"
        />

        {/* Thesis (optional) */}
        <label style={labelStyle}>Notes (optional)</label>
        <input
          style={inputStyle}
          type="text"
          placeholder="Why did you buy this?"
          value={thesis}
          onChange={(e) => setThesis(e.target.value)}
          maxLength={200}
        />

        {error && <p style={{ color: "var(--red)", fontSize: "0.82rem", margin: "8px 0 0" }}>{error}</p>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={saving || !symbol || !quantity || !avgPrice} style={submitBtnStyle}>
            {saving ? "Adding..." : "Add Holding"}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 90,
  background: "rgba(0,0,0,0.35)",
  display: "grid", placeItems: "center", padding: 24,
};

const modalStyle: React.CSSProperties = {
  width: "100%", maxWidth: 440, padding: 24,
  borderRadius: 16, background: "var(--panel)",
  border: "1px solid var(--line)", boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.72rem", fontWeight: 600,
  color: "var(--text-secondary)", textTransform: "uppercase",
  letterSpacing: "0.04em", marginBottom: 4, marginTop: 12,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px",
  border: "1px solid var(--line)", borderRadius: 8,
  background: "var(--bg)", color: "var(--text)",
  fontSize: "0.88rem", outline: "none",
};

const selectedStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "10px 14px", borderRadius: 8,
  background: "var(--emerald-bg)", border: "1px solid var(--emerald-border)",
  fontSize: "0.85rem", color: "var(--text)",
};

const clearBtnStyle: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  fontSize: "1.1rem", color: "var(--text-tertiary)", padding: "0 4px",
};

const dropdownStyle: React.CSSProperties = {
  position: "absolute", top: "100%", left: 0, right: 0,
  background: "var(--panel)", border: "1px solid var(--line)",
  borderRadius: 8, boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
  zIndex: 10, maxHeight: 240, overflowY: "auto",
};

const dropdownItemStyle: React.CSSProperties = {
  width: "100%", padding: "8px 14px", background: "none",
  border: "none", borderBottom: "1px solid var(--line)",
  cursor: "pointer", textAlign: "left", fontSize: "0.85rem",
  color: "var(--text)",
};

const cancelBtnStyle: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 8,
  border: "1px solid var(--line)", background: "var(--bg-soft)",
  color: "var(--text-secondary)", fontSize: "0.84rem", fontWeight: 600, cursor: "pointer",
};

const submitBtnStyle: React.CSSProperties = {
  padding: "8px 20px", borderRadius: 8,
  border: "none", background: "var(--emerald)", color: "#fff",
  fontSize: "0.84rem", fontWeight: 600, cursor: "pointer",
  opacity: 1,
};

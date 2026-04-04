"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import styles from "./request.module.css";

export function RequestCoverageForm() {
  const { isSignedIn, getToken } = useAuth();
  const [symbol, setSymbol] = useState("");
  const [exchange, setExchange] = useState("NSE");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    const token = await getToken();
    if (!token) {
      setStatus("err");
      setMessage("Could not get a session. Please sign in again.");
      return;
    }
    try {
      const res = await fetch("/api/me/coverage-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          symbol: symbol.trim().toUpperCase(),
          exchange: exchange.trim().toUpperCase(),
          notes: notes.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("err");
        setMessage(typeof data.detail === "string" ? data.detail : "Request failed. Try again.");
        return;
      }
      setStatus("ok");
      setMessage("Thanks — we received your request. We will review and add coverage when possible.");
      setSymbol("");
      setNotes("");
    } catch {
      setStatus("err");
      setMessage("Network error. Please try again.");
    }
  }

  if (!isSignedIn) {
    return (
      <div className={styles.cta}>
        <Link href="/sign-in?redirect_url=/request-coverage" className={styles.ctaButton}>
          Sign in to request coverage
        </Link>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label className={styles.field}>
        <span>Symbol</span>
        <input
          type="text"
          required
          autoComplete="off"
          placeholder="e.g. RELIANCE or AAPL"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
      </label>
      <label className={styles.field}>
        <span>Exchange</span>
        <select value={exchange} onChange={(e) => setExchange(e.target.value)}>
          <option value="NSE">NSE (India)</option>
          <option value="BSE">BSE (India)</option>
          <option value="US">US (NYSE / NASDAQ)</option>
          <option value="LSE">LSE (London)</option>
        </select>
      </label>
      <label className={styles.field}>
        <span>Notes (optional)</span>
        <textarea
          rows={3}
          placeholder="Company name or why you need this stock screened"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      <button type="submit" className={styles.submitBtn} disabled={status === "loading"}>
        {status === "loading" ? "Submitting…" : "Submit request"}
      </button>
      {message && (
        <p className={status === "ok" ? styles.formOk : styles.formErr} role="status">
          {message}
        </p>
      )}
    </form>
  );
}

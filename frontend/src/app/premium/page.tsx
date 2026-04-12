"use client";

import { useState } from "react";
import { getPublicApiBaseUrl } from "@/lib/api-base";
import styles from "./premium.module.css";

const apiBaseUrl = getPublicApiBaseUrl();

const FEATURES = [
  { icon: "🔓", label: "Unlimited stock screening" },
  { icon: "🎯", label: "Advanced compliance filters" },
  { icon: "📊", label: "Portfolio compliance tracking" },
  { icon: "📋", label: "Detailed compliance breakdown" },
  { icon: "🔔", label: "Real-time compliance alerts" },
];

export default function PremiumPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch(`${apiBaseUrl}/early-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), source: "premium_page" }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <span className={styles.badge}>Coming Soon</span>
        <h1 className={styles.title}>BarakFi Premium</h1>
        <p className={styles.subtitle}>
          Deeper Shariah compliance insights, unlimited screening, and powerful
          portfolio tools — all in one place.
        </p>

        <ul className={styles.features}>
          {FEATURES.map((f) => (
            <li key={f.label} className={styles.feature}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <span>{f.label}</span>
            </li>
          ))}
        </ul>

        {status === "done" ? (
          <div className={styles.success}>
            <span className={styles.successIcon}>✓</span>
            <p>You&apos;ll be notified when Premium launches.</p>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              type="text"
              className={styles.input}
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="email"
              className={styles.input}
              placeholder="Email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="submit"
              className={styles.btn}
              disabled={status === "loading" || !email.trim()}
            >
              {status === "loading" ? "Submitting…" : "Join Early Access"}
            </button>
            {status === "error" && (
              <p className={styles.errorMsg}>Something went wrong. Please try again.</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}

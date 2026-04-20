"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Infinity,
  SlidersHorizontal,
  BarChart2,
  FileSearch,
  Bell,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import styles from "./premium.module.css";

const FEATURES = [
  {
    Icon: Infinity,
    label: "Unlimited stock screening",
    desc: "Screen every NSE-listed stock without daily limits.",
  },
  {
    Icon: SlidersHorizontal,
    label: "Advanced compliance filters",
    desc: "Filter by debt ratio, compliance score, and more.",
  },
  {
    Icon: BarChart2,
    label: "Portfolio compliance tracking",
    desc: "See your portfolio's overall Shariah health at a glance.",
  },
  {
    Icon: FileSearch,
    label: "Detailed compliance breakdown",
    desc: "Full ratio-by-ratio explanation for every stock.",
  },
  {
    Icon: Bell,
    label: "Real-time compliance alerts",
    desc: "Get notified the moment a stock's status changes.",
  },
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
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), source: "premium_page" }),
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className={styles.page}>
      {/* Back link */}
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} />
        Back
      </Link>

      <div className={styles.card}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <span className={styles.badge}>
            <Sparkles size={11} />
            Coming Soon
          </span>
          <h1 className={styles.title}>BarakFi Premium</h1>
          <p className={styles.subtitle}>
            Deeper Shariah compliance insights, unlimited screening, and
            powerful portfolio tools — all in one place.
          </p>
        </div>

        {/* Features */}
        <ul className={styles.features}>
          {FEATURES.map(({ Icon, label, desc }) => (
            <li key={label} className={styles.feature}>
              <span className={styles.featureIcon}>
                <Icon size={18} strokeWidth={1.75} />
              </span>
              <div className={styles.featureText}>
                <span className={styles.featureLabel}>{label}</span>
                <span className={styles.featureDesc}>{desc}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className={styles.divider} />

        {/* Form / Success */}
        {status === "done" ? (
          <div className={styles.success}>
            <span className={styles.successIcon}>
              <CheckCircle2 size={28} strokeWidth={1.75} />
            </span>
            <p className={styles.successTitle}>You&apos;re on the list!</p>
            <p className={styles.successDesc}>
              We&apos;ll notify you as soon as Premium launches.
            </p>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <p className={styles.formLabel}>Get early access</p>
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
            <p className={styles.privacyNote}>
              No spam. Unsubscribe any time.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

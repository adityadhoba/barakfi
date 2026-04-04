"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./feedback.module.css";

const CATEGORIES = [
  { value: "general", label: "General Feedback" },
  { value: "feature", label: "Feature Request" },
  { value: "bug", label: "Bug Report" },
  { value: "tool", label: "Tool Suggestion" },
  { value: "data", label: "Data Issue" },
  { value: "other", label: "Other" },
];

export default function FeedbackPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) { setError("Please enter a message"); return; }
    setLoading(true);
    setError("");
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8001/api";
      const res = await fetch(`${apiBase}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, category, message }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  if (submitted) {
    return (
      <main className="shellPage">
        <div className={styles.container}>
          <div className={styles.successCard}>
            <div className={styles.successIcon}>&#10003;</div>
            <h2 className={styles.successTitle}>Thank you!</h2>
            <p className={styles.successDesc}>Your feedback has been submitted. We review every message and appreciate your input.</p>
            <Link href="/" className={styles.successLink}>Back to home</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="shellPage">
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Feedback</span>
        </nav>

        <header className={styles.header}>
          <h1 className={styles.title}>Share Your Feedback</h1>
          <p className={styles.subtitle}>Help us improve Barakfi. Suggest features, report issues, or just say hello.</p>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Name (optional)</label>
              <input type="text" className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Email (optional)</label>
              <input type="email" className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Category</label>
            <select className={styles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Message *</label>
            <textarea className={styles.textarea} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us what you think..." rows={5} required />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Sending..." : "Submit Feedback"}
          </button>
        </form>
      </div>
    </main>
  );
}

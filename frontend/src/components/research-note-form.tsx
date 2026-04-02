"use client";

import styles from "@/app/page.module.css";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  symbol: string;
  portfolioId?: number;
};

export function ResearchNoteForm({ symbol, portfolioId }: Props) {
  const router = useRouter();
  const [noteType, setNoteType] = useState("WATCH");
  const [conviction, setConviction] = useState("medium");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");
    setIsSuccess(false);

    try {
      const response = await fetch("/api/research-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          note_type: noteType,
          summary,
          conviction,
          portfolio_id: portfolioId ?? null,
          notes,
        }),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.detail || "Unable to save research note");
      }

      setStatus("Research note recorded successfully.");
      setIsSuccess(true);
      setSummary("");
      setNotes("");
      startTransition(() => { router.refresh(); });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save research note.");
      setIsSuccess(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className={styles.settingsForm} onSubmit={handleSubmit}>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Note Type</span>
          <select onChange={(e) => setNoteType(e.target.value)} value={noteType}>
            <option value="WATCH">Watch — keep researching</option>
            <option value="ADD">Add — initiate position</option>
            <option value="TRIM">Trim — reduce exposure</option>
            <option value="EXIT">Exit — close position</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>Conviction level</span>
          <select onChange={(e) => setConviction(e.target.value)} value={conviction}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label className={styles.fieldWide}>
          <span>Summary</span>
          <input
            maxLength={160}
            minLength={4}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="What is your current take on this stock?"
            required
            type="text"
            value={summary}
          />
        </label>

        <label className={styles.fieldTextarea}>
          <span>Detailed reasoning</span>
          <textarea
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Capture your reasoning — this becomes part of your audit trail."
            rows={4}
            value={notes}
          />
        </label>
      </div>

      <div className={styles.formActions}>
        <button className={styles.primaryCta} disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Add research note"}
        </button>
        {status && (
          <p className={isSuccess ? styles.formStatusSuccess : styles.formStatus} role="status" aria-live="polite">
            {status}
          </p>
        )}
      </div>
    </form>
  );
}

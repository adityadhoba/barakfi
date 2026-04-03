"use client";

import styles from "./research-notes.module.css";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

const NOTE_TYPES = [
  { value: "WATCH", label: "Watch", icon: "👀" },
  { value: "ADD", label: "Add", icon: "📈" },
  { value: "TRIM", label: "Trim", icon: "✂️" },
  { value: "EXIT", label: "Exit", icon: "🚪" },
];

const CONVICTION_LEVELS = [
  { value: "low", label: "Low", dots: 1 },
  { value: "medium", label: "Medium", dots: 2 },
  { value: "high", label: "High", dots: 3 },
];

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
    <form className={styles.formCard} onSubmit={handleSubmit}>
      <div className={styles.formTitle}>
        <span className={styles.formTitleIcon}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
        </span>
        Add Research Note
      </div>

      <div className={styles.chipGroup}>
        <span className={styles.chipLabel}>Action</span>
        <div className={styles.chipRow}>
          {NOTE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={noteType === t.value ? styles.chipActive : styles.chip}
              onClick={() => setNoteType(t.value)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.chipGroup}>
        <span className={styles.chipLabel}>Conviction</span>
        <div className={styles.chipRow}>
          {CONVICTION_LEVELS.map((c) => (
            <button
              key={c.value}
              type="button"
              className={conviction === c.value ? styles.chipActive : styles.chip}
              onClick={() => setConviction(c.value)}
            >
              {c.label}
              <span style={{ marginLeft: 6, display: "inline-flex", gap: 2 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: i < c.dots ? "currentColor" : "var(--line)",
                      display: "inline-block",
                    }}
                  />
                ))}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.inputLabel} htmlFor="rn-summary">Summary</label>
        <input
          id="rn-summary"
          className={styles.summaryInput}
          maxLength={160}
          minLength={4}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="What is your current take on this stock?"
          required
          type="text"
          value={summary}
        />
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.inputLabel} htmlFor="rn-notes">Detailed reasoning</label>
        <div className={styles.textareaWrap}>
          <textarea
            id="rn-notes"
            className={styles.textarea}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Capture your reasoning — this becomes part of your audit trail."
            rows={4}
            maxLength={2000}
            value={notes}
          />
          <span className={styles.charCount}>{notes.length}/2000</span>
        </div>
      </div>

      <div className={styles.submitRow}>
        <button
          className={isSuccess ? styles.submitBtnSuccess : styles.submitBtn}
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving…" : isSuccess ? "✓ Saved" : "Add research note"}
        </button>
        {status && !isSuccess && (
          <span className={styles.statusMsg}>{status}</span>
        )}
      </div>
    </form>
  );
}

"use client";

import styles from "@/app/page.module.css";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  defaultAssignee?: string;
};

export function GovernanceReviewCaseForm({ defaultAssignee = "" }: Props) {
  const router = useRouter();
  const [symbol, setSymbol] = useState("");
  const [assignedTo, setAssignedTo] = useState(defaultAssignee);
  const [priority, setPriority] = useState("normal");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/review-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          assigned_to: assignedTo,
          priority,
          summary,
          notes,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.detail || "Unable to create review case");
      }

      setStatus("Review case created.");
      setSymbol("");
      setSummary("");
      setNotes("");
      setPriority("normal");
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create review case.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className={styles.settingsForm} onSubmit={handleSubmit}>
      <div className={styles.formIntro}>
        <p className={styles.formIntroTitle}>Open a new review case</p>
        <p className={styles.formIntroText}>
          Use this when a stock needs a founder or scholar decision beyond the automated screen.
        </p>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Symbol</span>
          <input onChange={(event) => setSymbol(event.target.value.toUpperCase())} required value={symbol} />
        </label>

        <label className={styles.field}>
          <span>Assign to</span>
          <input onChange={(event) => setAssignedTo(event.target.value)} placeholder="founder@barakfi.in" value={assignedTo} />
        </label>

        <label className={styles.field}>
          <span>Priority</span>
          <select onChange={(event) => setPriority(event.target.value)} value={priority}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </label>

        <label className={styles.fieldWide}>
          <span>Summary</span>
          <input
            minLength={8}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Describe why this stock needs founder or scholar review."
            required
            value={summary}
          />
        </label>

        <label className={styles.fieldTextarea}>
          <span>Review notes</span>
          <textarea
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Context, source gaps, or follow-up instructions."
            rows={4}
            value={notes}
          />
        </label>
      </div>

      <div className={styles.formActions}>
        <button className={styles.primaryCta} disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Open review case"}
        </button>
        {status ? (
          <p className={`${styles.formStatus} ${status.includes("created") ? styles.formStatusSuccess : ""}`}>
            {status}
          </p>
        ) : null}
      </div>
    </form>
  );
}

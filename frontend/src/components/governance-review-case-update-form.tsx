"use client";

import styles from "@/app/page.module.css";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

type ReviewCaseOption = {
  id: number;
  symbol: string;
  assigned_to: string | null;
  status: string;
  priority: string;
  review_outcome: string | null;
};

type Props = {
  cases: ReviewCaseOption[];
};

export function GovernanceReviewCaseUpdateForm({ cases }: Props) {
  const router = useRouter();
  const firstCase = cases[0];
  const [caseId, setCaseId] = useState(firstCase?.id ?? 0);
  const [assignedTo, setAssignedTo] = useState(firstCase?.assigned_to || "");
  const [statusValue, setStatusValue] = useState(firstCase?.status || "in_progress");
  const [priority, setPriority] = useState(firstCase?.priority || "normal");
  const [reviewOutcome, setReviewOutcome] = useState(firstCase?.review_outcome || "");
  const [note, setNote] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function syncCase(nextCaseId: number) {
    const nextCase = cases.find((item) => item.id === nextCaseId);
    setCaseId(nextCaseId);
    setAssignedTo(nextCase?.assigned_to || "");
    setStatusValue(nextCase?.status || "in_progress");
    setPriority(nextCase?.priority || "normal");
    setReviewOutcome(nextCase?.review_outcome || "");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormStatus("");

    try {
      const response = await fetch("/api/admin/review-cases/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: caseId,
          assigned_to: assignedTo,
          status: statusValue,
          priority,
          review_outcome: reviewOutcome || null,
          note,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.detail || "Unable to update review case");
      }

      setNote("");
      setFormStatus("Review case updated.");
      startTransition(() => router.refresh());
    } catch (error) {
      setFormStatus(error instanceof Error ? error.message : "Unable to update review case.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className={styles.settingsForm} onSubmit={handleSubmit}>
      <div className={styles.formIntro}>
        <p className={styles.formIntroTitle}>Update an existing case</p>
        <p className={styles.formIntroText}>
          Reassign the case, change its status, or record the latest review outcome and action note.
        </p>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Case</span>
          <select onChange={(event) => syncCase(Number(event.target.value))} value={caseId}>
            {cases.map((item) => (
              <option key={item.id} value={item.id}>
                #{item.id} · {item.symbol}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Assign to</span>
          <input onChange={(event) => setAssignedTo(event.target.value)} value={assignedTo} />
        </label>

        <label className={styles.field}>
          <span>Status</span>
          <select onChange={(event) => setStatusValue(event.target.value)} value={statusValue}>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>Priority</span>
          <select onChange={(event) => setPriority(event.target.value)} value={priority}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>Outcome</span>
          <select onChange={(event) => setReviewOutcome(event.target.value)} value={reviewOutcome}>
            <option value="">No outcome yet</option>
            <option value="HALAL">Halal</option>
            <option value="CAUTIOUS">Cautious</option>
            <option value="NON_COMPLIANT">Non-compliant</option>
          </select>
        </label>

        <label className={styles.fieldTextarea}>
          <span>Action note</span>
          <textarea
            minLength={5}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Document the review action taken right now."
            required
            rows={4}
            value={note}
          />
        </label>
      </div>

      <div className={styles.formActions}>
        <button className={styles.primaryCta} disabled={isSaving || !caseId} type="submit">
          {isSaving ? "Saving..." : "Save review update"}
        </button>
        {formStatus ? (
          <p className={`${styles.formStatus} ${formStatus.includes("updated") ? styles.formStatusSuccess : ""}`}>
            {formStatus}
          </p>
        ) : null}
      </div>
    </form>
  );
}

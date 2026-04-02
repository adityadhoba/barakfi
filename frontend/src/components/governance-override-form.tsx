"use client";

import styles from "@/app/page.module.css";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

export function GovernanceOverrideForm() {
  const router = useRouter();
  const [symbol, setSymbol] = useState("");
  const [decidedStatus, setDecidedStatus] = useState("REQUIRES_REVIEW");
  const [rationale, setRationale] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/compliance-overrides", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol,
          decided_status: decidedStatus,
          rationale,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.detail || "Unable to save override");
      }

      setStatus("Override saved.");
      setSymbol("");
      setDecidedStatus("REQUIRES_REVIEW");
      setRationale("");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save override.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className={styles.settingsForm} onSubmit={handleSubmit}>
      <div className={styles.formIntro}>
        <p className={styles.formIntroTitle}>Record a manual decision</p>
        <p className={styles.formIntroText}>
          Use overrides sparingly and always include the reason, so the audit trail stays clear later.
        </p>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Symbol</span>
          <input onChange={(event) => setSymbol(event.target.value.toUpperCase())} required value={symbol} />
        </label>

        <label className={styles.field}>
          <span>Decision</span>
          <select onChange={(event) => setDecidedStatus(event.target.value)} value={decidedStatus}>
            <option value="HALAL">Halal</option>
            <option value="REQUIRES_REVIEW">Requires review</option>
            <option value="NON_COMPLIANT">Non-compliant</option>
          </select>
        </label>

        <label className={styles.fieldTextarea}>
          <span>Rationale</span>
          <textarea
            minLength={8}
            onChange={(event) => setRationale(event.target.value)}
            placeholder="Document why this override exists."
            required
            rows={4}
            value={rationale}
          />
        </label>
      </div>

      <div className={styles.formActions}>
        <button className={styles.primaryCta} disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Save override"}
        </button>
        {status ? (
          <p className={`${styles.formStatus} ${status.includes("saved") ? styles.formStatusSuccess : ""}`}>
            {status}
          </p>
        ) : null}
      </div>
    </form>
  );
}

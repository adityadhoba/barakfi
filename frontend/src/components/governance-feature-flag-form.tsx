"use client";

import styles from "@/app/page.module.css";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

type FeatureFlagOption = {
  code: string;
  name: string;
  enabled: boolean;
  rollout_stage: string;
  notes: string;
};

type Props = {
  flags: FeatureFlagOption[];
};

export function GovernanceFeatureFlagForm({ flags }: Props) {
  const router = useRouter();
  const firstFlag = flags[0];
  const [code, setCode] = useState(firstFlag?.code || "");
  const [enabled, setEnabled] = useState(firstFlag?.enabled ?? true);
  const [rolloutStage, setRolloutStage] = useState(firstFlag?.rollout_stage || "internal");
  const [notes, setNotes] = useState(firstFlag?.notes || "");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function syncFlag(nextCode: string) {
    const nextFlag = flags.find((item) => item.code === nextCode);
    setCode(nextCode);
    setEnabled(nextFlag?.enabled ?? true);
    setRolloutStage(nextFlag?.rollout_stage || "internal");
    setNotes(nextFlag?.notes || "");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/feature-flags/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          enabled,
          rollout_stage: rolloutStage,
          notes,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.detail || "Unable to update feature flag");
      }

      setStatus("Feature flag updated.");
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update feature flag.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className={styles.settingsForm} onSubmit={handleSubmit}>
      <div className={styles.formIntro}>
        <p className={styles.formIntroTitle}>Adjust rollout safely</p>
        <p className={styles.formIntroText}>
          Pick a feature, review its current state, then update the rollout stage and notes in one pass.
        </p>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Feature</span>
          <select onChange={(event) => syncFlag(event.target.value)} value={code}>
            {flags.map((flag) => (
              <option key={flag.code} value={flag.code}>
                {flag.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Rollout stage</span>
          <select onChange={(event) => setRolloutStage(event.target.value)} value={rolloutStage}>
            <option value="internal">Internal</option>
            <option value="beta">Beta</option>
            <option value="public">Public</option>
            <option value="paused">Paused</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>Status</span>
          <select onChange={(event) => setEnabled(event.target.value === "enabled")} value={enabled ? "enabled" : "disabled"}>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>

        <label className={styles.fieldTextarea}>
          <span>Founder notes</span>
          <textarea
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Document why this rollout state changed."
            rows={4}
            value={notes}
          />
        </label>
      </div>

      <div className={styles.formActions}>
        <button className={styles.primaryCta} disabled={isSaving || !code} type="submit">
          {isSaving ? "Saving..." : "Save changes"}
        </button>
        {status ? (
          <p className={`${styles.formStatus} ${status.includes("updated") ? styles.formStatusSuccess : ""}`}>
            {status}
          </p>
        ) : null}
      </div>
    </form>
  );
}

"use client";

import styles from "@/app/page.module.css";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

type UserOption = {
  auth_subject: string;
  display_name: string;
};

type Props = {
  users: UserOption[];
};

export function GovernanceSupportNoteForm({ users }: Props) {
  const router = useRouter();
  const [authSubject, setAuthSubject] = useState(users[0]?.auth_subject || "");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/support-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_subject: authSubject,
          note,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.detail || "Unable to save support note");
      }

      setNote("");
      setStatus("Support note saved.");
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save support note.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className={styles.settingsForm} onSubmit={handleSubmit}>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>User</span>
          <select onChange={(event) => setAuthSubject(event.target.value)} value={authSubject}>
            {users.map((user) => (
              <option key={user.auth_subject} value={user.auth_subject}>
                {user.display_name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.fieldTextarea}>
          <span>Internal note</span>
          <textarea
            minLength={5}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add support context, founder notes, or manual follow-up."
            required
            rows={4}
            value={note}
          />
        </label>
      </div>

      <div className={styles.formActions}>
        <button className={styles.primaryCta} disabled={isSaving || !authSubject} type="submit">
          {isSaving ? "Saving..." : "Save note"}
        </button>
        {status ? <p className={styles.formStatus}>{status}</p> : null}
      </div>
    </form>
  );
}

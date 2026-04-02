"use client";

import styles from "@/app/page.module.css";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

type UserOption = {
  auth_subject: string;
  display_name: string;
  is_active: boolean;
};

type Props = {
  users: UserOption[];
};

export function GovernanceUserStatusForm({ users }: Props) {
  const router = useRouter();
  const firstUser = users[0];
  const [authSubject, setAuthSubject] = useState(firstUser?.auth_subject || "");
  const [isActive, setIsActive] = useState(firstUser?.is_active ?? true);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function syncUser(nextSubject: string) {
    const nextUser = users.find((item) => item.auth_subject === nextSubject);
    setAuthSubject(nextSubject);
    setIsActive(nextUser?.is_active ?? true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/users/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_subject: authSubject,
          is_active: isActive,
          reason,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.detail || "Unable to update user status");
      }

      setReason("");
      setStatus("User status updated.");
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update user status.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className={styles.settingsForm} onSubmit={handleSubmit}>
      <div className={styles.formIntro}>
        <p className={styles.formIntroTitle}>Pause or restore account access</p>
        <p className={styles.formIntroText}>
          Leave a clear reason whenever access changes so support history stays understandable later.
        </p>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>User</span>
          <select onChange={(event) => syncUser(event.target.value)} value={authSubject}>
            {users.map((user) => (
              <option key={user.auth_subject} value={user.auth_subject}>
                {user.display_name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Account state</span>
          <select onChange={(event) => setIsActive(event.target.value === "active")} value={isActive ? "active" : "inactive"}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        <label className={styles.fieldTextarea}>
          <span>Reason</span>
          <textarea
            minLength={8}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Document why this account state is changing."
            required
            rows={4}
            value={reason}
          />
        </label>
      </div>

      <div className={styles.formActions}>
        <button className={styles.primaryCta} disabled={isSaving || !authSubject} type="submit">
          {isSaving ? "Saving..." : "Save status"}
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

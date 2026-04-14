"use client";

import styles from "@/app/page.module.css";
import type { SavedScreener } from "@/lib/api";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initialScreeners: SavedScreener[];
  sectors: string[];
  allowCreate?: boolean;
  gateMessage?: string;
};

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "halal", label: "Shariah Compliant only" },
  { value: "requires_review", label: "Requires review" },
  { value: "non_compliant", label: "Non-compliant" },
];

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

export function SavedScreenerPanel({
  initialScreeners,
  sectors,
  allowCreate = true,
  gateMessage = "",
}: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sector, setSector] = useState("All");
  const [statusFilter, setStatusFilter] = useState("halal");
  const [halalOnly, setHalalOnly] = useState(true);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");
    setIsSuccess(false);

    try {
      if (!allowCreate) {
        throw new Error(gateMessage || "Upgrade required to save another screener.");
      }

      const response = await fetch("/api/saved-screeners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          search_query: searchQuery,
          sector,
          status_filter: statusFilter,
          halal_only: halalOnly,
          notes,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || "Failed to save screener");
      }

      setName("");
      setSearchQuery("");
      setSector("All");
      setStatusFilter("halal");
      setHalalOnly(true);
      setNotes("");
      setStatus("Screener saved successfully.");
      setIsSuccess(true);
      startTransition(() => { router.refresh(); });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save screener.");
      setIsSuccess(false);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this screener? This cannot be undone.")) return;

    setDeletingId(id);
    setStatus("");
    setIsSuccess(false);

    try {
      const response = await fetch(`/api/saved-screeners/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete screener");

      setStatus("Screener removed.");
      setIsSuccess(true);
      startTransition(() => { router.refresh(); });
    } catch {
      setStatus("Unable to delete screener right now.");
      setIsSuccess(false);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={styles.savedScreenerLayout}>
      <form className={styles.settingsForm} onSubmit={handleSubmit}>
        <div className={styles.formIntro}>
          <p className={styles.formIntroTitle}>Create a saved screener</p>
          <p className={styles.formIntroText}>
            Save your search filters so you can rerun this screen later without rebuilding it.
          </p>
        </div>

        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Screener name</span>
            <input
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. High-quality compliant stocks"
              required
              value={name}
            />
          </label>

          <label className={styles.field}>
            <span>Search query</span>
            <input
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="IT, consumer, export..."
              value={searchQuery}
            />
          </label>

          <label className={styles.field}>
            <span>Sector</span>
            <select onChange={(e) => setSector(e.target.value)} value={sector}>
              <option value="All">All sectors</option>
              {sectors.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Status filter</span>
            <select onChange={(e) => setStatusFilter(e.target.value)} value={statusFilter}>
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>

          <label className={styles.fieldTextarea}>
            <span>Notes</span>
            <textarea
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What are you trying to discover?"
              rows={3}
              value={notes}
            />
          </label>

          <label className={styles.fieldCheckbox}>
            <input
              checked={halalOnly}
              onChange={(e) => setHalalOnly(e.target.checked)}
              type="checkbox"
            />
            <span>Only include stocks screened as Shariah Compliant</span>
          </label>
        </div>

        <div className={styles.formActions}>
          <button className={styles.primaryCta} disabled={isSaving || !allowCreate} type="submit">
            {isSaving ? "Saving..." : "Save screener"}
          </button>
          {!allowCreate && (
            <p className={styles.formStatus}>
              {gateMessage}{" "}
            </p>
          )}
          {status && (
            <p className={isSuccess ? styles.formStatusSuccess : styles.formStatus} role="status" aria-live="polite">
              {status}
            </p>
          )}
        </div>
      </form>

      <div className={styles.simpleList}>
        {initialScreeners.length > 0 ? (
          initialScreeners.map((screener) => (
            <div className={styles.savedScreenerCard} key={screener.id}>
              <div className={styles.savedScreenerHeader}>
                <div>
                  <strong>{screener.name}</strong>
                  <span>{screener.sector} · {formatStatus(screener.status_filter)}</span>
                </div>
                <button
                  className={styles.inlineAction}
                  disabled={deletingId === screener.id}
                  onClick={() => handleDelete(screener.id)}
                  type="button"
                >
                  {deletingId === screener.id ? "Removing..." : "Remove"}
                </button>
              </div>
              <div className={styles.tagRow}>
                {screener.search_query && (
                  <span className={styles.tag}>query: {screener.search_query}</span>
                )}
                <span className={styles.tag}>
                  {screener.halal_only ? "Shariah Compliant only" : "all results"}
                </span>
              </div>
              {screener.notes && (
                <p className={styles.savedScreenerNotes}>{screener.notes}</p>
              )}
            </div>
          ))
        ) : (
          <p className={styles.emptyState}>
            No saved screeners yet. Create one above to build a repeatable research workflow.
          </p>
        )}
      </div>
    </div>
  );
}

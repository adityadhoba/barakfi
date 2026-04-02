"use client";

import styles from "@/app/page.module.css";
import type { ResearchNote } from "@/lib/api";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  notes: ResearchNote[];
};

export function ResearchNotePanel({ notes }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleDelete(id: number) {
    if (!confirm("Remove this research note?")) return;

    setDeletingId(id);
    setStatus("");
    setIsSuccess(false);

    try {
      const response = await fetch(`/api/research-notes/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete research note");

      setStatus("Research note removed.");
      setIsSuccess(true);
      startTransition(() => { router.refresh(); });
    } catch {
      setStatus("Unable to delete research note right now.");
      setIsSuccess(false);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={styles.simpleList}>
      {notes.length > 0 ? (
        notes.map((note) => (
          <div className={styles.orderIntentCard} key={note.id}>
            <div className={styles.orderIntentHeader}>
              <div>
                <strong>
                  {note.note_type} {note.stock.symbol}
                </strong>
                <span>
                  {note.conviction} conviction ·{" "}
                  {note.status_snapshot.toLowerCase().replaceAll("_", " ")}
                </span>
              </div>
              <button
                className={styles.inlineAction}
                disabled={deletingId === note.id}
                onClick={() => handleDelete(note.id)}
                type="button"
              >
                {deletingId === note.id ? "Removing..." : "Remove"}
              </button>
            </div>
            <p className={styles.heroText} style={{ marginTop: 8 }}>{note.summary}</p>
            {note.notes && (
              <p className={styles.savedScreenerNotes}>{note.notes}</p>
            )}
          </div>
        ))
      ) : (
        <div className="emptyStateBlock">
          <div className="emptyStateIcon" aria-hidden="true">&#x2714;</div>
          <p className="emptyStateTitle">No research notes yet</p>
          <p className="emptyStateDesc">Record your research notes to build a journal of your reasoning over time.</p>
        </div>
      )}
      {status && (
        <p className={isSuccess ? styles.formStatusSuccess : styles.formStatus} role="status" aria-live="polite">
          {status}
        </p>
      )}
    </div>
  );
}

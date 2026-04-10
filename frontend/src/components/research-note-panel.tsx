"use client";

import styles from "./research-notes.module.css";
import type { ResearchNote } from "@/lib/api";
import { screeningStatusLabel } from "@/lib/screening-status-label";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

function getTypeBadgeClass(noteType: string) {
  if (noteType === "TRIM") return styles.typeBadgeWarn;
  if (noteType === "EXIT") return styles.typeBadgeDanger;
  return styles.typeBadge;
}

function getConvictionDots(conviction: string): number {
  if (conviction === "high") return 3;
  if (conviction === "medium") return 2;
  return 1;
}

type Props = {
  notes: ResearchNote[];
};

export function ResearchNotePanel({ notes }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleDelete(id: number) {
    if (!confirm("Remove this research note?")) return;
    setDeletingId(id);

    try {
      const response = await fetch(`/api/research-notes/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete research note");
      startTransition(() => { router.refresh(); });
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  }

  if (notes.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <p className={styles.emptyTitle}>No research notes yet</p>
        <p className={styles.emptyDesc}>Record your research notes to build a journal of your reasoning over time.</p>
      </div>
    );
  }

  return (
    <div className={styles.notesList}>
      {notes.map((note) => {
        const dots = getConvictionDots(note.conviction);
        return (
          <div
            className={styles.noteCard}
            key={note.id}
            style={{ opacity: deletingId === note.id ? 0.4 : 1 }}
          >
            <div className={styles.noteHeader}>
              <div className={styles.noteHeaderLeft}>
                <span className={getTypeBadgeClass(note.note_type)}>{note.note_type}</span>
                <span className={styles.noteSymbol}>{note.stock.symbol}</span>
                <span className={styles.convictionDots} title={`${note.conviction} conviction`}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span
                      key={i}
                      className={i < dots ? styles.convictionDotFilled : styles.convictionDot}
                    />
                  ))}
                </span>
              </div>
              <button
                className={styles.deleteBtn}
                disabled={deletingId === note.id}
                onClick={() => handleDelete(note.id)}
                type="button"
              >
                {deletingId === note.id ? "Removing…" : "Remove"}
              </button>
            </div>

            <p className={styles.noteSummary}>{note.summary}</p>
            {note.notes && <p className={styles.noteBody}>{note.notes}</p>}

            <div className={styles.noteFooter}>
              <span className={styles.noteStatus}>
                {screeningStatusLabel(note.status_snapshot)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

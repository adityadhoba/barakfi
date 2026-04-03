"use client";

const STATUS_COLORS: Record<string, string> = {
  HALAL: "var(--emerald)",
  CAUTIOUS: "var(--gold)",
  NON_COMPLIANT: "var(--red)",
};

type HistoryEntry = {
  old_status: string;
  new_status: string;
  old_rating: number | null;
  new_rating: number | null;
  profile_code: string;
  changed_at: string;
};

export function ComplianceTimeline({ history }: { history: HistoryEntry[] }) {
  if (!history.length) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.85rem" }}>
        No compliance changes recorded yet.
      </div>
    );
  }

  return (
    <div style={{ position: "relative", paddingLeft: 28 }}>
      <div style={{ position: "absolute", left: 8, top: 4, bottom: 4, width: 2, background: "var(--line)", borderRadius: 1 }} />
      {history.map((entry, i) => {
        const color = STATUS_COLORS[entry.new_status] ?? "var(--text-tertiary)";
        const date = new Date(entry.changed_at);
        const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        return (
          <div key={i} style={{ position: "relative", paddingBottom: 20 }}>
            <div style={{ position: "absolute", left: -22, top: 2, width: 14, height: 14, borderRadius: "50%", background: color, border: "2px solid var(--bg-elevated)" }} />
            <div style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", marginBottom: 4 }}>{dateStr}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600, background: STATUS_COLORS[entry.old_status] ? `${STATUS_COLORS[entry.old_status]}15` : "var(--bg-soft)", color: STATUS_COLORS[entry.old_status] ?? "var(--text-secondary)" }}>
                {entry.old_status.replace("_", " ")}
              </span>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600, background: `${color}15`, color }}>
                {entry.new_status.replace("_", " ")}
              </span>
            </div>
            {entry.new_rating != null && (
              <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: 4 }}>
                Rating: {entry.old_rating ?? "?"} → {entry.new_rating}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

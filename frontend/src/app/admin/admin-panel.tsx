"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import styles from "./admin-panel.module.css";

type Tab = "overview" | "coverage" | "feedback" | "users" | "demand";

type CoverageRequest = {
  id: number;
  symbol: string;
  exchange: string;
  notes: string;
  status: "pending" | "reviewed" | "added" | "rejected" | string;
  created_at?: string | null;
  user_email?: string;
  user_name?: string;
};

type FeedbackItem = {
  id: number;
  name: string;
  email: string;
  category: string;
  message: string;
  status: "new" | "reviewed" | "closed" | string;
  admin_notes?: string | null;
  created_at?: string | null;
};

type AdminUser = {
  id: number;
  email: string;
  display_name: string;
  role?: string | null;
  is_active: boolean;
  created_at?: string | null;
};

export function AdminPanel() {
  const { getToken } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState({ users: 0, stocks: 0, pendingRequests: 0, newFeedback: 0 });
  const [coverageRequests, setCoverageRequests] = useState<CoverageRequest[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [demandAggregates, setDemandAggregates] = useState<{ event_name: string; count: number }[]>([]);
  const [demandRecent, setDemandRecent] = useState<Record<string, unknown>[]>([]);
  const [earlyAccess, setEarlyAccess] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  const apiBase = "/api";

  const fetchWithAuth = useCallback(async <T,>(path: string): Promise<T | null> => {
    const token = await getToken();
    if (!token) return null;
    const res = await fetch(`${apiBase}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  }, [getToken]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [crData, fbData, userData, evData, eaData] = await Promise.all([
        fetchWithAuth<CoverageRequest[]>("/admin/coverage-requests"),
        fetchWithAuth<FeedbackItem[]>("/admin/feedback"),
        fetchWithAuth<{ items: AdminUser[]; total: number }>("/admin/users"),
        fetchWithAuth<{ aggregates: { event_name: string; count: number }[]; recent: Record<string, unknown>[] }>("/admin/product-events"),
        fetchWithAuth<Record<string, unknown>[]>("/admin/early-access"),
      ]);
      if (crData) setCoverageRequests(crData);
      if (fbData) setFeedbackItems(fbData);
      if (userData?.items) setUsers(userData.items);
      if (evData) { setDemandAggregates(evData.aggregates || []); setDemandRecent(evData.recent || []); }
      if (eaData) setEarlyAccess(eaData);
      setStats({
        users: userData?.total ?? (userData?.items?.length || 0),
        stocks: 0,
        pendingRequests: (crData || []).filter((r) => r.status === "pending").length,
        newFeedback: (fbData || []).filter((f) => f.status === "new").length,
      });
    } catch (e) {
      console.error("Failed to load admin data", e);
    }
    setLoading(false);
  }, [fetchWithAuth]);

  useEffect(() => {
    const t = setTimeout(() => void loadData(), 0);
    return () => clearTimeout(t);
  }, [loadData]);

  async function updateCoverageStatus(id: number, status: string) {
    const token = await getToken();
    if (!token) return;
    await fetch(`${apiBase}/admin/coverage-requests/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    void loadData();
  }

  async function updateFeedbackStatus(id: number, status: string, notes?: string) {
    const token = await getToken();
    if (!token) return;
    const body: Record<string, string> = { status };
    if (notes !== undefined) body.admin_notes = notes;
    await fetch(`${apiBase}/admin/feedback/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    void loadData();
  }

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "coverage", label: "Coverage Requests", count: stats.pendingRequests },
    { key: "feedback", label: "Feedback", count: stats.newFeedback },
    { key: "users", label: "Users", count: stats.users },
    { key: "demand", label: "Demand", count: earlyAccess.length },
  ];

  return (
    <div className={styles.panel}>
      <nav className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={styles.tabBadge}>{t.count}</span>
            )}
          </button>
        ))}
      </nav>

      <div className={styles.content}>
        {loading && <div className={styles.loading}>Loading...</div>}

        {tab === "overview" && !loading && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats.users}</span>
              <span className={styles.statLabel}>Total Users</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats.pendingRequests}</span>
              <span className={styles.statLabel}>Pending Requests</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats.newFeedback}</span>
              <span className={styles.statLabel}>New Feedback</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{coverageRequests.length}</span>
              <span className={styles.statLabel}>Total Requests</span>
            </div>
          </div>
        )}

        {tab === "coverage" && !loading && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Exchange</th>
                  <th>User</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coverageRequests.map((r) => (
                  <tr key={r.id}>
                    <td className={styles.mono}>{r.symbol}</td>
                    <td>{r.exchange}</td>
                    <td>{r.user_email || r.user_name || "—"}</td>
                    <td className={styles.truncate}>{r.notes}</td>
                    <td><span className={`${styles.badge} ${styles[`badge_${r.status}`] || ""}`}>{r.status}</span></td>
                    <td className={styles.date}>{r.created_at?.split("T")[0]}</td>
                    <td className={styles.actions}>
                      {r.status === "pending" && (
                        <>
                          <button className={styles.btnApprove} onClick={() => updateCoverageStatus(r.id, "reviewed")}>Approve</button>
                          <button className={styles.btnReject} onClick={() => updateCoverageStatus(r.id, "rejected")}>Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {coverageRequests.length === 0 && (
                  <tr><td colSpan={7} className={styles.empty}>No coverage requests yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "feedback" && !loading && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Category</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {feedbackItems.map((f) => (
                  <tr key={f.id}>
                    <td>{f.name || "Anonymous"}</td>
                    <td>{f.email || "-"}</td>
                    <td><span className={styles.categoryBadge}>{f.category}</span></td>
                    <td className={styles.truncate}>{f.message}</td>
                    <td><span className={`${styles.badge} ${styles[`badge_${f.status}`] || ""}`}>{f.status}</span></td>
                    <td className={styles.date}>{f.created_at?.split("T")[0]}</td>
                    <td className={styles.actions}>
                      {f.status === "new" && (
                        <button className={styles.btnApprove} onClick={() => updateFeedbackStatus(f.id, "reviewed")}>Mark Reviewed</button>
                      )}
                      {f.status !== "closed" && (
                        <button className={styles.btnReject} onClick={() => updateFeedbackStatus(f.id, "closed")}>Close</button>
                      )}
                    </td>
                  </tr>
                ))}
                {feedbackItems.length === 0 && (
                  <tr><td colSpan={7} className={styles.empty}>No feedback yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "users" && !loading && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.display_name}</td>
                    <td>{u.email}</td>
                    <td><span className={styles.roleBadge}>{u.role}</span></td>
                    <td>{u.is_active ? "Active" : "Disabled"}</td>
                    <td className={styles.date}>{u.created_at?.split("T")[0]}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} className={styles.empty}>No users yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "demand" && !loading && (
          <>
            <h3 className={styles.sectionTitle}>Event Aggregates</h3>
            <div className={styles.statsGrid}>
              {demandAggregates.map((a) => (
                <div key={a.event_name} className={styles.statCard}>
                  <span className={styles.statValue}>{a.count}</span>
                  <span className={styles.statLabel}>{a.event_name}</span>
                </div>
              ))}
              {demandAggregates.length === 0 && <p className={styles.empty}>No events recorded yet</p>}
            </div>

            <h3 className={styles.sectionTitle} style={{ marginTop: 24 }}>Early Access Signups ({earlyAccess.length})</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Email</th><th>Name</th><th>Source</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {earlyAccess.map((r, i) => (
                    <tr key={i}>
                      <td>{String(r.email ?? "")}</td>
                      <td>{String(r.name ?? "")}</td>
                      <td>{String(r.source ?? "")}</td>
                      <td className={styles.date}>{String(r.created_at ?? "").split("T")[0]}</td>
                    </tr>
                  ))}
                  {earlyAccess.length === 0 && (
                    <tr><td colSpan={4} className={styles.empty}>No signups yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <h3 className={styles.sectionTitle} style={{ marginTop: 24 }}>Recent Events</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Event</th><th>Symbol</th><th>User</th><th>Time</th></tr>
                </thead>
                <tbody>
                  {demandRecent.slice(0, 50).map((e, i) => (
                    <tr key={i}>
                      <td>{String(e.event_name ?? "")}</td>
                      <td>{String(e.symbol ?? "—")}</td>
                      <td>{String(e.user_id ?? e.session_id ?? "anon")}</td>
                      <td className={styles.date}>{String(e.created_at ?? "").slice(0, 16)}</td>
                    </tr>
                  ))}
                  {demandRecent.length === 0 && (
                    <tr><td colSpan={4} className={styles.empty}>No events yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

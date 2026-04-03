"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import s from "./admin-panel.module.css";

interface AdminUser {
  id: number;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  current_subscription_status: string | null;
}

interface AdminRole {
  code: string;
  name: string;
  description: string;
  level: number;
}

const _ROLE_COLORS: Record<string, string> = {
  admin: "purple",
  reviewer: "gold",
  developer: "blue",
  user: "gray",
};
void _ROLE_COLORS;

const ROLE_ICONS: Record<string, string> = {
  admin: "👑",
  reviewer: "✓",
  developer: "⚙",
  user: "👤",
};

export function AdminPanel({ currentUserEmail }: { currentUserEmail: string }) {
  const { toast: showToast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    userId: number;
    userName: string;
    action: "role" | "active";
    newValue: string | boolean;
  } | null>(null);

  const fetchUsers = async (off: number = 0) => {
    try {
      const query = new URLSearchParams({
        offset: off.toString(),
        limit: limit.toString(),
      });

      // Call Next.js proxy route — avoids CORS / direct backend issues
      const response = await fetch(`/api/admin/users?${query}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.items);
      setTotal(data.total);
      setOffset(off);
    } catch (error) {
      console.error("Error fetching users:", error);
      showToast("Failed to load users", "error");
    }
  };

  const fetchRoles = async () => {
    try {
      // Call Next.js proxy route — avoids CORS / direct backend issues
      const response = await fetch("/api/admin/roles", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch roles");
      }

      const data = await response.json();
      setRoles(data.roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      showToast("Failed to load roles", "error");
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchRoles()]);
      await fetchUsers(0);
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateRole = (userId: number, userName: string, newRole: string) => {
    setConfirmDialog({
      show: true,
      userId,
      userName,
      action: "role",
      newValue: newRole,
    });
  };

  const handleToggleActive = (userId: number, userName: string, newActive: boolean) => {
    setConfirmDialog({
      show: true,
      userId,
      userName,
      action: "active",
      newValue: newActive,
    });
  };

  const confirmAction = async () => {
    if (!confirmDialog) return;

    try {
      setUpdatingUserId(confirmDialog.userId);

      if (confirmDialog.action === "role") {
        // Check if trying to demote current user
        const user = users.find((u) => u.id === confirmDialog.userId);
        if (user?.email === currentUserEmail && confirmDialog.newValue !== "admin") {
          showToast("Cannot demote your own admin role", "error");
          setConfirmDialog(null);
          setUpdatingUserId(null);
          return;
        }
      }

      const payload = confirmDialog.action === "role"
        ? { userId: confirmDialog.userId, action: "role", role: confirmDialog.newValue }
        : { userId: confirmDialog.userId, action: "active", is_active: confirmDialog.newValue };

      // Call Next.js proxy route — avoids CORS / direct backend issues
      const response = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Update failed");
      }

      // Refresh users
      await fetchUsers(offset);

      const action = confirmDialog.action === "role" ? "role updated" : "status updated";
      showToast(`User ${confirmDialog.userName} ${action}`, "success");
      setConfirmDialog(null);
    } catch (error: unknown) {
      console.error("Error updating user:", error);
      showToast(error instanceof Error ? error.message : "Failed to update user", "error");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.display_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !selectedRole || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className={s.container}>
        <div className={s.loadingState}>
          <div className={s.spinner}></div>
          <p>Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={s.container}>
      {/* Filters section */}
      <div className={s.filtersSection}>
        <div className={s.searchBox}>
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={s.searchInput}
          />
          <span className={s.searchIcon}>🔍</span>
        </div>

        <div className={s.roleFilters}>
          <button
            className={`${s.roleFilter} ${!selectedRole ? s.roleFilterActive : ""}`}
            onClick={() => setSelectedRole(null)}
          >
            All Roles
          </button>
          {roles.map((role) => (
            <button
              key={role.code}
              className={`${s.roleFilter} ${selectedRole === role.code ? s.roleFilterActive : ""} ${
                s[`roleFilter${role.code.charAt(0).toUpperCase() + role.code.slice(1)}`]
              }`}
              onClick={() => setSelectedRole(role.code)}
              title={role.description}
            >
              {ROLE_ICONS[role.code]} {role.name}
            </button>
          ))}
        </div>
      </div>

      {/* Users table */}
      <div className={s.tableWrapper}>
        {filteredUsers.length === 0 ? (
          <div className={s.emptyState}>
            <p>No users found</p>
          </div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.colName}>Name</th>
                <th className={s.colEmail}>Email</th>
                <th className={s.colRole}>Role</th>
                <th className={s.colStatus}>Status</th>
                <th className={s.colPlan}>Plan</th>
                <th className={s.colJoined}>Joined</th>
                <th className={s.colActions}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className={!user.is_active ? s.rowInactive : ""}>
                  <td className={s.colName}>
                    <div className={s.userName}>{user.display_name}</div>
                  </td>
                  <td className={s.colEmail}>
                    <code className={s.email}>{user.email}</code>
                  </td>
                  <td className={s.colRole}>
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.id, user.display_name, e.target.value)}
                      disabled={updatingUserId !== null}
                      className={`${s.roleSelect} ${s[`roleSelect${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`]}`}
                      title={ROLE_DESCRIPTIONS[user.role]}
                    >
                      {roles.map((role) => (
                        <option key={role.code} value={role.code}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={s.colStatus}>
                    <button
                      onClick={() => handleToggleActive(user.id, user.display_name, !user.is_active)}
                      disabled={updatingUserId !== null}
                      className={`${s.statusBadge} ${user.is_active ? s.statusActive : s.statusInactive}`}
                      title={user.is_active ? "Click to disable" : "Click to enable"}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className={s.colPlan}>
                    <span className={s.planBadge}>{user.current_subscription_status || "—"}</span>
                  </td>
                  <td className={s.colJoined}>
                    <time dateTime={user.created_at} className={s.dateText}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </time>
                  </td>
                  <td className={s.colActions}>
                    <button
                      className={s.actionButton}
                      onClick={() => handleToggleActive(user.id, user.display_name, !user.is_active)}
                      disabled={updatingUserId !== null}
                      title={user.is_active ? "Disable user" : "Enable user"}
                    >
                      {user.is_active ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className={s.pagination}>
          <button
            onClick={() => fetchUsers(Math.max(0, offset - limit))}
            disabled={offset === 0 || loading}
            className={s.paginationButton}
          >
            ← Previous
          </button>
          <span className={s.paginationInfo}>
            Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          <button
            onClick={() => fetchUsers(offset + limit)}
            disabled={offset + limit >= total || loading}
            className={s.paginationButton}
          >
            Next →
          </button>
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmDialog?.show && (
        <div className={s.confirmDialogOverlay} onClick={() => setConfirmDialog(null)}>
          <div className={s.confirmDialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={s.confirmTitle}>Confirm Action</h3>
            <p className={s.confirmMessage}>
              {confirmDialog.action === "role"
                ? `Change ${confirmDialog.userName}'s role to "${confirmDialog.newValue}"?`
                : `${confirmDialog.newValue ? "Enable" : "Disable"} ${confirmDialog.userName}?`}
            </p>
            <div className={s.confirmActions}>
              <button onClick={() => setConfirmDialog(null)} className={s.confirmCancel}>
                Cancel
              </button>
              <button onClick={confirmAction} className={s.confirmOk}>
                {confirmDialog.action === "role" ? "Update Role" : "Update Status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Full system access. Can manage users, roles, and all content.",
  reviewer: "Can review and approve compliance cases and overrides.",
  developer: "Can manage data sources and technical integrations.",
  user: "Standard user access to screening, portfolio, and watchlist.",
};

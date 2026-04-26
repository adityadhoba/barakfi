"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { TopbarLink } from "@/components/topbar-link";

/** Single fetch for /api/me role — shared by the top bar link and Clerk UserButton menu. */
export function useBarakfiAdminAccess(): { showAdmin: boolean; ready: boolean } {
  const { userId } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkAdmin = async () => {
      if (!userId) {
        if (!cancelled) {
          setShowAdmin(false);
          setReady(true);
        }
        return;
      }

      try {
        const response = await fetch("/api/me", { cache: "no-store" });

        if (!response.ok) {
          if (!cancelled) setShowAdmin(false);
          return;
        }

        const user = await response.json();
        const r = String(user.role ?? "")
          .trim()
          .toLowerCase();
        if (!cancelled) setShowAdmin(r === "admin" || r === "owner");
      } catch (error) {
        console.error("Failed to check admin status:", error);
        if (!cancelled) setShowAdmin(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void checkAdmin();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { showAdmin, ready };
}

export function AdminLink() {
  const { showAdmin, ready } = useBarakfiAdminAccess();

  if (!ready || !showAdmin) {
    return null;
  }

  return <TopbarLink href="/admin" label="Admin" />;
}

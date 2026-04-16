"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { TopbarLink } from "@/components/topbar-link";

export function AdminLink() {
  const { userId } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!userId) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Call Next.js proxy route (server-side) — avoids CORS / direct backend issues
        const response = await fetch("/api/me", { cache: "no-store" });

        if (!response.ok) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const user = await response.json();
        setIsAdmin(["admin", "owner"].includes(user.role ?? ""));
      } catch (error) {
        console.error("Failed to check admin status:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [userId]);

  if (loading || !isAdmin) {
    return null;
  }

  return <TopbarLink href="/admin" label="Admin" />;
}

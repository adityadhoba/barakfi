"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { TopbarLink } from "@/components/topbar-link";

export function AdminLink() {
  const { userId } = useAuth();
  const [canViewAdmin, setCanViewAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!userId) {
        setCanViewAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Call Next.js proxy route (server-side) — avoids CORS / direct backend issues
        const response = await fetch("/api/me", { cache: "no-store" });

        if (!response.ok) {
          setCanViewAdmin(false);
          setLoading(false);
          return;
        }

        const user = await response.json();
        setCanViewAdmin(user.role === "admin" || user.role === "owner");
      } catch (error) {
        console.error("Failed to check admin status:", error);
        setCanViewAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [userId]);

  if (loading || !canViewAdmin) {
    return null;
  }

  return <TopbarLink href="/admin" label="Admin" />;
}

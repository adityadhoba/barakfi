"use client";

import { TopbarPrimaryNav } from "@/components/topbar-primary-nav";
import { ThemeToggle } from "@/components/theme-toggle";

/** Shown while the Clerk-backed `TopbarAuth` chunk loads (desktop only in layout). */
export function TopbarAuthFallback() {
  return (
    <div className="topbarActions">
      <TopbarPrimaryNav />
      <ThemeToggle />
    </div>
  );
}

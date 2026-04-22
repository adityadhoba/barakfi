"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { TopbarPrimaryNav } from "@/components/topbar-primary-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminLink } from "@/components/admin-link";

/**
 * Client-only top bar auth so the root layout does not call auth() on the server.
 * Avoids Clerk "auth() was called but clerkMiddleware() not detected" 500s on API routes.
 */
export function TopbarAuth() {
  const { isLoaded, userId } = useAuth();

  return (
    <div className="topbarActions">
      {!isLoaded ? (
        <>
          <TopbarPrimaryNav />
          <ThemeToggle />
        </>
      ) : !userId ? (
        <>
          <TopbarPrimaryNav />
          <Link className="ghostButtonLink" href="/sign-in">
            Log in
          </Link>
          <Link className="solidButtonLink" href="/sign-up">
            Get started
          </Link>
          <ThemeToggle />
        </>
      ) : (
        <>
          <TopbarPrimaryNav />
          <AdminLink />
          <UserButton
            appearance={{
              elements: {
                avatarBox: { width: 30, height: 30 },
              },
            }}
          />
          <ThemeToggle />
        </>
      )}
    </div>
  );
}

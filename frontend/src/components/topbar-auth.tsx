"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { TopbarPrimaryNav } from "@/components/topbar-primary-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { useBarakfiAdminAccess } from "@/components/admin-link";
import { TopbarLink } from "@/components/topbar-link";

function AdminMenuIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
    </svg>
  );
}

/**
 * Client-only top bar auth so the root layout does not call auth() on the server.
 * Avoids Clerk "auth() was called but clerkMiddleware() not detected" 500s on API routes.
 */
export function TopbarAuth() {
  const { isLoaded, userId } = useAuth();
  const { showAdmin, ready: adminReady } = useBarakfiAdminAccess();

  return (
    <div className="topbarActions">
      {!isLoaded ? (
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
          {adminReady && showAdmin ? <TopbarLink href="/admin" label="Admin" /> : null}
          <UserButton
            appearance={{
              elements: {
                avatarBox: { width: 30, height: 30 },
              },
            }}
          >
            {adminReady && showAdmin ? (
              <UserButton.MenuItems>
                <UserButton.Link label="Admin" labelIcon={<AdminMenuIcon />} href="/admin" />
              </UserButton.MenuItems>
            ) : null}
          </UserButton>
          <ThemeToggle />
        </>
      )}
    </div>
  );
}

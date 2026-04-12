"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { TopbarLink } from "@/components/topbar-link";
import { TopbarDropdown } from "@/components/topbar-dropdown";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminLink } from "@/components/admin-link";

function PrimaryNav() {
  return (
    <nav className="topbarNav" aria-label="Primary navigation">
      <TopbarLink href="/screener" label="Screener" />
      <TopbarDropdown
        label="Explore"
        basePath="/collections"
        items={[
          { href: "/collections", label: "Collections" },
          { href: "/halal-stocks", label: "Halal stocks" },
          { href: "/learn", label: "Learn" },
          { href: "/super-investors", label: "Super Investors" },
          { href: "/academy", label: "Academy" },
        ]}
      />
      <TopbarDropdown
        label="Tools"
        basePath="/tools"
        items={[
          { href: "/tools/purification", label: "Purification Calculator" },
          { href: "/tools/zakat", label: "Zakat Calculator" },
          { href: "/compare", label: "Compare Stocks" },
          { href: "/request-coverage", label: "Request Coverage" },
        ]}
      />
      <TopbarLink href="/watchlist" label="Watchlist" className="ghostLink topbarWatchlistLink" />
    </nav>
  );
}

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
          <PrimaryNav />
          <ThemeToggle />
        </>
      ) : !userId ? (
        <>
          <PrimaryNav />
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
          <PrimaryNav />
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

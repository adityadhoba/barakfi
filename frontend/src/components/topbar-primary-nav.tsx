"use client";

import { TopbarLink } from "@/components/topbar-link";
import { TopbarDropdown } from "@/components/topbar-dropdown";

/** Desktop top bar links — no Clerk; safe to load before auth chunk. */
export function TopbarPrimaryNav() {
  return (
    <nav className="topbarNav" aria-label="Primary navigation">
      <TopbarLink href="/screener" label="Screener" />
      <TopbarDropdown
        label="Explore"
        basePath="/explore"
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

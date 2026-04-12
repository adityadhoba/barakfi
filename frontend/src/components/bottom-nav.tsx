"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useMobileNav } from "@/components/mobile-nav-context";

const TABS = [
  { href: "/", label: "Home", icon: "\u2302", match: (p: string) => p === "/" },
  { href: "/screener", label: "Stocks", icon: "\u2315", match: (p: string) => p.startsWith("/screener") || p.startsWith("/stocks") },
  {
    href: "/watchlist",
    label: "Watchlist",
    icon: "\u2606",
    match: (p: string) => p.startsWith("/watchlist"),
    guestHref: "/sign-in?redirect_url=/watchlist",
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { userId } = useAuth();
  const { open } = useMobileNav();

  return (
    <nav className="bottomNav" aria-label="Main navigation">
      {TABS.map((tab) => {
        const href = "guestHref" in tab && !userId ? tab.guestHref : tab.href;
        const active = tab.match(pathname);
        return (
          <Link
            className={`bottomNavItem ${active ? "bottomNavItemActive" : ""}`}
            href={href}
            key={tab.label}
          >
            <span className="bottomNavIcon" aria-hidden>{tab.icon}</span>
            <span className="bottomNavLabel">{tab.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        className={`bottomNavItem ${pathname.startsWith("/compare") || pathname.startsWith("/tools") ? "bottomNavItemActive" : ""}`}
        onClick={open}
        aria-label="Open menu for Compare, Tools, and more"
      >
        <span className="bottomNavIcon" aria-hidden>{"\u2630"}</span>
        <span className="bottomNavLabel">More</span>
      </button>
    </nav>
  );
}

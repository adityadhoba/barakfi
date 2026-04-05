"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  HiOutlineChartBarSquare,
  HiOutlineHome,
  HiOutlineMagnifyingGlass,
  HiOutlineStar,
  HiOutlineUserCircle,
} from "react-icons/hi2";

type TabDef = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  match: (p: string) => boolean;
  guestHref?: string;
};

const TABS: TabDef[] = [
  {
    href: "/",
    label: "Home",
    icon: HiOutlineHome,
    match: (p) => p === "/",
  },
  {
    href: "/screener",
    label: "Screener",
    icon: HiOutlineMagnifyingGlass,
    match: (p) => p.startsWith("/screener") || p.startsWith("/stocks"),
  },
  {
    href: "/watchlist",
    label: "Watchlist",
    icon: HiOutlineStar,
    match: (p) => p.startsWith("/watchlist"),
    guestHref: "/sign-in?redirect_url=/watchlist",
  },
  {
    href: "/workspace",
    label: "Portfolio",
    icon: HiOutlineChartBarSquare,
    match: (p) => p.startsWith("/workspace"),
    guestHref: "/sign-in?redirect_url=/workspace",
  },
  {
    href: "/account",
    label: "Profile",
    icon: HiOutlineUserCircle,
    match: (p) => p.startsWith("/account"),
    guestHref: "/sign-in?redirect_url=/account",
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { userId } = useAuth();

  return (
    <nav className="bottomNav" aria-label="Main navigation">
      {TABS.map((tab) => {
        const href = tab.guestHref && !userId ? tab.guestHref : tab.href;
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <Link
            className={`bottomNavItem ${active ? "bottomNavItemActive" : ""}`}
            href={href}
            key={tab.href}
          >
            <span className="bottomNavIcon" aria-hidden>
              <Icon />
            </span>
            <span className="bottomNavLabel">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { TopbarLink } from "@/components/topbar-link";
import s from "./mobile-drawer.module.css";

type DrawerLink = {
  href: string;
  label: string;
  icon: string;
  auth?: boolean;
  adminOnly?: boolean;
};

const DRAWER_LINKS: DrawerLink[] = [
  { href: "/", label: "Home", icon: "\u2302" },
  { href: "/screener", label: "Screener", icon: "\u2315" },
  { href: "/compare", label: "Compare", icon: "\u229E" },
  { href: "/watchlist", label: "Watchlist", icon: "\u2606", auth: true },
  { href: "/workspace", label: "Portfolio", icon: "\u25A6", auth: true },
  { href: "/admin", label: "Admin", icon: "\u26A0", auth: true, adminOnly: true },
];

export function MobileDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const pathname = usePathname();
  const { userId } = useAuth();
  const { user } = useUser();

  // Fetch user role via Next.js proxy (avoids CORS / direct backend issues)
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        if (!userId) {
          setLoadingRole(false);
          return;
        }

        const response = await fetch("/api/me", { cache: "no-store" });

        if (!response.ok) {
          setLoadingRole(false);
          return;
        }

        const userData = await response.json();
        setUserRole(userData.role);
      } catch (error) {
        console.error("Failed to fetch user role:", error);
      } finally {
        setLoadingRole(false);
      }
    };

    fetchUserRole();
  }, [userId]);

  // Close drawer when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      return () => {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      };
    }
  }, [isOpen]);

  return (
    <>
      {/* Hamburger button (mobile only) */}
      <button
        className={s.hamburger}
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
      >
        <span className={s.hamburgerIcon}>☰</span>
      </button>

      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className={s.backdrop}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <nav
        className={`${s.drawer} ${isOpen ? s.drawerOpen : ""}`}
        aria-label="Mobile navigation"
      >
        <div className={s.drawerHeader}>
          <h2 className={s.drawerTitle}>Menu</h2>
          <button
            className={s.closeButton}
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation menu"
          >
            <span className={s.closeIcon}>✕</span>
          </button>
        </div>

        {/* User avatar section */}
        {userId && user && (
          <div className={s.userSection}>
            {user.imageUrl && (
              <img
                src={user.imageUrl}
                alt={user.firstName || "User"}
                className={s.userAvatar}
              />
            )}
            <div className={s.userInfo}>
              <div className={s.userName}>
                {user.firstName} {user.lastName}
              </div>
              <div className={s.userEmail}>{user.primaryEmailAddress?.emailAddress}</div>
            </div>
          </div>
        )}

        {/* Navigation links */}
        <div className={s.drawerLinks}>
          {DRAWER_LINKS.map((link) => {
            // Skip auth-required links if not signed in
            if (link.auth && !userId) return null;

            // Skip admin-only links if not admin
            if (link.adminOnly && (!userRole || userRole !== "admin" || loadingRole)) {
              return null;
            }

            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${s.drawerLink} ${isActive ? s.drawerLinkActive : ""}`}
                onClick={() => setIsOpen(false)}
              >
                <span className={s.drawerLinkIcon} aria-hidden="true">
                  {link.icon}
                </span>
                <span className={s.drawerLinkLabel}>{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Legal links */}
        <div className={s.drawerLegal}>
          <Link href="/terms" className={s.drawerLegalLink}>Terms</Link>
          <Link href="/privacy" className={s.drawerLegalLink}>Privacy</Link>
          <Link href="/disclaimer" className={s.drawerLegalLink}>Disclaimer</Link>
          <Link href="/shariah-compliance" className={s.drawerLegalLink}>Shariah</Link>
        </div>

        {/* Theme toggle */}
        <div className={s.drawerFooter}>
          <div className={s.themeToggleWrapper}>
            <span className={s.themeLabel}>Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </>
  );
}

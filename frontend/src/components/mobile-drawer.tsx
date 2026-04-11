"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { useMobileNav } from "@/components/mobile-nav-context";
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
  { href: "/screener", label: "Stocks", icon: "\u2315" },
  { href: "/compare", label: "Compare", icon: "\u229E" },
  { href: "/watchlist", label: "Watchlist", icon: "\u2606", auth: true },
  { href: "/news", label: "News", icon: "\u25A6" },
  { href: "/admin", label: "Admin", icon: "\u26A0", auth: true, adminOnly: true },
];

export function MobileDrawer() {
  const { isOpen, setOpen } = useMobileNav();
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
    setOpen(false);
  }, [pathname, setOpen]);

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
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
      >
        <span className={s.hamburgerIcon}>☰</span>
      </button>

      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className={s.backdrop}
          onClick={() => setOpen(false)}
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
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
          >
            <span className={s.closeIcon}>✕</span>
          </button>
        </div>

        {!userId && (
          <div className={s.drawerAuthRow}>
            <Link href="/sign-in" className={s.drawerAuthPrimary} onClick={() => setOpen(false)}>
              Log in
            </Link>
            <Link href="/sign-up" className={s.drawerAuthSecondary} onClick={() => setOpen(false)}>
              Get started
            </Link>
          </div>
        )}

        {/* User avatar section */}
        {userId && user && (
          <div className={s.userSection}>
            {user.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- Clerk-hosted avatar URL
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
                onClick={() => setOpen(false)}
              >
                <span className={s.drawerLinkIcon} aria-hidden="true">
                  {link.icon}
                </span>
                <span className={s.drawerLinkLabel}>{link.label}</span>
              </Link>
            );
          })}
          {userId && (
            <Link
              href="/account"
              className={`${s.drawerLink} ${pathname.startsWith("/account") ? s.drawerLinkActive : ""}`}
              onClick={() => setOpen(false)}
            >
              <span className={s.drawerLinkIcon} aria-hidden="true">
                &#x2699;
              </span>
              <span className={s.drawerLinkLabel}>Account</span>
            </Link>
          )}
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

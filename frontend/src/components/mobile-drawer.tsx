"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { useMobileNav } from "@/components/mobile-nav-context";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
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
  { href: "/learn", label: "Learn", icon: "\u2728" },
  { href: "/admin", label: "Admin", icon: "\u26A0", auth: true, adminOnly: true },
];

export function MobileDrawer() {
  const { isOpen, setOpen } = useMobileNav();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const pathname = usePathname();
  const { userId } = useAuth();
  const { user } = useUser();

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

    void fetchUserRole();
  }, [userId]);

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <>
      <button
        className={s.hamburger}
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        type="button"
      >
        <span className={s.hamburgerIcon}>☰</span>
      </button>

      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
          <SheetHeader className="border-b border-[var(--line)] px-6 py-4 text-left">
            <SheetTitle className="text-base font-semibold">Menu</SheetTitle>
          </SheetHeader>

          <div className="flex flex-1 flex-col px-4 py-4">
            {!userId && (
              <div className={cn(s.drawerAuthRow, "mb-4")}>
                <Link href="/sign-in" className={s.drawerAuthPrimary} onClick={() => setOpen(false)}>
                  Log in
                </Link>
                <Link href="/sign-up" className={s.drawerAuthSecondary} onClick={() => setOpen(false)}>
                  Get started
                </Link>
              </div>
            )}

            {userId && user && (
              <div className={cn(s.userSection, "mb-4")}>
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

            <nav className={cn(s.drawerLinks, "flex flex-col gap-1")} aria-label="Mobile navigation">
              {DRAWER_LINKS.map((link) => {
                if (link.auth && !userId) return null;

                if (link.adminOnly && (loadingRole || (userRole !== "admin" && userRole !== "owner"))) {
                  return null;
                }

                const isActive =
                  link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

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
            </nav>

            <div className={cn(s.drawerLegal, "mt-auto border-t border-[var(--line)] pt-4")}>
              <Link href="/terms" className={s.drawerLegalLink}>
                Terms
              </Link>
              <Link href="/privacy" className={s.drawerLegalLink}>
                Privacy
              </Link>
              <Link href="/disclaimer" className={s.drawerLegalLink}>
                Disclaimer
              </Link>
              <Link href="/shariah-compliance" className={s.drawerLegalLink}>
                Shariah
              </Link>
            </div>

            <div className={cn(s.drawerFooter, "mt-4 border-t border-[var(--line)] pt-4")}>
              <div className={s.themeToggleWrapper}>
                <span className={s.themeLabel}>Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

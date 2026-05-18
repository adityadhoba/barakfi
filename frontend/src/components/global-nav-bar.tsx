"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RouteLocalAuth } from "@/components/route-local-auth";
import styles from "./global-nav-bar.module.css";

const NAV_LINKS = [
  { href: "/screener", label: "Screener" },
  { href: "/explore", label: "Explore" },
  { href: "/compare", label: "Compare" },
  { href: "/tools", label: "Tools" },
  { href: "/watchlist", label: "Watchlist" },
];

export function GlobalNavBar() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <Link className={styles.logo} href="/">
        Barak<span className={styles.logoAccent}>Fi</span>
      </Link>

      <div className={styles.navRight}>
        <div className={styles.navLinks}>
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
                href={link.href}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <RouteLocalAuth
          className={styles.navAuth}
          ghostClassName={`${styles.navLink} ${styles.navAuthGhost}`}
          primaryClassName={styles.navAuthPrimary}
          userClassName={styles.navUser}
        />
      </div>
    </nav>
  );
}

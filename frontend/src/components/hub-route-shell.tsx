"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RouteLocalAuth } from "@/components/route-local-auth";
import styles from "@/app/hub-shell.module.css";

const NAV_LINKS = [
  { href: "/screener", label: "Screener" },
  { href: "/explore", label: "Explore" },
  { href: "/tools", label: "Tools" },
  { href: "/watchlist", label: "Watchlist" },
] as const;

export function HubRouteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main className={styles.pageShell}>
      <nav className={styles.localNav} aria-label="Hub navigation">
        <Link className={styles.localLogo} href="/">
          <span className={styles.logoBadge}>B</span>
          <span className={styles.localLogoWordmark}>
            Barak<span className={styles.localLogoAccent}>Fi</span>
          </span>
        </Link>

        <div className={styles.localNavRight}>
          <div className={styles.localNavLinks}>
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles.localNavLink} ${active ? styles.localNavLinkActive : ""}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <RouteLocalAuth
            className={styles.localNavAuth}
            ghostClassName={`${styles.localNavLink} ${styles.localNavAuthGhost}`}
            primaryClassName={`${styles.localNavLink} ${styles.localNavAuthPrimary}`}
            userClassName={styles.localNavUser}
          />
        </div>
      </nav>

      {children}
    </main>
  );
}

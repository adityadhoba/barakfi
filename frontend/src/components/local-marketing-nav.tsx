"use client";

import Link from "next/link";
import { DM_Serif_Display } from "next/font/google";
import { RouteLocalAuth } from "@/components/route-local-auth";
import styles from "./local-marketing-nav.module.css";

const serif = DM_Serif_Display({ subsets: ["latin"], weight: "400" });

type Item = {
  href: string;
  label: string;
};

const DEFAULT_ITEMS: Item[] = [
  { href: "/screener", label: "Screener" },
  { href: "/explore", label: "Explore" },
  { href: "/tools", label: "Tools" },
  { href: "/watchlist", label: "Watchlist" },
];

export function LocalMarketingNav({
  activeHref,
  items = DEFAULT_ITEMS,
  activeAuth,
}: {
  activeHref?: string;
  items?: Item[];
  activeAuth?: "sign-in" | "sign-up";
}) {
  return (
    <nav className={styles.nav} aria-label="Marketing navigation">
      <Link href="/" className={`${styles.logo} ${serif.className}`}>
        Barak<span className={styles.logoAccent}>Fi</span>
      </Link>
      <div className={styles.navRight}>
        <div className={styles.navLinks}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={activeHref === item.href ? styles.activeLink : undefined}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <RouteLocalAuth
          className={styles.navAuth}
          ghostClassName={`${styles.navLink} ${styles.navAuthGhost}`}
          primaryClassName={`${styles.navLink} ${styles.navAuthPrimary}`}
          ghostActiveClassName={styles.navAuthGhostActive}
          primaryActiveClassName={styles.navAuthPrimaryActive}
          activeAuth={activeAuth}
          userClassName={styles.navUser}
        />
      </div>
    </nav>
  );
}

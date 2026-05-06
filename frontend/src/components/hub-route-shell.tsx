"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RouteLocalAuth } from "@/components/route-local-auth";
import styles from "@/app/hub-shell.module.css";

const FALLBACK_TICKER = [
  { name: "NIFTY 50", value: "23,842.75", change: "+0.54%", positive: true },
  { name: "SENSEX", value: "78,553.20", change: "+0.54%", positive: true },
  { name: "NIFTY BANK", value: "51,236.80", change: "-0.17%", positive: false },
  { name: "NIFTY IT", value: "33,156.40", change: "+0.75%", positive: true },
  { name: "NIFTY PHARMA", value: "19,872.35", change: "+0.28%", positive: true },
  { name: "NIFTY AUTO", value: "23,145.90", change: "-0.48%", positive: false },
  { name: "NIFTY FMCG", value: "56,234.15", change: "+0.32%", positive: true },
  { name: "INDIA VIX", value: "13.42", change: "-2.75%", positive: false },
] as const;

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
      <div className={styles.localTicker} aria-label="Market ticker">
        <div className={styles.localTickerTrack}>
          {[...FALLBACK_TICKER, ...FALLBACK_TICKER].map((item, index) => (
            <span className={styles.localTickerItem} key={`${item.name}-${index}`}>
              <b>{item.name}</b>
              {item.value}
              <span className={item.positive ? styles.tickerUp : styles.tickerDown}>{item.change}</span>
            </span>
          ))}
        </div>
      </div>

      <nav className={styles.localNav} aria-label="Hub navigation">
        <Link className={styles.localLogo} href="/">
          <span className={styles.logoBadge}>B</span>
          <span>
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

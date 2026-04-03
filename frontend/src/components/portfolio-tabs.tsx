"use client";

import { useState } from "react";
import styles from "./portfolio-tabs.module.css";

type Tab = "stocks" | "mutual_funds" | "gold";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "stocks", label: "Stocks", icon: "\u{1F4C8}" },
  { id: "mutual_funds", label: "Mutual Funds", icon: "\u{1F3E6}" },
  { id: "gold", label: "Gold", icon: "\u{1F947}" },
];

type Props = {
  children: React.ReactNode;
};

export function PortfolioTabs({ children }: Props) {
  const [active, setActive] = useState<Tab>("stocks");

  return (
    <div className={styles.container}>
      <div className={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tab} ${active === tab.id ? styles.tabActive : ""}`}
            onClick={() => setActive(tab.id)}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {active === "stocks" && children}
        {active === "mutual_funds" && (
          <div className={styles.comingSoon}>
            <span className={styles.comingSoonIcon}>{"\u{1F3E6}"}</span>
            <h3 className={styles.comingSoonTitle}>Mutual Funds</h3>
            <p className={styles.comingSoonDesc}>
              Shariah-screened mutual fund tracking is coming soon. We&apos;re building tools to screen and
              track halal mutual fund schemes available in India.
            </p>
            <span className={styles.comingSoonBadge}>Coming Soon</span>
          </div>
        )}
        {active === "gold" && (
          <div className={styles.comingSoon}>
            <span className={styles.comingSoonIcon}>{"\u{1F947}"}</span>
            <h3 className={styles.comingSoonTitle}>Gold &amp; Commodities</h3>
            <p className={styles.comingSoonDesc}>
              Track your gold holdings alongside stocks. Sovereign Gold Bonds, Digital Gold,
              and physical gold tracking &mdash; all in one place.
            </p>
            <span className={styles.comingSoonBadge}>Coming Soon</span>
          </div>
        )}
      </div>
    </div>
  );
}

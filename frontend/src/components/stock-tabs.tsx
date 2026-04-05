"use client";

import { useState } from "react";
import styles from "./stock-tabs.module.css";

type Tab = {
  id: string;
  label: string;
  icon: string;
};

const TABS: Tab[] = [
  { id: "compliance", label: "Overview", icon: "\u25CB" },
  { id: "financials", label: "Financials", icon: "\u25A6" },
  { id: "research", label: "Research", icon: "\u22EF" },
  { id: "actions", label: "Actions", icon: "\u2606" },
];

type Props = {
  children: React.ReactNode[];
  /** Shown above tabs on small screens (e.g. symbol + live price) */
  stickySummary?: React.ReactNode;
};

export function StockTabs({ children, stickySummary }: Props) {
  const [active, setActive] = useState("compliance");

  return (
    <div className={styles.tabContainer}>
      {stickySummary ? <div className={styles.mobileStickySummary}>{stickySummary}</div> : null}
      <div className={styles.tabBar} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active === tab.id}
            className={`${styles.tab} ${active === tab.id ? styles.tabActive : ""}`}
            onClick={() => setActive(tab.id)}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.tabPanel} role="tabpanel">
        {children[TABS.findIndex((t) => t.id === active)] || children[0]}
      </div>
    </div>
  );
}

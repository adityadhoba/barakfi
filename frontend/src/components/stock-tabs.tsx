"use client";

import { useState } from "react";
import styles from "./stock-tabs.module.css";

type Tab = {
  id: string;
  label: string;
  icon: string;
};

const TABS: Tab[] = [
  { id: "compliance", label: "Compliance", icon: "\u2713" },
  { id: "financials", label: "Financials", icon: "\u25A6" },
  { id: "research", label: "Research", icon: "\u22EF" },
  { id: "actions", label: "Actions", icon: "\u25B6" },
];

type Props = {
  children: React.ReactNode[];
};

export function StockTabs({ children }: Props) {
  const [active, setActive] = useState("compliance");

  return (
    <div className={styles.tabContainer}>
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
      <div className={styles.tabPanel} role="tabpanel" key={active}>
        {children[TABS.findIndex((t) => t.id === active)] || children[0]}
      </div>
    </div>
  );
}

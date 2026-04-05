"use client";

import { useState } from "react";
import {
  HiOutlineBuildingLibrary,
  HiOutlineChartBar,
  HiOutlineSparkles,
} from "react-icons/hi2";
import styles from "./portfolio-tabs.module.css";

type Tab = "stocks" | "mutual_funds" | "gold";

const TABS: { id: Tab; label: string }[] = [
  { id: "stocks", label: "Stocks" },
  { id: "mutual_funds", label: "Mutual Funds" },
  { id: "gold", label: "Gold" },
];

type Props = {
  children: React.ReactNode;
};

export function PortfolioTabs({ children }: Props) {
  const [active, setActive] = useState<Tab>("stocks");

  return (
    <div className={styles.container}>
      <div className={styles.tabBar} role="tablist" aria-label="Portfolio asset class">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            className={`${styles.tab} ${active === tab.id ? styles.tabActive : ""}`}
            onClick={() => setActive(tab.id)}
          >
            <span className={styles.tabIcon} aria-hidden>
              {tab.id === "stocks" && <HiOutlineChartBar size={18} strokeWidth={1.75} />}
              {tab.id === "mutual_funds" && <HiOutlineBuildingLibrary size={18} strokeWidth={1.75} />}
              {tab.id === "gold" && <HiOutlineSparkles size={18} strokeWidth={1.75} />}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {active === "stocks" && children}
        {active === "mutual_funds" && (
          <div className={styles.mfPanel}>
            <h3 className={styles.mfTitle}>Mutual funds on Barakfi</h3>
            <p className={styles.mfDesc}>
              Full CAS import and Shariah screening for mutual funds are on our roadmap. For now you can
              access your consolidated statement and holdings through India&apos;s official consolidated
              account statement services.
            </p>
            <ul className={styles.mfLinks}>
              <li>
                <a href="https://www.mfcentral.com/" target="_blank" rel="noopener noreferrer">
                  MF Central
                </a>
                <span className={styles.mfHint}> — official CAS / KYC-linked portfolio view (opens in a new tab)</span>
              </li>
              <li>
                <a href="https://mfapis.in/" target="_blank" rel="noopener noreferrer">
                  MFAPIs.in
                </a>
                <span className={styles.mfHint}> — free mutual fund data API (for developers)</span>
              </li>
              <li>
                <a href="https://www.tarrakki.com/" target="_blank" rel="noopener noreferrer">
                  Tarrakki
                </a>
                <span className={styles.mfHint}> — mutual fund platform (check their API / partnership terms)</span>
              </li>
            </ul>
            <p className={styles.mfFootnote}>
              When we integrate a provider, your data will stay encrypted and you&apos;ll choose what to sync.
            </p>
          </div>
        )}
        {active === "gold" && (
          <div className={styles.comingSoon}>
            <span className={styles.comingSoonIcon} aria-hidden>
              <HiOutlineSparkles size={40} strokeWidth={1.5} />
            </span>
            <h3 className={styles.comingSoonTitle}>Gold &amp; Commodities</h3>
            <p className={styles.comingSoonDesc}>
              Track your gold holdings alongside stocks. Sovereign Gold Bonds, Digital Gold,
              and physical gold tracking — all in one place.
            </p>
            <span className={styles.comingSoonBadge}>Coming Soon</span>
          </div>
        )}
      </div>
    </div>
  );
}

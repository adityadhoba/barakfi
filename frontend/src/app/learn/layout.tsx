"use client";

import { DM_Serif_Display, Inter } from "next/font/google";
import { GlobalMarketTicker } from "@/components/global-market-ticker";
import { GlobalNavBar } from "@/components/global-nav-bar";
import styles from "./learn.module.css";

const learnSans = Inter({ subsets: ["latin"] });
const learnDisplay = DM_Serif_Display({ subsets: ["latin"], weight: "400" });

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${styles.layoutPage} ${learnSans.className} ${learnDisplay.className}`}>
      {/* Market Ticker */}
      <GlobalMarketTicker />

      {/* Global Navigation Bar */}
      <GlobalNavBar />

      {/* Content */}
      <div className={styles.learnContent}>
        {children}
      </div>
    </div>
  );
}

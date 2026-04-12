"use client";

import styles from "@/app/screener.module.css";
import type { Stock, ScreeningResult } from "@/lib/api";

type ScreenedStock = Stock & { screening: ScreeningResult };

type Props = {
  screenedStocks: ScreenedStock[];
  activeStatus: string;
  onStatusChange: (status: string) => void;
};

export function MarketOverview({ screenedStocks, activeStatus, onStatusChange }: Props) {
  const total = screenedStocks.length;
  const halal = screenedStocks.filter((s) => s.screening.status === "HALAL").length;
  const review = screenedStocks.filter((s) => s.screening.status === "CAUTIOUS").length;
  const fail = total - halal - review;
  const compliancePct = total > 0 ? Math.round((halal / total) * 100) : 0;

  const stats = [
    { key: "all", label: "All Stocks", value: total, sub: `${compliancePct}% compliant`, className: "" },
    { key: "HALAL", label: "Halal", value: halal, sub: "safe to invest", className: styles.statsChipHalal },
    { key: "CAUTIOUS", label: "Doubtful", value: review, sub: "needs checking", className: styles.statsChipReview },
    { key: "NON_COMPLIANT", label: "Haram", value: fail, sub: "non-compliant", className: styles.statsChipFail },
  ];

  return (
    <div className={styles.statsStrip}>
      {stats.map((s) => (
        <button
          key={s.key}
          type="button"
          className={`${styles.statsChip} ${s.className} ${activeStatus === s.key ? styles.statsChipActive : ""}`}
          onClick={() => onStatusChange(activeStatus === s.key ? "all" : s.key)}
          aria-pressed={activeStatus === s.key}
        >
          <span className={styles.statsChipValue}>{s.value}</span>
          <span className={styles.statsChipLabel}>{s.label}</span>
        </button>
      ))}
    </div>
  );
}

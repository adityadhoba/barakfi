"use client";

import { useCallback, useState } from "react";
import { StockDetailTablesCollapsible } from "@/components/stock-detail-tables-collapsible";
import { StockCheckResultActions } from "@/components/stock-check-result-actions";
import type {
  StockDetailMethodologyRow,
  StockDetailRatioRow,
} from "@/components/stock-detail-tables-collapsible";
import styles from "./stock-check-result-panel.module.css";

type CheckPayload = {
  name: string;
  status: string;
  score: number;
  summary: string;
  details_available: boolean;
};

type Props = {
  check: CheckPayload;
  symbol: string;
  detailsAvailable: boolean;
  ratioRows: StockDetailRatioRow[];
  methodologyCaption: string | null;
  methodologyRows: StockDetailMethodologyRow[] | null;
};

function badgeClass(status: string): string {
  if (status === "Halal") return styles.badgeHalal;
  if (status === "Haram") return styles.badgeHaram;
  return styles.badgeDoubt;
}

export function StockCheckResultPanel({
  check,
  symbol,
  detailsAvailable,
  ratioRows,
  methodologyCaption,
  methodologyRows,
}: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const openDetails = useCallback(() => {
    setDetailsOpen(true);
    requestAnimationFrame(() => {
      document.getElementById("check-stock-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return (
    <>
      <div className={styles.heroCard}>
        <h1 className={styles.name}>{check.name}</h1>
        <div className={`${styles.badge} ${badgeClass(check.status)}`}>{check.status}</div>
        <div className={styles.scoreBlock}>
          <span className={styles.score}>{check.score}</span>
          <span className={styles.scoreOutOf}>/ 100</span>
        </div>
        <p className={styles.summary}>{check.summary}</p>
        {!detailsAvailable ? (
          <p className={styles.detailsNote}>Some fundamentals are missing — this score is indicative.</p>
        ) : null}

        <StockCheckResultActions
          symbol={symbol}
          name={check.name}
          score={check.score}
          status={check.status}
          onViewDetails={openDetails}
        />
      </div>

      <div className={styles.detailsBelow}>
        <StockDetailTablesCollapsible
          id="check-stock-details"
          ratioRows={ratioRows}
          methodologyCaption={methodologyCaption}
          methodologyRows={methodologyRows}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
      </div>
    </>
  );
}

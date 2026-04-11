"use client";

import { useCallback, useState } from "react";
import { StockCheckDetailsExpand } from "@/components/stock-check-details-expand";
import { StockCheckResultActions } from "@/components/stock-check-result-actions";
import type { CheckMethodologyPassRow, CheckSimpleRatioRow } from "@/lib/stock-detail-screening-tables";
import styles from "./stock-check-result-panel.module.css";

type Props = {
  name: string;
  symbol: string;
  status: string;
  score: number;
  summary: string;
  detailsAvailable: boolean;
  simpleRatioRows: CheckSimpleRatioRow[];
  methodologyPassRows: CheckMethodologyPassRow[];
  reasons: string[];
};

function badgeClass(status: string): string {
  if (status === "Halal") return styles.badgeHalal;
  if (status === "Haram") return styles.badgeHaram;
  return styles.badgeDoubt;
}

export function StockCheckResultPanel({
  name,
  symbol,
  status,
  score,
  summary,
  detailsAvailable,
  simpleRatioRows,
  methodologyPassRows,
  reasons,
}: Props) {
  const [detailsMounted, setDetailsMounted] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const openDetails = useCallback(() => {
    setDetailsMounted(true);
    setDetailsOpen(true);
    requestAnimationFrame(() => {
      document.getElementById("check-stock-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return (
    <div className={styles.shell}>
      <div className={styles.card}>
        <h1 className={styles.name}>{name}</h1>
        <div className={`${styles.badge} ${badgeClass(status)}`}>{status}</div>
        <div className={styles.scoreRow}>
          <span className={styles.score}>{score}</span>
          <span className={styles.scoreOutOf}>/ 100</span>
        </div>
        <p className={styles.summary}>{summary}</p>
        {!detailsAvailable ? <p className={styles.hint}>Indicative — some data missing.</p> : null}

        <div className={styles.actions}>
          <div className={styles.actionCell}>
            <button type="button" className={styles.btnSecondary} onClick={openDetails}>
              View Details
            </button>
          </div>
          <div className={styles.actionCell}>
            <StockCheckResultActions symbol={symbol} variant="watchlistOnly" />
          </div>
        </div>
      </div>

      {detailsMounted ? (
        <div className={styles.detailsSlot}>
          <StockCheckDetailsExpand
            ratioRows={simpleRatioRows}
            methodologyRows={methodologyPassRows}
            reasons={reasons}
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
          />
        </div>
      ) : null}
    </div>
  );
}

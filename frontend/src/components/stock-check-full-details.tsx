"use client";

import type { MultiMethodologyResult, ScreeningResult } from "@/lib/api";
import {
  buildCheckMethodologyPassRows,
  buildCheckSimpleRatioRows,
} from "@/lib/stock-detail-screening-tables";
import styles from "./stock-check-full-details.module.css";

type Props = {
  screening: ScreeningResult;
  multi: MultiMethodologyResult | null;
};

function outcomeClass(outcome: "pass" | "fail" | "review"): string {
  if (outcome === "pass") return styles.outcomePass;
  if (outcome === "fail") return styles.outcomeFail;
  return styles.outcomeReview;
}

function outcomeLabel(outcome: "pass" | "fail" | "review"): string {
  if (outcome === "pass") return "Pass";
  if (outcome === "fail") return "Fail";
  return "Review";
}

export function StockCheckFullDetails({ screening, multi }: Props) {
  const ratioRows = buildCheckSimpleRatioRows(screening);
  const methodRows = buildCheckMethodologyPassRows(multi);
  const reasons = screening.reasons ?? [];
  const flags = screening.manual_review_flags ?? [];

  return (
    <div className={styles.wrap}>
      <details className={styles.section}>
        <summary className={styles.summary}>Financial ratios</summary>
        <div className={styles.body}>
          <table className={styles.ratioTable}>
            <tbody>
              {ratioRows.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className={styles.ratioLabel}>
                    {row.label}
                  </th>
                  <td className={styles.ratioValue}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details className={styles.section}>
        <summary className={styles.summary}>Methodology results</summary>
        <div className={styles.body}>
          {!multi ? (
            <p className={styles.unavailable}>Multi-methodology data is not available for this symbol.</p>
          ) : (
            <ul className={styles.methodList}>
              {methodRows.map((row) => (
                <li key={row.code} className={styles.methodRow}>
                  <span className={styles.methodName}>{row.label}</span>
                  <span className={`${styles.outcome} ${outcomeClass(row.outcome)}`}>
                    {outcomeLabel(row.outcome)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      <details className={styles.section}>
        <summary className={styles.summary}>Detailed explanation</summary>
        <div className={styles.body}>
          {reasons.length > 0 ? (
            <>
              <h3 className={styles.subHeading}>Screening reasons</h3>
              <ul className={styles.reasonList}>
                {reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </>
          ) : null}
          {flags.length > 0 ? (
            <>
              <h3 className={styles.subHeading}>Manual review</h3>
              <ul className={styles.reasonList}>
                {flags.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </>
          ) : null}
          {reasons.length === 0 && flags.length === 0 ? (
            <p className={styles.unavailable}>No explanation lines were returned for this result.</p>
          ) : null}
        </div>
      </details>
    </div>
  );
}

"use client";

import { useId, useState } from "react";
import { AlertCircle, Check, ChevronDown, X } from "lucide-react";
import type { CheckMethodologyPassRow, CheckSimpleRatioRow } from "@/lib/stock-detail-screening-tables";
import styles from "./stock-check-details-expand.module.css";

type TabId = "ratios" | "methodology" | "explanation";

type Props = {
  ratioRows: CheckSimpleRatioRow[];
  methodologyRows: CheckMethodologyPassRow[];
  reasons: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function methodologyOutcome(status: string): { label: string; kind: "pass" | "fail" | "review" } {
  if (status === "HALAL") return { label: "Pass", kind: "pass" };
  if (status === "NON_COMPLIANT") return { label: "Fail", kind: "fail" };
  return { label: "Review", kind: "review" };
}

function OutcomeIcon({ kind }: { kind: "pass" | "fail" | "review" }) {
  if (kind === "pass") {
    return (
      <span className={`${styles.iconCell} ${styles.iconPass}`} aria-hidden>
        <Check size={18} strokeWidth={2.5} />
      </span>
    );
  }
  if (kind === "fail") {
    return (
      <span className={`${styles.iconCell} ${styles.iconFail}`} aria-hidden>
        <X size={18} strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span className={`${styles.iconCell} ${styles.iconReview}`} aria-hidden>
      <AlertCircle size={18} strokeWidth={2} />
    </span>
  );
}

export function StockCheckDetailsExpand({ ratioRows, methodologyRows, reasons, open, onOpenChange }: Props) {
  const [tab, setTab] = useState<TabId>("ratios");
  const contentId = useId();

  return (
    <div className={styles.wrap}>
      <details
        className={styles.details}
        id="check-stock-details"
        open={open}
        onToggle={(e) => onOpenChange(e.currentTarget.open)}
      >
        <summary className={styles.summary}>
          <span className={styles.summaryText}>Screening details</span>
          <ChevronDown className={styles.chevron} size={20} strokeWidth={2} aria-hidden />
        </summary>

        <div className={styles.body} id={contentId}>
          <div className={styles.tabList} role="tablist" aria-label="Screening details">
            <button
              type="button"
              role="tab"
              id="tab-ratios"
              aria-selected={tab === "ratios"}
              aria-controls="panel-ratios"
              className={`${styles.tab} ${tab === "ratios" ? styles.tabActive : ""}`}
              onClick={() => setTab("ratios")}
            >
              Financial ratios
            </button>
            <button
              type="button"
              role="tab"
              id="tab-methodology"
              aria-selected={tab === "methodology"}
              aria-controls="panel-methodology"
              className={`${styles.tab} ${tab === "methodology" ? styles.tabActive : ""}`}
              onClick={() => setTab("methodology")}
            >
              Methodology
            </button>
            <button
              type="button"
              role="tab"
              id="tab-explanation"
              aria-selected={tab === "explanation"}
              aria-controls="panel-explanation"
              className={`${styles.tab} ${tab === "explanation" ? styles.tabActive : ""}`}
              onClick={() => setTab("explanation")}
            >
              Explanation
            </button>
          </div>

          <div
            role="tabpanel"
            id="panel-ratios"
            aria-labelledby="tab-ratios"
            hidden={tab !== "ratios"}
            className={styles.panel}
          >
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Metric</th>
                    <th scope="col" className={styles.num}>
                      Value
                    </th>
                    <th scope="col" className={styles.num}>
                      Limit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ratioRows.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td className={styles.num}>{row.value}</td>
                      <td className={styles.num}>{row.limit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div
            role="tabpanel"
            id="panel-methodology"
            aria-labelledby="tab-methodology"
            hidden={tab !== "methodology"}
            className={styles.panel}
          >
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Methodology</th>
                    <th scope="col" className={styles.outcomeCol}>
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {methodologyRows.map((row) => {
                    const o = methodologyOutcome(row.engineStatus);
                    return (
                      <tr key={row.code}>
                        <td className={styles.methodName}>{row.label}</td>
                        <td>
                          <div className={styles.outcomeRow} aria-label={`${row.label}: ${o.label}`}>
                            <OutcomeIcon kind={o.kind} />
                            <span className={styles.outcomeLabel}>{o.label}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div
            role="tabpanel"
            id="panel-explanation"
            aria-labelledby="tab-explanation"
            hidden={tab !== "explanation"}
            className={styles.panel}
          >
            {reasons.length === 0 ? (
              <p className={styles.emptyReasons}>No detailed reasons returned.</p>
            ) : (
              <ul className={styles.reasonList}>
                {reasons.map((r, i) => (
                  <li key={i} className={styles.reasonItem}>
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}

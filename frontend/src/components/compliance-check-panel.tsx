import styles from "@/app/page.module.css";
import type { ComplianceCheck } from "@/lib/api";

type Props = {
  checks: ComplianceCheck[];
};

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function ComplianceCheckPanel({ checks }: Props) {
  if (checks.length === 0) {
    return (
      <div className="emptyStateBlock">
        <div className="emptyStateIcon" aria-hidden="true">&#x2696;</div>
        <p className="emptyStateTitle">Portfolio is balanced</p>
        <p className="emptyStateDesc">Compliance checks will appear when your holdings drift from target allocations.</p>
      </div>
    );
  }

  return (
    <div className={styles.simpleList}>
      {checks.map((check) => (
        <div className={styles.simpleRow} key={check.symbol}>
          <div>
            <strong>{check.symbol}</strong>
            <span>
              {check.action === "TRIM" ? "Over-weight" : check.action === "ADD" ? "Under-weight" : check.action} · {formatPercent(check.drift_pct)} drift
            </span>
          </div>
          <p>
            Current {formatPercent(check.current_weight_pct)} → target{" "}
            {formatPercent(check.target_weight_pct)}
            {check.note ? `. ${check.note}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

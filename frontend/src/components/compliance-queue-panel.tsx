import styles from "@/app/page.module.css";
import type { ComplianceQueueItem } from "@/lib/api";
import Link from "next/link";

type Props = {
  items: ComplianceQueueItem[];
};

export function ComplianceQueuePanel({ items }: Props) {
  if (items.length === 0) {
    return <p className={styles.emptyState}>Compliance queue is empty — all clear.</p>;
  }

  return (
    <div className={styles.simpleList}>
      {items.map((item) => (
        <div className={styles.simpleRow} key={item.symbol}>
          <div>
            <strong>{item.symbol}</strong>
            <span className={
              item.current_status === "HALAL"
                ? styles.statusPositive
                : item.current_status === "NON_COMPLIANT"
                  ? styles.statusCritical
                  : styles.statusWarning
            }>
              {item.current_status.toLowerCase().replaceAll("_", " ")}
            </span>
          </div>
          <p>
            {item.reason} {item.action_required}{" "}
            <Link className={styles.inlineLink} href={`/stocks/${encodeURIComponent(item.symbol)}`}>
              View {item.symbol} →
            </Link>
          </p>
        </div>
      ))}
    </div>
  );
}

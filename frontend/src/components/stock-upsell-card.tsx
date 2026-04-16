import Link from "next/link";
import styles from "./stock-upsell-card.module.css";
import type { ReactNode } from "react";

export function StockUpsellCard({ readMore }: { readMore?: ReactNode }) {
  return (
    <aside className={styles.card}>
      <h3 className={styles.title}>Want deeper insights?</h3>
      <ul className={styles.bullets}>
        <li>Detailed compliance breakdown</li>
        <li>Historical status tracking</li>
        <li>Portfolio compliance alerts</li>
      </ul>
      <Link href="/premium" className={styles.cta}>
        Unlock Full Analysis
      </Link>
      {readMore ? <div className={styles.readMoreSlot}>{readMore}</div> : null}
    </aside>
  );
}

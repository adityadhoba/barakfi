import Link from "next/link";
import styles from "./stock-upsell-card.module.css";

export function StockUpsellCard() {
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
    </aside>
  );
}

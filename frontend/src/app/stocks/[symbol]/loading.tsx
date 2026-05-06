import { StockPageRouteShell } from "@/components/stock-page-route-shell";
import styles from "@/app/stock-page-html.module.css";

export default function StockDetailLoading() {
  return (
    <StockPageRouteShell>
      <section className={styles.stockFallbackWrap}>
        <div className={styles.stockFallbackCard}>
          <div className={styles.stockFallbackEyebrow}>Loading stock detail</div>
          <h1 className={styles.stockFallbackTitle}>Preparing the latest stock view…</h1>
          <p className={styles.stockFallbackBody}>We&apos;re pulling the screening verdict, quote snapshot, and company context now.</p>
        </div>
      </section>
    </StockPageRouteShell>
  );
}

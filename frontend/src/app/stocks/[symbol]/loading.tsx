import styles from "@/app/screener.module.css";

export default function StockDetailLoading() {
  return (
    <main className={`${styles.screenerPage} ${styles.screenerPageFlow}`}>
      <div className={styles.screenerContainer} style={{ padding: "32px 20px" }}>
        <div className={styles.screenerFallback}>Loading stock…</div>
      </div>
    </main>
  );
}

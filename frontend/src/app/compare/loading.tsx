import s from "@/app/loading.module.css";
import styles from "@/app/screener.module.css";

export default function CompareLoading() {
  return (
    <main className={styles.screenerPage}>
      <div className={styles.screenerContainer}>
        {/* Header */}
        <header className={styles.screenerHeader}>
          <div className={styles.headerRow}>
            <div>
              <div className={s.skeleton} style={{ width: 200, height: 28, borderRadius: 8, marginBottom: 8 }} />
              <div className={s.skeleton} style={{ width: 380, height: 16, borderRadius: 6 }} />
            </div>
          </div>
        </header>

        {/* Search bar */}
        <div className={s.skeleton} style={{ width: 400, maxWidth: "100%", height: 42, borderRadius: 10, marginBottom: 20 }} />

        {/* Table */}
        <div className={s.skeleton} style={{ height: 480, borderRadius: 12 }} />
      </div>
    </main>
  );
}

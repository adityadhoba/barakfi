import s from "@/app/loading.module.css";
import styles from "@/app/screener.module.css";

export default function WatchlistLoading() {
  return (
    <main className={styles.screenerPage}>
      <div className={styles.screenerContainer}>
        <div className={s.skeleton} style={{ width: 120, height: 12, borderRadius: 6, marginBottom: 16 }} />
        <div className={s.skeleton} style={{ width: 200, height: 28, borderRadius: 8, marginBottom: 8 }} />
        <div className={s.skeleton} style={{ width: 280, height: 14, borderRadius: 6, marginBottom: 28 }} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div className={s.skeleton} key={i} style={{ height: 140, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    </main>
  );
}

import s from "@/app/loading.module.css";
import styles from "@/app/screener.module.css";

export default function StockDetailLoading() {
  return (
    <main className={styles.screenerPage}>
      <div className={styles.screenerContainer}>
        {/* Back link */}
        <div className={s.skeleton} style={{ width: 140, height: 14, borderRadius: 6, marginBottom: 16 }} />

        {/* Hero */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 20, marginBottom: 28 }}>
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <div className={s.skeleton} style={{ width: 60, height: 22, borderRadius: 999 }} />
              <div className={s.skeleton} style={{ width: 80, height: 22, borderRadius: 999 }} />
            </div>
            <div className={s.skeleton} style={{ width: 260, height: 30, borderRadius: 8, marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div className={s.skeleton} style={{ width: 110, height: 30, borderRadius: 8 }} />
              <div className={s.skeleton} style={{ width: 70, height: 22, borderRadius: 999 }} />
            </div>
          </div>
          <div className={s.skeleton} style={{ height: 140, borderRadius: 12 }} />
        </div>

        {/* Price chart */}
        <div className={s.skeleton} style={{ height: 320, borderRadius: 12, marginBottom: 28 }} />

        {/* 52-week stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 28 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div className={s.skeleton} key={`stat-${i}`} style={{ height: 72, borderRadius: 12 }} />
          ))}
        </div>

        {/* Compliance gauges */}
        <div className={s.skeleton} style={{ width: 160, height: 18, borderRadius: 6, marginBottom: 14 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginBottom: 28 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div className={s.skeleton} key={i} style={{ height: 100, borderRadius: 12 }} />
          ))}
        </div>

        {/* Screening panels */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
          <div className={s.skeleton} style={{ height: 200, borderRadius: 16 }} />
          <div className={s.skeleton} style={{ height: 200, borderRadius: 16 }} />
        </div>

        {/* Financials */}
        <div className={s.skeleton} style={{ width: 180, height: 18, borderRadius: 6, marginBottom: 14 }} />
        <div className={s.skeleton} style={{ height: 300, borderRadius: 12 }} />
      </div>
    </main>
  );
}

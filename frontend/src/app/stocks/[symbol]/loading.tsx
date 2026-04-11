import s from "@/app/loading.module.css";
import styles from "@/app/screener.module.css";

export default function StockDetailLoading() {
  return (
    <main className={styles.screenerPage}>
      <div className={styles.screenerContainer}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
          <div className={s.skeleton} style={{ width: 44, height: 12, borderRadius: 6 }} />
          <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>/</span>
          <div className={s.skeleton} style={{ width: 64, height: 12, borderRadius: 6 }} />
          <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>/</span>
          <div className={s.skeleton} style={{ width: 52, height: 12, borderRadius: 6 }} />
        </div>

        {/* Hero */}
        <div className={s.stockLoadingHero}>
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <div className={s.skeleton} style={{ width: 52, height: 22, borderRadius: 999 }} />
              <div className={s.skeleton} style={{ width: 88, height: 22, borderRadius: 999 }} />
              <div className={s.skeleton} style={{ width: 64, height: 22, borderRadius: 999 }} />
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <div className={s.skeleton} style={{ width: 48, height: 48, borderRadius: 12 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={s.skeleton} style={{ width: "min(100%, 280px)", height: 26, borderRadius: 8, marginBottom: 8 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <div className={s.skeleton} style={{ width: 72, height: 26, borderRadius: 8 }} />
                  <div className={s.skeleton} style={{ width: 56, height: 22, borderRadius: 999 }} />
                </div>
              </div>
            </div>
            <div className={s.skeleton} style={{ width: 120, height: 22, borderRadius: 8, marginBottom: 10 }} />
            <div className={s.skeleton} style={{ width: "min(100%, 320px)", height: 14, borderRadius: 6, marginBottom: 14 }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div className={s.skeleton} style={{ width: 140, height: 36, borderRadius: 10 }} />
              <div className={s.skeleton} style={{ width: 88, height: 36, borderRadius: 10 }} />
            </div>
          </div>
          <div className={s.skeleton} style={{ minHeight: 160, borderRadius: 14 }} />
        </div>

        {/* Verdict + result card placeholder */}
        <div
          className={s.skeleton}
          style={{
            minHeight: 120,
            borderRadius: 16,
            marginBottom: 12,
          }}
        />
        <div className={s.skeleton} style={{ width: "min(100%, 420px)", height: 12, borderRadius: 6, marginBottom: 22 }} />

        {/* People also row */}
        <div className={s.skeleton} style={{ width: 160, height: 14, borderRadius: 6, marginBottom: 12 }} />
        <div style={{ display: "flex", gap: 12, marginBottom: 28, overflow: "hidden" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div className={s.skeleton} key={`also-${i}`} style={{ flex: "0 0 200px", height: 108, borderRadius: 12 }} />
          ))}
        </div>

        {/* Key metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 22 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div className={s.skeleton} key={`m-${i}`} style={{ height: 72, borderRadius: 12 }} />
          ))}
        </div>

        {/* Price chart */}
        <div className={s.skeleton} style={{ height: 300, borderRadius: 12, marginBottom: 22 }} />

        {/* Tabs */}
        <div className={s.skeleton} style={{ height: 44, borderRadius: 12, marginBottom: 16 }} />
        <div className={s.skeleton} style={{ height: 220, borderRadius: 14, marginBottom: 28 }} />

        {/* Gauges */}
        <div className={s.skeleton} style={{ width: 180, height: 16, borderRadius: 6, marginBottom: 12 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 28 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div className={s.skeleton} key={`g-${i}`} style={{ height: 96, borderRadius: 12 }} />
          ))}
        </div>

        {/* Financials */}
        <div className={s.skeleton} style={{ width: 140, height: 16, borderRadius: 6, marginBottom: 12 }} />
        <div className={s.skeleton} style={{ height: 260, borderRadius: 12 }} />
      </div>
    </main>
  );
}

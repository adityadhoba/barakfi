import s from "./loading.module.css";

export default function HomeLoading() {
  return (
    <div className="shellPage">
      {/* Hero skeleton */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "56px 0 44px" }}>
        <div className={s.skeleton} style={{ width: 200, height: 26, borderRadius: 9999 }} />
        <div className={s.skeleton} style={{ width: 380, height: 40, borderRadius: 8 }} />
        <div className={s.skeleton} style={{ width: 320, height: 16, borderRadius: 6, marginTop: 4 }} />
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <div className={s.skeleton} style={{ width: 150, height: 44, borderRadius: 10 }} />
          <div className={s.skeleton} style={{ width: 130, height: 44, borderRadius: 10 }} />
        </div>
        {/* Social proof */}
        <div style={{ display: "flex", gap: 24, marginTop: 20 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div className={s.skeleton} style={{ width: 50, height: 24, borderRadius: 6 }} />
              <div className={s.skeleton} style={{ width: 70, height: 12, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Market ticker skeleton */}
      <div className={s.skeleton} style={{ height: 48, borderRadius: 12, marginBottom: 16 }} />

      {/* Feature showcase skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32, padding: "32px 0" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={s.skeleton} style={{ height: 160, borderRadius: 16 }} />
        ))}
      </div>

      {/* Stats grid skeleton */}
      <div className={s.loadingMetrics}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={s.loadingMetric} />
        ))}
      </div>

      {/* Pulse skeleton */}
      <div className={s.skeleton} style={{ height: 90, borderRadius: 16, margin: "24px 0 28px" }} />

      {/* Section title */}
      <div className={s.skeleton} style={{ width: 180, height: 20, borderRadius: 6, marginBottom: 14 }} />

      {/* Stock grid skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={s.skeleton} style={{ height: 140, borderRadius: 12 }} />
        ))}
      </div>
    </div>
  );
}

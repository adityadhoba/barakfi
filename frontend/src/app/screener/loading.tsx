import s from "@/app/loading.module.css";
import styles from "@/app/screener.module.css";

export default function ScreenerLoading() {
  return (
    <main className={styles.screenerPage}>
      <div className={styles.screenerContainer}>
        {/* Header */}
        <header className={styles.screenerHeader}>
          <div className={styles.headerRow}>
            <div>
              <div
                className={s.skeleton}
                style={{
                  width: 200,
                  height: 28,
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              />
              <div
                className={s.skeleton}
                style={{
                  width: 340,
                  height: 16,
                  borderRadius: 6,
                }}
              />
            </div>
            <div
              className={s.skeleton}
              style={{
                width: 120,
                height: 26,
                borderRadius: 999,
              }}
            />
          </div>
        </header>

        {/* Compliance score cards (universe bar) */}
        <div className={styles.universeBar}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              className={s.skeleton}
              key={i}
              style={{
                height: 80,
                borderRadius: 12,
              }}
            />
          ))}
        </div>

        {/* Toolbar with filters and sort */}
        <div
          className={s.skeleton}
          style={{
            height: 48,
            borderRadius: 12,
            marginBottom: 20,
          }}
        />

        {/* Stock card grid skeleton - 8 cards matching stockCardGrid layout */}
        <div className={styles.stockCardGrid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              className={s.skeleton}
              key={i}
              style={{
                height: 180,
                borderRadius: 12,
              }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

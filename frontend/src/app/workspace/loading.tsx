import s from "../loading.module.css";

export default function WorkspaceLoading() {
  return (
    <main className="shellPage">
      {/* Hero Section */}
      <div className="shellHero">
        <div
          className={s.skeleton}
          style={{
            height: 260,
            borderRadius: 16,
          }}
        />
        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div
            className={s.skeleton}
            style={{
              height: 90,
              borderRadius: 16,
            }}
          />
          <div
            className={s.skeleton}
            style={{
              height: 90,
              borderRadius: 16,
            }}
          />
          <div
            className={s.skeleton}
            style={{
              height: 90,
              borderRadius: 16,
            }}
          />
        </div>
      </div>

      {/* Metric cards row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginTop: 28,
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={s.skeleton}
            style={{
              height: 100,
              borderRadius: 12,
            }}
          />
        ))}
      </div>

      {/* Portfolio table skeleton */}
      <div
        style={{
          marginTop: 28,
        }}
      >
        <div
          className={s.skeleton}
          style={{
            height: 40,
            borderRadius: 12,
            marginBottom: 12,
          }}
        />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={s.skeleton}
            style={{
              height: 48,
              borderRadius: 12,
              marginBottom: 8,
            }}
          />
        ))}
      </div>

      {/* Bottom panels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginTop: 28,
        }}
      >
        <div
          className={s.skeleton}
          style={{
            height: 240,
            borderRadius: 16,
          }}
        />
        <div
          className={s.skeleton}
          style={{
            height: 240,
            borderRadius: 16,
          }}
        />
      </div>
    </main>
  );
}

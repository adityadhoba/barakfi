/**
 * ScreenerSkeleton — shown instantly from ISR CDN while ScreenerDataLayer
 * fetches stock + screening data from the backend.
 *
 * Mirrors the real screener layout: 240px sidebar + main content area with
 * a header bar and shimmer table rows. Pure CSS animation, zero JS.
 */
export function ScreenerSkeleton() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Sidebar skeleton */}
      <aside
        style={{
          borderRight: "1px solid var(--line)",
          background: "var(--panel)",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Header row */}
        <div style={{ paddingBottom: 14, borderBottom: "1px solid var(--line)" }}>
          <Shimmer width="60%" height={12} />
        </div>
        {/* 4 filter sections */}
        {[80, 100, 72, 96].map((w, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Shimmer width={`${w * 0.55}%`} height={10} />
            <Shimmer width="100%" height={30} radius={6} />
          </div>
        ))}
      </aside>

      {/* Main content skeleton */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {/* Header bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
            borderBottom: "1px solid var(--line)",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Shimmer width={160} height={18} />
            <Shimmer width={100} height={11} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Shimmer width={220} height={34} radius={6} />
            <Shimmer width={72} height={34} radius={6} />
            <Shimmer width={56} height={34} radius={6} />
          </div>
        </div>

        {/* Table skeleton */}
        <div style={{ flex: 1, overflow: "hidden", padding: "0 0 0 0" }}>
          {/* Column headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 120px 110px 110px 130px 110px 90px",
              padding: "10px 20px",
              borderBottom: "1px solid var(--line)",
              gap: 8,
            }}
          >
            {[20, 80, 60, 60, 60, 80, 60, 50].map((w, i) => (
              <Shimmer key={i} width={w} height={11} />
            ))}
          </div>
          {/* 10 shimmer rows */}
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonRow key={i} opacity={1 - i * 0.07} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SkeletonRow({ opacity }: { opacity: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "40px 1fr 120px 110px 110px 130px 110px 90px",
        padding: "13px 20px",
        borderBottom: "1px solid var(--line)",
        gap: 8,
        alignItems: "center",
        opacity,
      }}
    >
      <Shimmer width={20} height={12} />
      {/* Name + logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Shimmer width={32} height={32} radius="50%" />
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <Shimmer width={110} height={12} />
          <Shimmer width={60} height={10} />
        </div>
      </div>
      <Shimmer width={80} height={12} />
      <Shimmer width={70} height={12} />
      <Shimmer width={70} height={12} />
      <Shimmer width={88} height={22} radius={4} />
      <Shimmer width={60} height={12} />
      <Shimmer width={64} height={26} radius={4} />
    </div>
  );
}

function Shimmer({
  width,
  height,
  radius,
}: {
  width: number | string;
  height: number;
  radius?: number | string;
}) {
  return (
    <span
      style={{
        display: "block",
        width: typeof width === "number" ? `${width}px` : width,
        height: `${height}px`,
        borderRadius: typeof radius === "number" ? `${radius}px` : (radius ?? "4px"),
        background: "var(--bg-soft)",
        animation: "screener-shimmer 1.4s ease-in-out infinite",
        flexShrink: 0,
      }}
    />
  );
}

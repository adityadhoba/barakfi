import s from "@/app/loading.module.css";

/** Placeholder while the candlestick chart chunk loads or fetches data */
export function ChartSkeleton() {
  return (
    <div aria-hidden className={s.chartSkeleton}>
      <div className={s.chartSkeletonToolbar}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={s.skeleton} style={{ width: 36, height: 28, borderRadius: 9999 }} />
        ))}
      </div>
      <div className={s.chartSkeletonCanvas} />
    </div>
  );
}

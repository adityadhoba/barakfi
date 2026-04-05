import s from "@/app/loading.module.css";

export function NewsCarouselSkeleton() {
  return (
    <div aria-hidden className={s.newsCarouselSkeleton}>
      <div className={s.newsCarouselHero} />
      <div className={s.newsCarouselDots}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={s.skeleton} style={{ width: 8, height: 8, borderRadius: "50%" }} />
        ))}
      </div>
    </div>
  );
}

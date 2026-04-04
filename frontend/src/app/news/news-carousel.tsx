"use client";

import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/api";
import styles from "./news.module.css";

export function NewsCarousel({ items }: { items: NewsItem[] }) {
  const [i, setI] = useState(0);
  const list = items.filter((x) => x.title);
  useEffect(() => {
    if (list.length <= 1) return;
    const t = setInterval(() => setI((v) => (v + 1) % list.length), 6500);
    return () => clearInterval(t);
  }, [list.length]);

  if (list.length === 0) return null;

  const cur = list[i]!;

  return (
    <div className={styles.heroCarousel}>
      <a href={cur.url} target="_blank" rel="noopener noreferrer" className={styles.heroSlide}>
        {cur.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cur.image_url} alt="" className={styles.heroImg} />
        ) : (
          <div className={styles.heroImgPlaceholder} aria-hidden />
        )}
        <div className={styles.heroOverlay}>
          <span className={styles.heroBadge}>Headlines</span>
          <h2 className={styles.heroHeadline}>{cur.title}</h2>
          {cur.summary ? (
            <p className={styles.heroSummary}>
              {cur.summary.slice(0, 220)}
              {cur.summary.length > 220 ? "…" : ""}
            </p>
          ) : null}
        </div>
      </a>
      {list.length > 1 && (
        <div className={styles.heroDots} role="tablist" aria-label="News slides">
          {list.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={idx === i ? styles.heroDotActive : styles.heroDot}
              onClick={() => setI(idx)}
              aria-label={`Show news ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

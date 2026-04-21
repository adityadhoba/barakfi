"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { StockLogo } from "@/components/stock-logo";
import { LockedVerdict } from "@/components/locked-verdict";
import { screeningUiLabel } from "@/lib/screening-status";
import styles from "@/app/screener.module.css";

const STATUS_BADGE: Record<string, string> = {
  HALAL: "badgeHalal",
  CAUTIOUS: "badgeReview",
  NON_COMPLIANT: "badgeFail",
};

export type PeopleAlsoItem = {
  symbol: string;
  name: string;
  status: string;
  score: number;
};

export function PeopleAlsoChecked({ items }: { items: PeopleAlsoItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / items.length;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setActiveIndex(Math.min(idx, items.length - 1));
  }, [items.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const scrollToCard = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / items.length;
    el.scrollTo({ left: cardWidth * idx, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section className={styles.peopleAlsoSection} aria-labelledby="people-also-heading">
      <h2 id="people-also-heading" className={styles.peopleAlsoTitle}>
        People also checked
      </h2>
      <div className={styles.peopleAlsoGrid} ref={scrollRef}>
        {items.map((item) => (
          <Link
            key={item.symbol}
            href={`/screening/${encodeURIComponent(item.symbol)}`}
            className={styles.peopleAlsoCard}
          >
            <div className={styles.peopleAlsoCardTop}>
              <StockLogo symbol={item.symbol} size={36} status={item.status} />
              <div className={styles.peopleAlsoIdentity}>
                <span className={styles.peopleAlsoName}>{item.name}</span>
                <span className={styles.peopleAlsoSymbol}>{item.symbol}</span>
              </div>
            </div>
            <div className={styles.peopleAlsoMeta}>
              <LockedVerdict symbol={item.symbol} compact>
                <div className={styles.peopleAlsoScoreWrap}>
                  <span className={styles.peopleAlsoScore}>{item.score}</span>
                  <span className={styles.peopleAlsoScoreSuffix}>/100</span>
                </div>
                <span
                  className={`${styles.badge} ${styles[STATUS_BADGE[item.status] || "badgeReview"]}`}
                >
                  {screeningUiLabel(item.status)}
                </span>
              </LockedVerdict>
            </div>
          </Link>
        ))}
      </div>
      {items.length > 1 && (
        <div className={styles.carouselDots} aria-hidden="true">
          {items.map((_, i) => (
            <button
              key={i}
              className={`${styles.carouselDot} ${i === activeIndex ? styles.carouselDotActive : ""}`}
              onClick={() => scrollToCard(i)}
              aria-label={`Go to stock ${i + 1}`}
              tabIndex={-1}
            />
          ))}
        </div>
      )}
    </section>
  );
}

"use client";

import styles from "./skeleton-loader.module.css";

interface SkeletonProps {
  height?: string;
  width?: string;
  shape?: "rect" | "circle" | "text";
  count?: number;
  gap?: string;
  animation?: "pulse" | "shimmer";
  className?: string;
}

export function Skeleton({
  height = "1rem",
  width = "100%",
  shape = "rect",
  count = 1,
  gap = "1rem",
  animation = "shimmer",
  className = "",
}: SkeletonProps) {
  const shapeClass = {
    rect: styles.skeletonRect,
    circle: styles.skeletonCircle,
    text: styles.skeletonText,
  }[shape];

  const animationClass = {
    pulse: styles.animatePulse,
    shimmer: styles.animateShimmer,
  }[animation];

  const skeletons = Array.from({ length: count });

  if (count > 1) {
    return (
      <div className={className} style={{ gap }}>
        {skeletons.map((_, index) => (
          <div
            key={index}
            className={`${shapeClass} ${animationClass}`}
            style={{ height, width }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${shapeClass} ${animationClass} ${className}`}
      style={{ height, width }}
    />
  );
}

export function SkeletonCard({ count = 1 }: { count?: number }) {
  return (
    <div className={styles.skeletonCard}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.cardContent}>
          <Skeleton height="12rem" width="100%" shape="rect" animation="shimmer" />
          <Skeleton height="1.25rem" width="80%" shape="text" className={styles.textGap} />
          <Skeleton height="1rem" width="60%" shape="text" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className={styles.skeletonTable}>
      {/* Header */}
      <div className={styles.tableRow}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton
            key={`header-${index}`}
            height="1rem"
            width="100%"
            shape="text"
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className={styles.tableRow}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              height="1rem"
              width="100%"
              shape="text"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = "2.5rem" }: { size?: string }) {
  return <Skeleton height={size} width={size} shape="circle" />;
}

export function SkeletonHeading({ count = 1 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={index}
          height={index === 0 ? "1.875rem" : "1.25rem"}
          width={index === 0 ? "75%" : "90%"}
          shape="text"
          className={styles.textGap}
        />
      ))}
    </div>
  );
}

export function SkeletonParagraph({
  lines = 3,
}: {
  lines?: number;
}) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height="1rem"
          width={index === lines - 1 ? "70%" : "100%"}
          shape="text"
          className={styles.textGap}
        />
      ))}
    </div>
  );
}

import styles from "./skeleton.module.css";

type Props = {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  variant?: "text" | "circle" | "card";
};

export function Skeleton({
  width,
  height,
  borderRadius,
  className = "",
  variant = "text",
}: Props) {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;
  if (borderRadius) style.borderRadius = typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius;

  return (
    <span
      className={`${styles.skeleton} ${styles[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

export function SkeletonRow() {
  return (
    <div className={styles.row}>
      <Skeleton variant="circle" width={32} height={32} />
      <div className={styles.rowText}>
        <Skeleton width="40%" height={12} />
        <Skeleton width="60%" height={10} />
      </div>
      <Skeleton width={60} height={14} />
      <Skeleton width={50} height={14} />
    </div>
  );
}

export function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div className={styles.table}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <Skeleton variant="circle" width={40} height={40} />
        <div className={styles.cardHeaderText}>
          <Skeleton width="50%" height={14} />
          <Skeleton width="70%" height={10} />
        </div>
      </div>
      <Skeleton width="100%" height={1} />
      <div className={styles.cardBody}>
        <Skeleton width="30%" height={24} />
        <Skeleton width="60%" height={10} />
      </div>
    </div>
  );
}

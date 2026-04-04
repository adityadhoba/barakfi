import styles from "./home-dashboard.module.css";

type Props = { slug: string; className?: string };

/** SVG icons mapped by collection slug (organic style, not emoji). */
export function CollectionIcon({ slug, className }: Props) {
  const cn = className || styles.collectionIconSvg;
  switch (slug) {
    case "halal-blue-chips-india":
      return (
        <span className={cn} aria-hidden>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 28V14l6-4 6 4v14" />
            <path d="M14 24h8" />
            <path d="M18 10v4" />
            <circle cx="18" cy="6" r="2.2" />
          </svg>
        </span>
      );
    case "halal-it-stocks":
      return (
        <span className={cn} aria-hidden>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="7" y="9" width="22" height="16" rx="2" />
            <path d="M11 25h14" />
            <path d="M18 13v6" />
            <circle cx="18" cy="16" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        </span>
      );
    case "halal-pharma-healthcare":
      return (
        <span className={cn} aria-hidden>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="10" y="14" width="16" height="10" rx="2" />
            <path d="M14 10h8v6h-8z" />
            <path d="M18 7v4" />
          </svg>
        </span>
      );
    case "halal-auto":
      return (
        <span className={cn} aria-hidden>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 22h24l-2-6H8l-2 6z" />
            <circle cx="11" cy="24" r="2.5" />
            <circle cx="25" cy="24" r="2.5" />
            <path d="M9 16l2-4h14l2 4" />
          </svg>
        </span>
      );
    default:
      return (
        <span className={cn} aria-hidden>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="8" y="10" width="20" height="16" rx="2" />
            <path d="M14 18h8M18 14v8" strokeLinecap="round" />
          </svg>
        </span>
      );
  }
}

import Link from "next/link";
import {
  HiOutlineArrowPathRoundedSquare,
  HiOutlineCalculator,
  HiOutlineChartBarSquare,
  HiOutlineMagnifyingGlass,
  HiOutlineStar,
} from "react-icons/hi2";
import styles from "./home-quick-actions.module.css";

const ACTIONS = [
  { href: "/screener", label: "Screener", Icon: HiOutlineMagnifyingGlass },
  { href: "/watchlist", label: "Watchlist", Icon: HiOutlineStar },
  { href: "/compare", label: "Compare", Icon: HiOutlineArrowPathRoundedSquare },
  { href: "/tools", label: "Tools", Icon: HiOutlineCalculator },
  { href: "/workspace", label: "Portfolio", Icon: HiOutlineChartBarSquare },
] as const;

export function HomeQuickActions() {
  return (
    <section className={styles.wrap} aria-label="Quick actions">
      <div className={styles.inner}>
        {ACTIONS.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={styles.tile}>
            <span className={styles.icon} aria-hidden>
              <Icon />
            </span>
            <span className={styles.label}>{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

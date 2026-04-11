import Link from "next/link";
import { StockCheckHero } from "@/components/stock-check-hero";
import { getTopHalalPicksForHome } from "@/lib/home-top-halal";
import styles from "./product-check-home.module.css";

const STATUS_CLASS: Record<string, string> = {
  Halal: styles.badgeHalal,
  Doubtful: styles.badgeDoubt,
  Haram: styles.badgeHaram,
};

export async function ProductCheckHome() {
  const top = await getTopHalalPicksForHome();

  return (
    <section className={styles.strip} aria-labelledby="product-check-heading">
      <div className={styles.inner}>
        <p className={styles.kicker}>Instant answer</p>
        <h1 id="product-check-heading" className={styles.title}>
          Check if any stock is Halal in seconds
        </h1>
        <p className={styles.sub}>
          Shariah-compliant screening across four global methodologies — one clear result, with full ratios when you need them.
        </p>
        <StockCheckHero />
      </div>

      {top.length > 0 && (
        <div className={`${styles.inner} ${styles.topSection}`}>
          <h2 className={styles.topTitle}>Top Halal Stocks Today</h2>
          <ul className={styles.topList}>
            {top.map((row) => (
              <li key={row.symbol}>
                <Link href={`/check/${encodeURIComponent(row.symbol)}`} className={styles.topCard}>
                  <span className={styles.cardName}>{row.name}</span>
                  <span className={styles.cardMeta}>
                    <span className={styles.cardScore}>
                      {row.score}
                      <span className={styles.cardScoreSuffix}>/100</span>
                    </span>
                    <span className={`${styles.badge} ${STATUS_CLASS[row.status] ?? styles.badgeDoubt}`}>
                      {row.status}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

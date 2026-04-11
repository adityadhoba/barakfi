import Link from "next/link";
import { StockCheckHero } from "@/components/stock-check-hero";
import { getTopHalalPicksForHome } from "@/lib/home-top-halal-picks";
import styles from "./product-check-home.module.css";

const STATUS_CLASS: Record<string, string> = {
  Halal: styles.badgeHalal,
  Doubtful: styles.badgeDoubt,
  Haram: styles.badgeHaram,
};

export async function ProductCheckHome() {
  const top = await getTopHalalPicksForHome();
  const allMock = top.length > 0 && top.every((p) => p.isMock);

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
        <div className={`${styles.innerWide} ${styles.topSection}`}>
          <h2 className={styles.topTitle}>Top Halal Stocks Today</h2>
          {allMock ? (
            <p className={styles.topCaption}>Sample picks — search any symbol for a live score.</p>
          ) : null}
          <div className={styles.topGrid}>
            {top.map((s) => (
              <Link key={s.symbol} href={`/check/${encodeURIComponent(s.symbol)}`} className={styles.topCard}>
                <div className={styles.topName}>{s.name}</div>
                <div className={styles.topScoreRow}>
                  <span className={styles.topScoreLabel}>Score</span>
                  <span className={styles.topScore}>{s.score}</span>
                  <span className={styles.topScoreOutOf}>/100</span>
                </div>
                <div className={styles.topBadgeRow}>
                  <span className={`${styles.badge} ${STATUS_CLASS[s.status] ?? styles.badgeDoubt}`}>{s.status}</span>
                </div>
              </Link>
            ))}
          </div>
          <div className={styles.moreWrap}>
            <Link href="/screener" className={styles.moreLink}>
              Browse full screener →
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

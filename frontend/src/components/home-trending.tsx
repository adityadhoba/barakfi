import Link from "next/link";
import styles from "./home-trending.module.css";

type TrendingItem = {
  symbol: string;
  name: string;
  exchange: string;
};

type Props = {
  stocks: TrendingItem[];
};

export function HomeTrending({ stocks }: Props) {
  if (stocks.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>Trending Now</h2>
        <Link href="/trending" className={styles.viewAll}>
          View all &rarr;
        </Link>
      </div>
      <div className={styles.list}>
        {stocks.slice(0, 8).map((s, i) => (
          <Link
            key={s.symbol}
            href={`/stocks/${encodeURIComponent(s.symbol)}`}
            className={styles.item}
          >
            <span className={styles.rank}>{i + 1}</span>
            <div className={styles.info}>
              <span className={styles.symbol}>{s.symbol}</span>
              <span className={styles.name}>{s.name}</span>
            </div>
            <span className={styles.exchange}>{s.exchange}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

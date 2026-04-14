import Link from "next/link";
import type { ScreeningResult, Stock } from "@/lib/api";
import styles from "./home-top-stocks.module.css";

type Props = {
  stocks: (Stock & { screening?: ScreeningResult })[];
};

const STATUS_LABEL: Record<string, string> = {
  HALAL: "Shariah Compliant",
  CAUTIOUS: "Requires Review",
  NON_COMPLIANT: "Not Compliant",
};

const STATUS_CLS: Record<string, string> = {
  HALAL: styles.badgeHalal,
  CAUTIOUS: styles.badgeCautious,
  NON_COMPLIANT: styles.badgeFail,
};

export function HomeTopStocks({ stocks }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Top Indian Stocks (Shariah Screened)</h2>
          <p className={styles.subtitle}>
            Instantly check compliance status of popular stocks
          </p>
        </div>
        <Link href="/screener" className={styles.viewAll}>
          View All Stocks &rarr;
        </Link>
      </div>
      <div className={styles.grid}>
        {stocks.map((s) => {
          const status = s.screening?.status;
          return (
            <Link
              key={s.symbol}
              href={`/stocks/${encodeURIComponent(s.symbol)}`}
              className={styles.card}
            >
              <div className={styles.cardTop}>
                <span className={styles.cardName}>{s.name}</span>
                <span className={styles.cardSymbol}>{s.symbol}</span>
              </div>
              <div className={styles.cardBottom}>
                {status && (
                  <span className={`${styles.badge} ${STATUS_CLS[status] || ""}`}>
                    {STATUS_LABEL[status] || status}
                  </span>
                )}
                {s.screening?.screening_score != null && (
                  <span className={styles.score}>
                    {Math.round(s.screening.screening_score)}%
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

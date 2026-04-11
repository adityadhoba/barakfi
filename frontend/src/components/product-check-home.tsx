import Link from "next/link";
import { StockCheckHero } from "@/components/stock-check-hero";
import { getStocks, getBulkScreeningResults } from "@/lib/api";
import type { ScreeningResult, Stock } from "@/lib/api";
import styles from "./home-minimal.module.css";

type Screened = Stock & { screening: ScreeningResult };

const STATUS_CLASS: Record<string, string> = {
  Halal: styles.badgeHalal,
  Doubtful: styles.badgeDoubt,
  Haram: styles.badgeHaram,
};

function productStatus(engine: string): "Halal" | "Doubtful" | "Haram" {
  if (engine === "HALAL") return "Halal";
  if (engine === "NON_COMPLIANT") return "Haram";
  return "Doubtful";
}

export async function ProductCheckHome() {
  const stocks = await getStocks();
  const symbols = stocks.map((s) => s.symbol);
  const screenings = await getBulkScreeningResults(symbols).catch(() => []);
  const map = new Map(screenings.map((r) => [r.symbol, r]));
  const screened: Screened[] = [];
  for (const s of stocks) {
    const sc = map.get(s.symbol);
    if (sc) screened.push({ ...s, screening: sc });
  }

  const top = [...screened]
    .sort((a, b) => {
      const sa = a.screening.screening_score ?? 0;
      const sb = b.screening.screening_score ?? 0;
      if (sb !== sa) return sb - sa;
      return b.market_cap - a.market_cap;
    })
    .slice(0, 5);

  return (
    <div className={styles.shell}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Check if any stock is Halal instantly</h1>
        <p className={styles.sub}>Shariah-compliant stock screening in seconds</p>
        <div className={styles.searchWrap}>
          <StockCheckHero
            variant="hero"
            placeholder="Search Reliance, TCS, Tesla"
            submitLabel="Check Halal Status"
          />
        </div>
      </div>

      {top.length > 0 && (
        <section className={`${styles.inner} ${styles.topSection}`} aria-label="Top screening scores">
          <h2 className={styles.topTitle}>Top scores today</h2>
          <div className={styles.topGrid}>
            {top.map((s) => {
              const label = productStatus(s.screening.status);
              const score = s.screening.screening_score ?? "—";
              return (
                <Link key={s.symbol} href={`/check/${encodeURIComponent(s.symbol)}`} className={styles.topCard}>
                  <div className={styles.topSym}>{s.symbol}</div>
                  <div className={styles.topName}>{s.name}</div>
                  <div className={styles.topMeta}>
                    <span className={styles.topScore}>{typeof score === "number" ? `${score}/100` : score}</span>
                    <span className={`${styles.badge} ${STATUS_CLASS[label] ?? styles.badgeDoubt}`}>{label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

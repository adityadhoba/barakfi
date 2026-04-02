import styles from "@/app/screener.module.css";
import type { Stock, ScreeningResult } from "@/lib/api";
import Link from "next/link";

type ScreenedStock = Stock & { screening: ScreeningResult };

type SectorStats = {
  name: string;
  total: number;
  halal: number;
  review: number;
  fail: number;
};

function formatCurrency(value: number) {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(0)}Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)}L`;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function buildSectorStats(stocks: ScreenedStock[]): SectorStats[] {
  const map = new Map<string, SectorStats>();

  for (const s of stocks) {
    let entry = map.get(s.sector);
    if (!entry) {
      entry = { name: s.sector, total: 0, halal: 0, review: 0, fail: 0 };
      map.set(s.sector, entry);
    }
    entry.total++;
    if (s.screening.status === "HALAL") entry.halal++;
    else if (s.screening.status === "REQUIRES_REVIEW") entry.review++;
    else entry.fail++;
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

type Props = {
  screenedStocks: ScreenedStock[];
};

export function MarketOverview({ screenedStocks }: Props) {
  const total = screenedStocks.length;
  const halal = screenedStocks.filter((s) => s.screening.status === "HALAL").length;
  const review = screenedStocks.filter((s) => s.screening.status === "REQUIRES_REVIEW").length;
  const fail = total - halal - review;
  const compliancePct = total > 0 ? Math.round((halal / total) * 100) : 0;

  const sectorStats = buildSectorStats(screenedStocks);

  const topHalal = screenedStocks
    .filter((s) => s.screening.status === "HALAL")
    .sort((a, b) => b.market_cap - a.market_cap)
    .slice(0, 6);

  const circumference = 2 * Math.PI * 30;
  const dashOffset = circumference - (compliancePct / 100) * circumference;

  return (
    <>
      <div className={styles.universeBar}>
        <div className={styles.complianceScore}>
          <svg className={styles.complianceRing} viewBox="0 0 72 72" role="img" aria-label={`${compliancePct}% of stocks pass Shariah screening`}>
            <circle className={styles.complianceRingBg} cx="36" cy="36" r="30" />
            <circle
              className={styles.complianceRingFill}
              cx="36"
              cy="36"
              r="30"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
            <text className={styles.complianceRingText} x="36" y="36">
              {compliancePct}%
            </text>
          </svg>
          <div className={styles.complianceLabel}>
            <strong>Compliance Score</strong>
            <span>{halal} of {total} stocks are safe to invest</span>
          </div>
        </div>

        <div className={styles.universeStat}>
          <span className={styles.universeStatLabel}>Total screened</span>
          <span className={styles.universeStatValue}>{total}</span>
          <span className={styles.universeStatSub}>stocks checked</span>
        </div>
        <div className={styles.universeStat}>
          <span className={styles.universeStatLabel}>Halal</span>
          <span className={`${styles.universeStatValue} ${styles.halal}`}>{halal}</span>
          <span className={styles.universeStatSub}>safe to invest</span>
        </div>
        <div className={styles.universeStat}>
          <span className={styles.universeStatLabel}>Needs review</span>
          <span className={`${styles.universeStatValue} ${styles.review}`}>{review}</span>
          <span className={styles.universeStatSub}>need deeper checking</span>
        </div>
        <div className={styles.universeStat}>
          <span className={styles.universeStatLabel}>Non-compliant</span>
          <span className={`${styles.universeStatValue} ${styles.nonCompliant}`}>{fail}</span>
          <span className={styles.universeStatSub}>don't meet Shariah rules</span>
        </div>
      </div>

      <div className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>By sector</h2>
        <p className={styles.sectionSub}>
          Green = halal, amber = needs review, red = not compliant
        </p>
      </div>
      <div className={styles.sectorGrid}>
        {sectorStats.map((sector) => {
          const hPct = sector.total > 0 ? (sector.halal / sector.total) * 100 : 0;
          const rPct = sector.total > 0 ? (sector.review / sector.total) * 100 : 0;
          const fPct = sector.total > 0 ? (sector.fail / sector.total) * 100 : 0;
          return (
            <div className={styles.sectorTile} key={sector.name}>
              <span className={styles.sectorTileName}>{sector.name}</span>
              <div className={styles.sectorTileBar}>
                <div className={styles.sectorTileBarHalal} style={{ width: `${hPct}%` }} />
                <div className={styles.sectorTileBarReview} style={{ width: `${rPct}%` }} />
                <div className={styles.sectorTileBarFail} style={{ width: `${fPct}%` }} />
              </div>
              <div className={styles.sectorTileStats}>
                <span><span className={`${styles.dot} ${styles.dotHalal}`} />{sector.halal}</span>
                <span><span className={`${styles.dot} ${styles.dotReview}`} />{sector.review}</span>
                <span><span className={`${styles.dot} ${styles.dotFail}`} />{sector.fail}</span>
              </div>
            </div>
          );
        })}
      </div>

      {topHalal.length > 0 && (
        <>
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>Top halal picks</h2>
            <p className={styles.sectionSub}>Largest compliant stocks you can invest in</p>
          </div>
          <div className={styles.topStocksRow}>
            {topHalal.map((s) => (
              <Link className={styles.topStockCard} href={`/stocks/${encodeURIComponent(s.symbol)}`} key={s.symbol}>
                <div className={styles.topStockHeader}>
                  <div>
                    <div className={styles.topStockSymbol}>{s.symbol}</div>
                    <div className={styles.topStockName}>{s.name}</div>
                  </div>
                  <span className={`${styles.badge} ${styles.badgeHalal}`}>Halal</span>
                </div>
                <div className={styles.topStockHeader}>
                  <span className={styles.topStockPrice}>{formatCompact(s.price)}</span>
                  <span className={styles.topStockMcap}>{formatCurrency(s.market_cap)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}

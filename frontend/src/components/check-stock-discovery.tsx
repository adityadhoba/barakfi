"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  loadCheckDiscoveryPool,
  selectCheckDiscoveryPicks,
  type CheckDiscoveryPick,
} from "@/lib/check-page-discovery";
import styles from "./check-stock-discovery.module.css";

function badgeClass(status: CheckDiscoveryPick["status"]): string {
  if (status === "Halal") return styles.badgeHalal;
  if (status === "Haram") return styles.badgeHaram;
  return styles.badgeDoubt;
}

type Props = {
  excludeSymbol: string;
};

export function CheckStockDiscovery({ excludeSymbol }: Props) {
  const [picks, setPicks] = useState<CheckDiscoveryPick[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const pool = await loadCheckDiscoveryPool();
        if (cancelled) return;
        setPicks(selectCheckDiscoveryPicks(pool, excludeSymbol));
      } catch {
        if (cancelled) return;
        setPicks(selectCheckDiscoveryPicks([], excludeSymbol));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [excludeSymbol]);

  if (picks.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="check-discovery-heading">
      <h2 id="check-discovery-heading" className={styles.title}>
        Top Halal stocks today
      </h2>
      <p className={styles.sub}>People also checked these — tap for instant Halal status.</p>
      <ul className={styles.grid}>
        {picks.map((p) => (
          <li key={p.symbol}>
            <Link href={`/check/${encodeURIComponent(p.symbol)}`} className={styles.card}>
              <span className={styles.name}>{p.name}</span>
              <div className={styles.meta}>
                <span className={styles.score}>{p.score}</span>
                <span className={styles.scoreSuffix}>/ 100</span>
                <span className={`${styles.badge} ${badgeClass(p.status)}`}>{p.status}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

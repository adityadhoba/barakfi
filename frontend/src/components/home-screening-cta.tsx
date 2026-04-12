"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./home-screening-cta.module.css";

export function HomeScreeningCta() {
  const router = useRouter();
  const [symbol, setSymbol] = useState("");

  const handleSubmit = useCallback(() => {
    const clean = symbol.trim().toUpperCase().replace(/\.NS$/, "");
    if (!clean) return;
    router.push(`/screening/${encodeURIComponent(clean)}`);
  }, [symbol, router]);

  return (
    <section className={styles.section}>
      <div className={styles.glow} aria-hidden />
      <div className={styles.content}>
        <h2 className={styles.heading}>Screen Any Stock Instantly</h2>
        <p className={styles.subtext}>
          Get real-time Shariah compliance analysis in seconds
        </p>
        <div className={styles.inputRow}>
          <input
            type="text"
            className={styles.input}
            placeholder="Enter stock name (e.g., INFY, TCS)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          />
          <button
            type="button"
            className={styles.btn}
            onClick={handleSubmit}
            disabled={!symbol.trim()}
          >
            Screen Now
          </button>
        </div>
        <p className={styles.freeNote}>~5 free screenings per day</p>
      </div>
    </section>
  );
}

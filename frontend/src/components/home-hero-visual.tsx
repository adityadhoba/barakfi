"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowUpRight } from "lucide-react";
import styles from "./home-hero-visual.module.css";

export type HomeHeroVisualProps = {
  totalStocks: number;
  sectorCount: number;
  halalCount: number | null;
};

function MiniBars() {
  const heights = [22, 42, 68, 88];
  return (
    <div className={styles.bars}>
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className={styles.bar}
          initial={{ height: 0, opacity: 0.5 }}
          animate={{ height: `${h}%` }}
          transition={{ delay: 0.35 + i * 0.12, type: "spring", stiffness: 120, damping: 14 }}
        />
      ))}
    </div>
  );
}

function OrbitGraphic() {
  return (
    <motion.svg
      className={styles.planetWrap}
      initial={{ rotate: -6 }}
      animate={{ rotate: 0 }}
      transition={{ duration: 1.6, type: "spring" }}
      width="200"
      height="200"
      viewBox="0 0 220 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="barakfi-orbit-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#0d9668" />
        </linearGradient>
      </defs>
      <circle cx="110" cy="110" r="52" fill="url(#barakfi-orbit-grad)" opacity={0.95} />
      <circle cx="96" cy="96" r="9" fill="white" opacity={0.4} />
      <circle cx="128" cy="120" r="7" fill="white" opacity={0.3} />
      <motion.ellipse
        cx="110"
        cy="110"
        rx="92"
        ry="32"
        stroke="white"
        strokeOpacity={0.55}
        fill="none"
        strokeDasharray="200 200"
        animate={{ strokeDashoffset: [200, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

export function HomeHeroVisual({ totalStocks, sectorCount, halalCount }: HomeHeroVisualProps) {
  const halalLabel =
    halalCount == null ? "—" : halalCount > 0 ? `${halalCount}+` : "0";

  return (
    <section className={styles.section} aria-labelledby="home-hero-visual-heading">
      <div className={styles.grid}>
        <div className={styles.left}>
          <h2 id="home-hero-visual-heading" className={styles.headline}>
            Screen with clarity.
            <br />
            Invest with conviction.
          </h2>
          <p className={styles.lead}>
            Barakfi brings Shariah screening, live market context, and portfolio tools together — built for
            investors who want compliance without guesswork.
          </p>
          <div className={styles.ctas}>
            <Link href="/screener" className={styles.btnPrimary}>
              Open screener
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/sign-up" className={styles.btnGhost}>
              Create free account
            </Link>
          </div>
          <div className={styles.stats}>
            <div>
              <div className={styles.statValue}>{totalStocks}+</div>
              <div className={styles.statLabel}>Stocks in universe</div>
            </div>
            <div>
              <div className={styles.statValue}>{sectorCount}</div>
              <div className={styles.statLabel}>Sectors covered</div>
            </div>
            <div>
              <div className={styles.statValue}>{halalLabel}</div>
              <div className={styles.statLabel}>Halal names (screened)</div>
            </div>
            <div>
              <div className={styles.statValue}>5</div>
              <div className={styles.statLabel}>Financial ratios</div>
            </div>
          </div>
          <div className={styles.trust}>
            <span>Methodology you can trace</span>
            <div className={styles.trustNames}>
              <span>S&amp;P-style ratios</span>
              <span>NSE · US · LSE</span>
              <span>Transparent flags</span>
            </div>
          </div>
        </div>

        <div className={styles.cards}>
          <motion.div
            className={styles.cardSecure}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45 }}
          >
            <div className={styles.cardSecureInner}>
              <div className={styles.cardSecureLabel}>
                <div className={styles.iconWrap}>
                  <ShieldCheck className="h-5 w-5 text-white" aria-hidden />
                </div>
                <span className={styles.pill}>Screening first</span>
              </div>
              <p className={styles.cardSecureTitle}>
                Rules-backed checks
                <br />
                before you allocate capital
              </p>
              <motion.div
                className={styles.pulseDot}
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(16, 185, 129, 0.35)",
                    "0 0 0 14px rgba(16, 185, 129, 0)",
                  ],
                }}
                transition={{ duration: 2.4, repeat: Infinity }}
              />
            </div>
          </motion.div>

          <motion.div
            className={styles.cardGlobe}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: 0.06 }}
          >
            <OrbitGraphic />
            <div className={styles.cardGlobeText}>
              <div className={styles.cardGlobeKicker}>Markets</div>
              <div className={styles.cardGlobeTitle}>
                India-first,
                <br />
                global where you need it
              </div>
            </div>
          </motion.div>

          <motion.div
            className={styles.cardGrowth}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: 0.12 }}
          >
            <div className={styles.growthKicker}>Illustrative pulse</div>
            <div className={styles.growthValue}>Live quotes</div>
            <div className={styles.growthSub}>Charts &amp; batch prices stay in sync</div>
            <MiniBars />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

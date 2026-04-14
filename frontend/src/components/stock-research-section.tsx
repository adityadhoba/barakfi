"use client";

import Link from "next/link";
import { LockedVerdict } from "@/components/locked-verdict";
import styles from "@/app/screener.module.css";
import { screeningUiLabel } from "@/lib/screening-status";

type PeerComparisonItem = {
  symbol: string;
  name: string;
  status: string;
  score: number;
  debt: number;
  nonHalal: number;
};

type Props = {
  complianceScore: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  peerComparison: PeerComparisonItem[];
};

const STATUS_BADGE: Record<string, string> = {
  HALAL: "badgeHalal",
  CAUTIOUS: "badgeReview",
  NON_COMPLIANT: "badgeFail",
};

function formatRatio(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function LockedMetricCell() {
  return (
    <span className={styles.peerLockPill}>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      Locked
    </span>
  );
}

export function StockResearchSection({
  complianceScore,
  passCount,
  warnCount,
  failCount,
  peerComparison,
}: Props) {
  const visiblePeers = peerComparison.slice(0, 2);
  const lockedPeers = peerComparison.slice(2);

  return (
    <>
      <div className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Quick analysis</h2>
        <p className={styles.sectionSub}>At-a-glance compliance scorecard</p>
      </div>
      <div className={styles.quickAnalysisCard}>
        <div className={styles.scoreRing}>
          <svg viewBox="0 0 120 120" className={styles.ringChart}>
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--emerald)" />
                <stop offset="100%" stopColor="var(--gold)" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="50" className={styles.ringBackground} />
            <circle
              cx="60"
              cy="60"
              r="50"
              className={styles.ringFill}
              style={{
                strokeDasharray: `${(complianceScore / 100) * 314.159} 314.159`,
              }}
            />
            <text x="60" y="60" className={styles.ringText}>
              {Math.round(complianceScore)}
            </text>
          </svg>
        </div>
        <div className={styles.scoreDetails}>
          <h3 className={styles.scoreTitle}>Compliance Score</h3>
          <p className={styles.scoreDescription}>
            {complianceScore >= 80
              ? "Excellent compliance across all metrics"
              : complianceScore >= 60
              ? "Good compliance with some areas to watch"
              : complianceScore >= 40
              ? "Fair compliance, requires review"
              : "Low compliance, significant concerns"}
          </p>
          <div className={styles.scoreBreakdown}>
            <div className={styles.breakdownRow}>
              <span className={styles.breakdownLabel}>Thresholds passed</span>
              <span className={`${styles.breakdownValue} ${styles.breakdownPass}`}>{passCount} of 5</span>
            </div>
            <div className={styles.breakdownRow}>
              <span className={styles.breakdownLabel}>Within 70%</span>
              <span className={`${styles.breakdownValue} ${styles.breakdownWarn}`}>{warnCount} of 5</span>
            </div>
            <div className={styles.breakdownRow}>
              <span className={styles.breakdownLabel}>Over threshold</span>
              <span className={`${styles.breakdownValue} ${styles.breakdownFail}`}>{failCount} of 5</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.sectionHeading} style={{ marginTop: 28 }}>
        <h2 className={styles.sectionTitle}>Peer comparison</h2>
        <p className={styles.sectionSub}>How this stock stacks up against similar companies</p>
      </div>

      <div className={`${styles.tableWrap} ${styles.tableWrapPeer}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Stock</th>
              <th style={{ textAlign: "center" }}>Status</th>
              <th style={{ textAlign: "right" }}>Score</th>
              <th style={{ textAlign: "right" }}>Debt/MCap</th>
              <th style={{ textAlign: "right" }}>Non-Halal</th>
            </tr>
          </thead>
          <tbody>
            {visiblePeers.map((peer) => (
              <tr key={peer.symbol}>
                <td>
                  <Link href={`/screening/${encodeURIComponent(peer.symbol)}`} style={{ color: "var(--emerald)", textDecoration: "none" }}>
                    <strong>{peer.symbol}</strong> {peer.name}
                  </Link>
                </td>
                <td style={{ textAlign: "center" }}>
                  <LockedVerdict symbol={peer.symbol} compact>
                    <span className={`${styles.badge} ${styles[STATUS_BADGE[peer.status] || "badgeReview"]}`}>
                      {screeningUiLabel(peer.status)}
                    </span>
                  </LockedVerdict>
                </td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                  {Math.round(peer.score)}
                </td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                  {formatRatio(peer.debt)}
                </td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                  {formatRatio(peer.nonHalal)}
                </td>
              </tr>
            ))}
            {lockedPeers.map((peer) => (
              <tr key={peer.symbol} className={styles.peerRowLocked}>
                <td>
                  <div className={styles.peerRowLinkLocked}>
                    <strong>{peer.symbol}</strong> {peer.name}
                  </div>
                </td>
                <td style={{ textAlign: "center" }}>
                  <LockedMetricCell />
                </td>
                <td style={{ textAlign: "right" }}>
                  <LockedMetricCell />
                </td>
                <td style={{ textAlign: "right" }}>
                  <LockedMetricCell />
                </td>
                <td style={{ textAlign: "right" }}>
                  <LockedMetricCell />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lockedPeers.length > 0 && (
        <div className={styles.peerPremiumCard}>
          <p className={styles.peerPremiumText}>
            Unlock the full peer comparison to reveal the remaining stocks and premium analysis.
          </p>
          <Link href="/premium" className={styles.peerPremiumCta}>
            Subscribe to Premium Membership
          </Link>
        </div>
      )}
    </>
  );
}

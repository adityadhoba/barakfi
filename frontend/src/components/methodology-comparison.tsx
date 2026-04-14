"use client";

import styles from "./methodology-comparison.module.css";

type MethodologyResult = {
  profile: string;
  status: string;
  reasons: string[];
  breakdown: {
    debt_ratio_value?: number;
    debt_ratio_threshold?: number;
    non_permissible_income_ratio: number;
    interest_income_ratio: number;
    receivables_ratio_value?: number;
    receivables_ratio_threshold?: number;
    cash_and_interest_bearing_to_assets_ratio: number;
    cash_ib_ratio_threshold?: number;
    sector_allowed: boolean;
  };
};

type MultiResult = {
  consensus_status: string;
  methodologies: Record<string, MethodologyResult>;
  summary: {
    halal_count: number;
    cautious_count: number;
    non_compliant_count: number;
    total: number;
  };
};

const PROFILE_LABELS: Record<string, { name: string; short: string; color: string }> = {
  sp_shariah: { name: "S&P Shariah Indices", short: "S&P", color: "#1e40af" },
  aaoifi: { name: "AAOIFI Standards", short: "AAOIFI", color: "#7c3aed" },
  ftse_maxis: { name: "FTSE Yasaar (Maxis)", short: "FTSE", color: "#0d9488" },
  khatkhatay: { name: "Khatkhatay Independent Norms", short: "Khatkhatay", color: "#f59e0b" },
};

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  HALAL: { label: "Shariah Compliant", className: "statusHalal" },
  CAUTIOUS: { label: "Requires Review", className: "statusCautious" },
  NON_COMPLIANT: { label: "Not Compliant", className: "statusFail" },
};

function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function MethodologyComparison({ data }: { data: MultiResult }) {
  const profiles = Object.entries(data.methodologies);
  const consensus = STATUS_STYLES[data.consensus_status] || STATUS_STYLES.CAUTIOUS;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Multi-Methodology Screening</h3>
          <p className={styles.subtitle}>
            Screened against {data.summary.total} international Shariah standards
          </p>
        </div>
        <div className={styles.consensusBox}>
          <span className={styles.consensusLabel}>Consensus</span>
          <span className={`${styles.consensusBadge} ${styles[consensus.className]}`}>
            {consensus.label}
          </span>
          <span className={styles.consensusCount}>
            {data.summary.halal_count}/{data.summary.total} pass
          </span>
        </div>
      </div>

      <div className={styles.grid}>
        {profiles.map(([code, result]) => {
          const profile = PROFILE_LABELS[code] || { name: code, short: code, color: "#6b7280" };
          const status = STATUS_STYLES[result.status] || STATUS_STYLES.CAUTIOUS;

          return (
            <div className={styles.methodCard} key={code}>
              <div className={styles.methodHeader}>
                <div className={styles.methodDot} style={{ background: profile.color }} />
                <div className={styles.methodInfo}>
                  <span className={styles.methodName}>{profile.name}</span>
                  <span className={`${styles.methodBadge} ${styles[status.className]}`}>
                    {status.label}
                  </span>
                </div>
              </div>

              <div className={styles.ratioGrid}>
                <div className={styles.ratioRow}>
                  <span className={styles.ratioLabel}>Debt Ratio</span>
                  <span className={styles.ratioValue}>
                    {formatPct(result.breakdown.debt_ratio_value ?? 0)}
                  </span>
                  <span className={styles.ratioThreshold}>
                    / {formatPct(result.breakdown.debt_ratio_threshold ?? 0.33)}
                  </span>
                  <div
                    className={`${styles.ratioIndicator} ${
                      (result.breakdown.debt_ratio_value ?? 0) < (result.breakdown.debt_ratio_threshold ?? 0.33)
                        ? styles.indicatorPass
                        : styles.indicatorFail
                    }`}
                  />
                </div>
                <div className={styles.ratioRow}>
                  <span className={styles.ratioLabel}>Non-permissible Income</span>
                  <span className={styles.ratioValue}>
                    {formatPct(result.breakdown.non_permissible_income_ratio)}
                  </span>
                  <span className={styles.ratioThreshold}>/ 5.0%</span>
                  <div
                    className={`${styles.ratioIndicator} ${
                      result.breakdown.non_permissible_income_ratio < 0.05
                        ? styles.indicatorPass
                        : styles.indicatorFail
                    }`}
                  />
                </div>
                <div className={styles.ratioRow}>
                  <span className={styles.ratioLabel}>Interest Income</span>
                  <span className={styles.ratioValue}>
                    {formatPct(result.breakdown.interest_income_ratio)}
                  </span>
                  <span className={styles.ratioThreshold}>/ 5.0%</span>
                  <div
                    className={`${styles.ratioIndicator} ${
                      result.breakdown.interest_income_ratio < 0.05
                        ? styles.indicatorPass
                        : styles.indicatorFail
                    }`}
                  />
                </div>
                <div className={styles.ratioRow}>
                  <span className={styles.ratioLabel}>Receivables</span>
                  <span className={styles.ratioValue}>
                    {formatPct(result.breakdown.receivables_ratio_value ?? 0)}
                  </span>
                  <span className={styles.ratioThreshold}>
                    / {formatPct(result.breakdown.receivables_ratio_threshold ?? 0.33)}
                  </span>
                  <div
                    className={`${styles.ratioIndicator} ${
                      (result.breakdown.receivables_ratio_value ?? 0) < (result.breakdown.receivables_ratio_threshold ?? 0.33)
                        ? styles.indicatorPass
                        : styles.indicatorFail
                    }`}
                  />
                </div>
                <div className={styles.ratioRow}>
                  <span className={styles.ratioLabel}>Cash & IB Securities</span>
                  <span className={styles.ratioValue}>
                    {formatPct(result.breakdown.cash_and_interest_bearing_to_assets_ratio)}
                  </span>
                  <span className={styles.ratioThreshold}>
                    / {formatPct(result.breakdown.cash_ib_ratio_threshold ?? 0.33)}
                  </span>
                  <div
                    className={`${styles.ratioIndicator} ${
                      result.breakdown.cash_and_interest_bearing_to_assets_ratio < (result.breakdown.cash_ib_ratio_threshold ?? 0.33)
                        ? styles.indicatorPass
                        : styles.indicatorFail
                    }`}
                  />
                </div>
                <div className={styles.ratioRow}>
                  <span className={styles.ratioLabel}>Sector</span>
                  <span className={styles.ratioValue}>
                    {result.breakdown.sector_allowed ? "Allowed" : "Prohibited"}
                  </span>
                  <span className={styles.ratioThreshold} />
                  <div
                    className={`${styles.ratioIndicator} ${
                      result.breakdown.sector_allowed
                        ? styles.indicatorPass
                        : styles.indicatorFail
                    }`}
                  />
                </div>
              </div>

              {result.reasons.length > 0 && result.status !== "HALAL" && (
                <div className={styles.reasonsList}>
                  {result.reasons.slice(0, 3).map((r, i) => (
                    <p className={styles.reason} key={i}>{r}</p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className={styles.disclaimer}>
        Each methodology uses different denominators and thresholds. A stock may be compliant under one
        standard but not another. The consensus reflects the majority verdict across all three.
      </p>
    </div>
  );
}

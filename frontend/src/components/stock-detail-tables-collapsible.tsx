"use client";

import styles from "./stock-detail-tables-collapsible.module.css";

export type StockDetailRatioRow = {
  label: string;
  value: string;
  limit: string;
};

export type StockDetailMethodologyRow = {
  methodology: string;
  status: "HALAL" | "CAUTIOUS" | "NON_COMPLIANT" | string;
  statusLabel: string;
  debt: string;
  nonPermIncome: string;
  interestIncome: string;
  receivables: string;
  cashIb: string;
  sector: string;
};

type Props = {
  ratioRows: StockDetailRatioRow[];
  methodologyCaption: string | null;
  methodologyRows: StockDetailMethodologyRow[] | null;
  /**
   * When true, panel stays expanded; summary acts as "Hide" (for /check flow with external open button).
   */
  pinnedOpen?: boolean;
  onRequestClose?: () => void;
};

function statusBadgeClass(status: string): string {
  if (status === "HALAL") return styles.badgeHalal;
  if (status === "NON_COMPLIANT") return styles.badgeFail;
  return styles.badgeReview;
}

export function StockDetailTablesCollapsible({
  ratioRows,
  methodologyCaption,
  methodologyRows,
  pinnedOpen,
  onRequestClose,
}: Props) {
  return (
    <div className={styles.wrap}>
      <details className={styles.details} open={pinnedOpen ? true : undefined}>
        <summary
          className={styles.summary}
          onClick={
            pinnedOpen && onRequestClose
              ? (e) => {
                  e.preventDefault();
                  onRequestClose();
                }
              : undefined
          }
        >
          <span className={styles.summaryLeft}>
            <span className={styles.summaryTitle}>
              {pinnedOpen ? "Hide full details" : "Financial ratios & methodology"}
            </span>
            <span className={styles.summaryHint}>
              {pinnedOpen
                ? "Ratios, methodology breakdown, and technical data"
                : "S&P-style metrics and all four methodology outcomes — expand for full tables"}
            </span>
          </span>
          <span className={styles.chevron} aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </summary>

        <div className={styles.body}>
          <section className={styles.section} aria-labelledby="stock-detail-ratios-heading">
            <h3 id="stock-detail-ratios-heading" className={styles.sectionTitle}>
              Financial ratios (primary profile)
            </h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Ratio</th>
                    <th scope="col" className={styles.num}>
                      Value
                    </th>
                    <th scope="col" className={styles.num}>
                      Limit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ratioRows.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td className={styles.num}>{row.value}</td>
                      <td className={styles.num}>{row.limit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="stock-detail-method-heading">
            <h3 id="stock-detail-method-heading" className={styles.sectionTitle}>
              Methodology results
            </h3>
            {methodologyCaption ? <p className={styles.caption}>{methodologyCaption}</p> : null}
            {methodologyRows && methodologyRows.length > 0 ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Methodology</th>
                      <th scope="col">Status</th>
                      <th scope="col" className={styles.num}>
                        Debt / limit
                      </th>
                      <th scope="col" className={styles.num}>
                        Non-perm. / 5%
                      </th>
                      <th scope="col" className={styles.num}>
                        Interest / limit
                      </th>
                      <th scope="col" className={styles.num}>
                        Receivables / limit
                      </th>
                      <th scope="col" className={styles.num}>
                        Cash &amp; IB / limit
                      </th>
                      <th scope="col">Sector</th>
                    </tr>
                  </thead>
                  <tbody>
                    {methodologyRows.map((row) => (
                      <tr key={row.methodology}>
                        <td>{row.methodology}</td>
                        <td>
                          <span className={`${styles.badge} ${statusBadgeClass(row.status)}`}>
                            {row.statusLabel}
                          </span>
                        </td>
                        <td className={styles.num}>{row.debt}</td>
                        <td className={styles.num}>{row.nonPermIncome}</td>
                        <td className={styles.num}>{row.interestIncome}</td>
                        <td className={styles.num}>{row.receivables}</td>
                        <td className={styles.num}>{row.cashIb}</td>
                        <td>{row.sector}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.emptyNote}>Multi-methodology data is not available for this symbol.</p>
            )}
          </section>
        </div>
      </details>
    </div>
  );
}

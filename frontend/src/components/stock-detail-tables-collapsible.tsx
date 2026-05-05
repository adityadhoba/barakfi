"use client";

import { useMemo, useState } from "react";
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

type ScreeningCardKey = "business_activity" | "interest_assets" | "interest_debt";

type Props = {
  businessRatio: string;
  businessRatioValue: number;
  businessLimit: string;
  businessNumerator: string;
  businessDenominator: string;
  interestAssetsRatio: string;
  interestAssetsRatioValue: number;
  interestAssetsLimit: string;
  interestAssetsNumerator: string;
  interestAssetsDenominator: string;
  interestDebtRatio: string;
  interestDebtRatioValue: number;
  interestDebtLimit: string;
  interestDebtNumerator: string;
  interestDebtDenominator: string;
  methodologyRows: StockDetailMethodologyRow[] | null;
};

function statusBadgeClass(status: string): string {
  if (status === "HALAL") return styles.badgeHalal;
  if (status === "NON_COMPLIANT") return styles.badgeFail;
  return styles.badgeReview;
}

export function StockDetailTablesCollapsible({
  businessRatio,
  businessRatioValue,
  businessLimit,
  businessNumerator,
  businessDenominator,
  interestAssetsRatio,
  interestAssetsRatioValue,
  interestAssetsLimit,
  interestAssetsNumerator,
  interestAssetsDenominator,
  interestDebtRatio,
  interestDebtRatioValue,
  interestDebtLimit,
  interestDebtNumerator,
  interestDebtDenominator,
  methodologyRows,
}: Props) {
  const [activeCard, setActiveCard] = useState<ScreeningCardKey>("business_activity");

  const aaofiiRow = useMemo(
    () =>
      methodologyRows?.find((row) => row.methodology.toLowerCase().includes("aaoifi")) ??
      methodologyRows?.[0] ??
      null,
    [methodologyRows]
  );

  const detail = useMemo(() => {
    if (activeCard === "business_activity") {
      return {
        title: "Business Activity",
        status: "Pass",
        value: businessRatio,
        valueNumeric: businessRatioValue,
        limit: businessLimit,
        numeratorLabel: "Non-permissible + doubtful sources",
        denominatorLabel: "Total revenue",
        numerator: businessNumerator,
        denominator: businessDenominator,
        formula: "(Non-permissible + doubtful sources) / (Total revenue)",
      };
    }
    if (activeCard === "interest_assets") {
      return {
        title: "Interest-bearing securities and assets",
        status: "Pass",
        value: interestAssetsRatio,
        valueNumeric: interestAssetsRatioValue,
        limit: interestAssetsLimit,
        numeratorLabel: "Cash + interest-bearing securities",
        denominatorLabel: "Total assets",
        numerator: interestAssetsNumerator,
        denominator: interestAssetsDenominator,
        formula: "(Cash + interest-bearing securities) / (Total assets)",
      };
    }
    return {
      title: "Interest-bearing debt",
      status: "Pass",
      value: interestDebtRatio,
      valueNumeric: interestDebtRatioValue,
      limit: interestDebtLimit,
      numeratorLabel: "Total interest-bearing debt",
      denominatorLabel: "Trailing 36-month average market cap",
      numerator: interestDebtNumerator,
      denominator: interestDebtDenominator,
      formula: "(Total interest-bearing debt) / (Trailing 36-month average market cap)",
    };
  }, [
    activeCard,
    businessRatio,
    businessRatioValue,
    businessLimit,
    businessNumerator,
    businessDenominator,
    interestAssetsRatio,
    interestAssetsRatioValue,
    interestAssetsLimit,
    interestAssetsNumerator,
    interestAssetsDenominator,
    interestDebtRatio,
    interestDebtRatioValue,
    interestDebtLimit,
    interestDebtNumerator,
    interestDebtDenominator,
  ]);

  return (
    <div className={styles.wrap}>
      <div className={styles.body}>
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>AAOIFI screening details</h3>
          <div className={styles.cardsGrid}>
            <button
              type="button"
              onClick={() => setActiveCard("business_activity")}
              className={`${styles.screeningCard} ${activeCard === "business_activity" ? styles.screeningCardActive : ""}`}
            >
              <span className={styles.cardBadge}>Pass</span>
              <span className={styles.cardTitle}>Business Activity</span>
              <span className={styles.cardSub}>Non-permissible + doubtful sources vs total revenue</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCard("interest_assets")}
              className={`${styles.screeningCard} ${activeCard === "interest_assets" ? styles.screeningCardActive : ""}`}
            >
              <span className={styles.cardBadge}>Pass</span>
              <span className={styles.cardTitle}>Interest-bearing securities and assets</span>
              <span className={styles.cardSub}>Cash and interest-bearing assets ratio</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCard("interest_debt")}
              className={`${styles.screeningCard} ${activeCard === "interest_debt" ? styles.screeningCardActive : ""}`}
            >
              <span className={styles.cardBadge}>Pass</span>
              <span className={styles.cardTitle}>Interest-bearing debt</span>
              <span className={styles.cardSub}>Total debt vs 36-month average market cap</span>
            </button>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.detailTitleRow}>
            <h4 className={styles.detailTitle}>{detail.title}</h4>
            <span className={`${styles.badge} ${styles.badgeHalal}`}>{detail.status}</span>
          </div>
          <div className={styles.gaugeWrap}>
            <div className={styles.gaugeTrack}>
              <div
                className={styles.gaugeFill}
                style={{ width: `${Math.max(0, Math.min(100, detail.valueNumeric * 100))}%` }}
              />
              <div className={styles.gaugeLimit} />
            </div>
            <div className={styles.gaugeLegend}>
              <span>{detail.value}</span>
              <span>Limit {detail.limit}</span>
            </div>
          </div>
          <div className={styles.kvGrid}>
            <div className={styles.kvItem}>
              <span>{detail.numeratorLabel}</span>
              <strong>{detail.numerator}</strong>
            </div>
            <div className={styles.kvItem}>
              <span>{detail.denominatorLabel}</span>
              <strong>{detail.denominator}</strong>
            </div>
            <div className={styles.kvItem}>
              <span>Formula</span>
              <strong>{detail.formula}</strong>
            </div>
          </div>
        </section>

        {aaofiiRow ? (
          <section className={styles.section} aria-labelledby="stock-detail-method-heading">
            <h3 id="stock-detail-method-heading" className={styles.sectionTitle}>
              AAOIFI methodology result
            </h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Methodology</th>
                    <th scope="col">Status</th>
                    <th scope="col" className={styles.num}>Debt / limit</th>
                    <th scope="col" className={styles.num}>Non-perm. / 5%</th>
                    <th scope="col" className={styles.num}>Interest / limit</th>
                    <th scope="col" className={styles.num}>Receivables / limit</th>
                    <th scope="col" className={styles.num}>Cash &amp; IB / limit</th>
                    <th scope="col">Sector</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{aaofiiRow.methodology}</td>
                    <td>
                      <span className={`${styles.badge} ${statusBadgeClass(aaofiiRow.status)}`}>
                        {aaofiiRow.statusLabel}
                      </span>
                    </td>
                    <td className={styles.num}>{aaofiiRow.debt}</td>
                    <td className={styles.num}>{aaofiiRow.nonPermIncome}</td>
                    <td className={styles.num}>{aaofiiRow.interestIncome}</td>
                    <td className={styles.num}>{aaofiiRow.receivables}</td>
                    <td className={styles.num}>{aaofiiRow.cashIb}</td>
                    <td>{aaofiiRow.sector}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import styles from "@/app/screener.module.css";

type Breakdown = {
  debt_to_36m_avg_market_cap_ratio: number;
  debt_to_market_cap_ratio: number;
  non_permissible_income_ratio: number;
  interest_income_ratio: number;
  receivables_to_market_cap_ratio: number;
  cash_and_interest_bearing_to_assets_ratio: number;
};

type MethodologyRow = {
  methodology: string;
  statusLabel: string;
  debt: string;
  nonPermIncome: string;
  interestIncome: string;
  receivables: string;
  cashIb: string;
  sector: string;
};

type Props = {
  breakdown: Breakdown;
  debtValue: number;
  debtDenominator: number;
  cashIbValue: number;
  cashIbDenominator: number;
  nonPermValue: number;
  nonPermDenominator: number;
  methodologyRows: MethodologyRow[] | null;
};

type ExplainerKey = "business_activity" | "interest_assets" | "interest_debt";

function pct(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}

function amount(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(v);
}

function cardStatus(value: number, limit: number): "pass" | "review" | "fail" {
  if (value <= limit * 0.7) return "pass";
  if (value <= limit) return "review";
  return "fail";
}

export function ScreeningExplainerCards({
  breakdown,
  debtValue,
  debtDenominator,
  cashIbValue,
  cashIbDenominator,
  nonPermValue,
  nonPermDenominator,
  methodologyRows,
}: Props) {
  const [active, setActive] = useState<ExplainerKey>("business_activity");

  const cards = useMemo(
    () => [
      {
        key: "business_activity" as const,
        title: "Business Activity",
        value: breakdown.non_permissible_income_ratio,
        limit: 0.05,
        subtitle: "Non-permissible + doubtful sources vs total revenue",
      },
      {
        key: "interest_assets" as const,
        title: "Interest-bearing securities and assets",
        value: breakdown.cash_and_interest_bearing_to_assets_ratio,
        limit: 0.33,
        subtitle: "Cash and interest-bearing assets ratio",
      },
      {
        key: "interest_debt" as const,
        title: "Interest-bearing debt",
        value: breakdown.debt_to_36m_avg_market_cap_ratio,
        limit: 0.33,
        subtitle: "Total debt vs 36-month average market cap",
      },
    ],
    [breakdown]
  );

  const activeCard = cards.find((c) => c.key === active) ?? cards[0];
  const status = cardStatus(activeCard.value, activeCard.limit);

  return (
    <section className={styles.screeningExplainerWrap} aria-label="Screening explainer">
      <div className={styles.screeningExplainerGrid}>
        <div className={styles.screeningExplainerCol}>
          <h3 className={styles.screeningExplainerHeading}>Business Screening</h3>
          <button
            type="button"
            className={`${styles.screeningExplainerCard} ${
              active === "business_activity" ? styles.screeningExplainerCardActive : ""
            }`}
            onClick={() => setActive("business_activity")}
          >
            <span className={styles.screeningExplainerBadge}>{cardStatus(cards[0].value, cards[0].limit).toUpperCase()}</span>
            <strong>{cards[0].title}</strong>
            <span>{cards[0].subtitle}</span>
          </button>
        </div>
        <div className={styles.screeningExplainerCol}>
          <h3 className={styles.screeningExplainerHeading}>Financial Screening</h3>
          <div className={styles.screeningExplainerFinancialCards}>
            {cards.slice(1).map((card) => (
              <button
                key={card.key}
                type="button"
                className={`${styles.screeningExplainerCard} ${
                  active === card.key ? styles.screeningExplainerCardActive : ""
                }`}
                onClick={() => setActive(card.key)}
              >
                <span className={styles.screeningExplainerBadge}>{cardStatus(card.value, card.limit).toUpperCase()}</span>
                <strong>{card.title}</strong>
                <span>{card.subtitle}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.screeningExplainerDetails}>
        <div className={styles.screeningExplainerDetailsHeader}>
          <h4>{activeCard.title}</h4>
          <span className={`${styles.badge} ${
            status === "pass" ? styles.badgeHalal : status === "review" ? styles.badgeReview : styles.badgeFail
          }`}>
            {status === "pass" ? "Pass" : status === "review" ? "Review" : "Fail"}
          </span>
        </div>

        {active === "business_activity" && (
          <div className={styles.screeningExplainerFormula}>
            <div className={styles.screeningExplainerMetricList}>
              <div><span>Non-permissible + doubtful income %</span><strong>{pct(breakdown.non_permissible_income_ratio)}</strong></div>
              <div><span>Total reference revenue</span><strong>{amount(nonPermDenominator)}</strong></div>
              <div><span>Numerator amount</span><strong>{amount(nonPermValue)}</strong></div>
              <div><span>Limit</span><strong>5.00%</strong></div>
            </div>
            <p className={styles.screeningExplainerEquation}>
              (Non-permissible + doubtful sources) / (Total revenue) = <strong>{pct(breakdown.non_permissible_income_ratio)}</strong>
            </p>
          </div>
        )}

        {active === "interest_assets" && (
          <div className={styles.screeningExplainerFormula}>
            <div className={styles.screeningExplainerMetricList}>
              <div><span>Cash & interest-bearing assets</span><strong>{amount(cashIbValue)}</strong></div>
              <div><span>Total assets</span><strong>{amount(cashIbDenominator)}</strong></div>
              <div><span>Ratio</span><strong>{pct(breakdown.cash_and_interest_bearing_to_assets_ratio)}</strong></div>
              <div><span>Limit</span><strong>33.00%</strong></div>
            </div>
            <p className={styles.screeningExplainerEquation}>
              (Cash + interest-bearing assets) / (Total assets) = <strong>{pct(breakdown.cash_and_interest_bearing_to_assets_ratio)}</strong>
            </p>
          </div>
        )}

        {active === "interest_debt" && (
          <div className={styles.screeningExplainerFormula}>
            <div className={styles.screeningExplainerMetricList}>
              <div><span>Total interest-bearing debt</span><strong>{amount(debtValue)}</strong></div>
              <div><span>Trailing 36-month average mcap</span><strong>{amount(debtDenominator)}</strong></div>
              <div><span>Ratio</span><strong>{pct(breakdown.debt_to_36m_avg_market_cap_ratio)}</strong></div>
              <div><span>Limit</span><strong>33.00%</strong></div>
            </div>
            <p className={styles.screeningExplainerEquation}>
              (Total debt) / (Trailing 36-month average market cap) = <strong>{pct(breakdown.debt_to_36m_avg_market_cap_ratio)}</strong>
            </p>
          </div>
        )}
      </div>

      {methodologyRows && methodologyRows.length > 0 && (
        <div className={styles.screeningExplainerMethodology}>
          <h4>Methodology comparison</h4>
          <p>Primary and alternate methodology outcomes are visible here by default.</p>
          <div className={styles.screeningExplainerTableWrap}>
            <table className={styles.screeningExplainerTable}>
              <thead>
                <tr>
                  <th>Methodology</th>
                  <th>Status</th>
                  <th>Debt</th>
                  <th>Non-perm.</th>
                  <th>Interest</th>
                  <th>Receivables</th>
                  <th>Cash & IB</th>
                  <th>Sector</th>
                </tr>
              </thead>
              <tbody>
                {methodologyRows.map((row) => (
                  <tr key={row.methodology}>
                    <td>{row.methodology}</td>
                    <td>{row.statusLabel}</td>
                    <td>{row.debt}</td>
                    <td>{row.nonPermIncome}</td>
                    <td>{row.interestIncome}</td>
                    <td>{row.receivables}</td>
                    <td>{row.cashIb}</td>
                    <td>{row.sector}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

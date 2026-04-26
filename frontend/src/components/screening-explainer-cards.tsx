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

type Props = {
  breakdown: Breakdown;
  debtValue: number;
  debtDenominator: number;
  cashIbValue: number;
  cashIbDenominator: number;
  nonPermValue: number;
  nonPermDenominator: number;
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

function clampPct(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

export function ScreeningExplainerCards({
  breakdown,
  debtValue,
  debtDenominator,
  cashIbValue,
  cashIbDenominator,
  nonPermValue,
  nonPermDenominator,
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
  const limitPct = activeCard.limit * 100;
  const valuePct = activeCard.value * 100;
  const normalizedOnGauge = clampPct((valuePct / (activeCard.limit * 2)) * 100);

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

        <div className={styles.screeningExplainerGauge} aria-label="AAOIFI threshold gauge">
          <div className={styles.screeningExplainerGaugeArc}>
            <div className={styles.screeningExplainerGaugeGood} />
            <div className={styles.screeningExplainerGaugeWarn} />
            <div className={styles.screeningExplainerGaugeBad} />
            <div
              className={styles.screeningExplainerGaugeNeedle}
              style={{ left: `${normalizedOnGauge}%` }}
            />
            <div className={styles.screeningExplainerGaugeValue}>{pct(activeCard.value)}</div>
          </div>
          <div className={styles.screeningExplainerGaugeLegend}>
            <span>
              <em className={styles.screeningExplainerLegendDotGood} />
              AAOIFI preferred range
            </span>
            <span>
              <em className={styles.screeningExplainerLegendDotWarn} />
              Near threshold
            </span>
            <span>
              <em className={styles.screeningExplainerLegendDotBad} />
              Over threshold
            </span>
            <strong>Limit: {limitPct.toFixed(2)}%</strong>
          </div>
        </div>
      </div>

    </section>
  );
}

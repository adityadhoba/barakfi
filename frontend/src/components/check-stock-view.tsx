"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckStockDiscovery } from "@/components/check-stock-discovery";
import { StockCheckFullDetails } from "@/components/stock-check-full-details";
import { StockCheckResultActions } from "@/components/stock-check-result-actions";
import { fetchCheckStockPageDataBrowser, type CheckStockPageResult } from "@/lib/check-stock-fetch-browser";
import { buildCheckSummaryBullets } from "@/lib/stock-detail-screening-tables";
import { useCheckStockSession } from "@/stores/check-stock-session";
import styles from "@/app/check/[symbol]/page.module.css";

function badgeClass(status: string): string {
  if (status === "Halal") return styles.badgeHalal;
  if (status === "Haram") return styles.badgeHaram;
  return styles.badgeDoubt;
}

function statusIcon(status: string): string {
  if (status === "Halal") return "✅";
  if (status === "Haram") return "❌";
  return "⚠️";
}

function bulletClass(variant: "pass" | "fail" | "review"): string {
  if (variant === "fail") return styles.bulletFail;
  if (variant === "review") return styles.bulletReview;
  return styles.bulletPass;
}

function bulletMark(variant: "pass" | "fail" | "review"): string {
  if (variant === "fail") return "✗";
  if (variant === "review") return "⚠";
  return "✔";
}

type Props = {
  symbol: string;
};

export function CheckStockView({ symbol }: Props) {
  const setSessionPayload = useCheckStockSession((s) => s.setPayload);
  const symU = symbol.trim().toUpperCase();
  const [fullDetails, setFullDetails] = useState(false);
  const detailsAnchorRef = useRef<HTMLDivElement>(null);

  const [{ data, loading }, setView] = useState(() => {
    const cached = useCheckStockSession.getState().payload;
    if (cached?.stock.symbol === symU) {
      return {
        data: {
          kind: "ok" as const,
          check: cached.check,
          stock: cached.stock,
          screening: cached.screening,
          multi: cached.multi,
        },
        loading: false,
      };
    }
    return { data: null as CheckStockPageResult | null, loading: true };
  });

  useEffect(() => {
    let cancelled = false;
    const cached = useCheckStockSession.getState().payload;
    if (cached?.stock.symbol === symU) {
      queueMicrotask(() => {
        if (cancelled) return;
        setView({
          data: {
            kind: "ok",
            check: cached.check,
            stock: cached.stock,
            screening: cached.screening,
            multi: cached.multi,
          },
          loading: false,
        });
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (cancelled) return;
      setView({ data: null, loading: true });
    });

    void (async () => {
      const result = await fetchCheckStockPageDataBrowser(symU);
      if (cancelled) return;
      if (result.kind === "ok") {
        setSessionPayload({
          check: result.check,
          stock: result.stock,
          screening: result.screening,
          multi: result.multi,
        });
      }
      setView({ data: result, loading: false });
    })();

    return () => {
      cancelled = true;
    };
  }, [symU, setSessionPayload]);

  const summaryBullets = useMemo(() => {
    if (!data || data.kind !== "ok") return null;
    return buildCheckSummaryBullets(data.screening);
  }, [data]);

  useEffect(() => {
    if (!fullDetails) return;
    const id = requestAnimationFrame(() => {
      detailsAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [fullDetails]);

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Loading…</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  if (data.kind === "not_found") {
    notFound();
  }

  if (data.kind === "error") {
    return (
      <div className={styles.page}>
        <p style={{ color: "var(--red)" }}>{data.message}</p>
        <Link href="/" className={styles.back}>
          ← Back home
        </Link>
      </div>
    );
  }

  const { check, stock, screening, multi } = data;

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.back}>
        ← Back to check
      </Link>

      <div className={styles.card}>
        <h1 className={styles.name}>{check.name}</h1>
        <div className={styles.symbolMuted}>{stock.symbol}</div>
        <div className={`${styles.statusLine} ${badgeClass(check.status)}`}>
          <span className={styles.statusEmoji} aria-hidden>
            {statusIcon(check.status)}
          </span>
          <span className={styles.statusLabel}>{check.status}</span>
        </div>
        <div className={styles.scoreBlock}>
          <span className={styles.score}>{check.score}</span>
          <span className={styles.scoreSuffix}>/ 100</span>
        </div>
        {summaryBullets && summaryBullets.bullets.length > 0 ? (
          <ul className={styles.bulletList}>
            {summaryBullets.bullets.map((line) => (
              <li key={line} className={`${styles.bulletItem} ${bulletClass(summaryBullets.variant)}`}>
                <span className={styles.bulletMark} aria-hidden>
                  {bulletMark(summaryBullets.variant)}
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <StockCheckResultActions
          symbol={stock.symbol}
          name={check.name}
          score={check.score}
          status={check.status}
          detailsOpen={fullDetails}
          onToggleDetails={() => setFullDetails((o) => !o)}
        />
      </div>

      <section className={styles.trustCard} aria-labelledby="check-trust-heading">
        <h2 id="check-trust-heading" className={styles.trustTitle}>
          How we determine Halal status
        </h2>
        <ul className={styles.trustList}>
          <li className={styles.trustItem}>
            <span className={styles.trustCheck} aria-hidden>
              ✔
            </span>
            <span>Based on AAOIFI, S&amp;P Shariah standards</span>
          </li>
          <li className={styles.trustItem}>
            <span className={styles.trustCheck} aria-hidden>
              ✔
            </span>
            <span>Uses financial ratios like debt and income</span>
          </li>
          <li className={styles.trustItem}>
            <span className={styles.trustCheck} aria-hidden>
              ✔
            </span>
            <span>Regularly updated data</span>
          </li>
        </ul>
        <p className={styles.trustDisclaimer}>
          This is an automated screening tool and not financial or religious advice
        </p>
      </section>

      <CheckStockDiscovery excludeSymbol={stock.symbol} />

      {fullDetails ? (
        <div ref={detailsAnchorRef} className={styles.expandWrap}>
          <StockCheckFullDetails screening={screening} multi={multi} />
        </div>
      ) : null}

    </div>
  );
}

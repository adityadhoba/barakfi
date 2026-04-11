"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckStockDiscovery } from "@/components/check-stock-discovery";
import { StockCheckFullDetails } from "@/components/stock-check-full-details";
import { StockCheckResultActions } from "@/components/stock-check-result-actions";
import { fetchCheckStockPageDataBrowser, type CheckStockPageResult } from "@/lib/check-stock-fetch-browser";
import {
  resolveCheckPageSummaryBullets,
  type CheckPageBullets,
} from "@/lib/stock-detail-screening-tables";
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

function variantFromBulletTone(tone: string): "pass" | "fail" | "review" {
  if (tone === "error") return "fail";
  if (tone === "warning") return "review";
  return "pass";
}

function hasBullets(b: CheckPageBullets | null): b is CheckPageBullets {
  if (!b) return false;
  if (b.mode === "toned") return b.items.length > 0;
  return b.bullets.length > 0;
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
    return resolveCheckPageSummaryBullets(data.check, data.screening, data.multi);
  }, [data]);

  useEffect(() => {
    if (!fullDetails) return;
    const id = requestAnimationFrame(() => {
      detailsAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [fullDetails]);

  if (!loading && !data) {
    return null;
  }

  if (!loading && data?.kind === "not_found") {
    notFound();
  }

  if (!loading && data?.kind === "error") {
    return (
      <div className={styles.page}>
        <p style={{ color: "var(--red)" }}>{data.message}</p>
        <Link href="/" className={styles.back}>
          ← Back home
        </Link>
      </div>
    );
  }

  const okData = !loading && data?.kind === "ok" ? data : null;

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.back}>
        ← Back to check
      </Link>

      {loading ? (
        <div className={styles.skeletonCard} aria-busy="true" aria-live="polite">
          <div className={styles.spinnerRow}>
            <span className={styles.spinner} aria-hidden />
            <span className={styles.spinnerLabel}>Getting instant Halal status…</span>
          </div>
          <div className={`${styles.skelPulse} ${styles.skelTitle}`} />
          <div className={`${styles.skelPulse} ${styles.skelLineShort}`} />
          <div className={`${styles.skelPulse} ${styles.skelPill}`} />
          <div className={`${styles.skelPulse} ${styles.skelScore}`} />
          <div className={`${styles.skelPulse} ${styles.skelBullet}`} />
          <div className={`${styles.skelPulse} ${styles.skelBullet}`} />
          <div className={`${styles.skelPulse} ${styles.skelBullet}`} />
          <div className={styles.skelActions}>
            <div className={`${styles.skelPulse} ${styles.skelBtn}`} />
            <div className={`${styles.skelPulse} ${styles.skelBtn}`} />
          </div>
          <p className={styles.delayHint}>Large universes or cold servers can take a few seconds — hang tight.</p>
        </div>
      ) : null}

      {okData ? (
        <div className={styles.resultStack}>
          <div className={styles.card}>
            <h1 className={styles.name}>{okData.check.name}</h1>
            <div className={styles.symbolMuted}>{okData.stock.symbol}</div>
            <div className={`${styles.statusLine} ${badgeClass(okData.check.status)}`}>
              <span className={styles.statusEmoji} aria-hidden>
                {statusIcon(okData.check.status)}
              </span>
              <span className={styles.statusLabel}>{okData.check.status}</span>
            </div>
            <div className={styles.scoreBlock}>
              <span className={styles.score}>{okData.check.score}</span>
              <span className={styles.scoreSuffix}>/ 100</span>
            </div>
            {hasBullets(summaryBullets) ? (
              <ul className={styles.bulletList}>
                {summaryBullets.mode === "toned"
                  ? summaryBullets.items.map((item, idx) => {
                      const v = variantFromBulletTone(item.tone);
                      return (
                        <li
                          key={`${idx}-${item.text.slice(0, 48)}`}
                          className={`${styles.bulletItem} ${bulletClass(v)}`}
                        >
                          <span className={styles.bulletMark} aria-hidden>
                            {bulletMark(v)}
                          </span>
                          <span>{item.text}</span>
                        </li>
                      );
                    })
                  : summaryBullets.bullets.map((line, idx) => (
                      <li
                        key={`${idx}-${line.slice(0, 48)}`}
                        className={`${styles.bulletItem} ${bulletClass(summaryBullets.variant)}`}
                      >
                        <span className={styles.bulletMark} aria-hidden>
                          {bulletMark(summaryBullets.variant)}
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
              </ul>
            ) : null}
            <StockCheckResultActions
              symbol={okData.stock.symbol}
              name={okData.check.name}
              score={okData.check.score}
              status={okData.check.status}
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

          <CheckStockDiscovery excludeSymbol={okData.stock.symbol} />

          {fullDetails ? (
            <div ref={detailsAnchorRef} className={styles.expandWrap}>
              <StockCheckFullDetails screening={okData.screening} multi={okData.multi} />
            </div>
          ) : null}
        </div>
      ) : null}

    </div>
  );
}

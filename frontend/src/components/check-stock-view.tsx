"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StockDetailTablesCollapsible } from "@/components/stock-detail-tables-collapsible";
import { StockCheckResultActions } from "@/components/stock-check-result-actions";
import { fetchCheckStockPageDataBrowser, type CheckStockPageResult } from "@/lib/check-stock-fetch-browser";
import {
  buildCheckSummaryBullets,
  buildMethodologyTableRowsFromMulti,
  buildPrimaryRatioTableRows,
  methodologyTableCaption,
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

  const tables = useMemo(() => {
    if (!data || data.kind !== "ok") return null;
    const { screening, multi } = data;
    return {
      ratioRows: buildPrimaryRatioTableRows(screening),
      methodologyRows: multi ? buildMethodologyTableRowsFromMulti(multi) : null,
      methodologyCaption: multi ? methodologyTableCaption(multi) : null,
    };
  }, [data]);

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

  const { check, stock } = data;

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

      {fullDetails && tables ? (
        <div ref={detailsAnchorRef} className={styles.expandWrap}>
          <StockDetailTablesCollapsible
            ratioRows={tables.ratioRows}
            methodologyCaption={tables.methodologyCaption}
            methodologyRows={tables.methodologyRows}
            pinnedOpen
            onRequestClose={() => setFullDetails(false)}
          />
          <p className={styles.fullDetailsFootnote}>
            Methodology labels and ratios are for information only — not religious advice. See{" "}
            <Link href="/methodology">methodology</Link> and <Link href="/disclaimer">disclaimer</Link>.
          </p>
        </div>
      ) : null}

    </div>
  );
}

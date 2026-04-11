"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StockDetailTablesCollapsible } from "@/components/stock-detail-tables-collapsible";
import { StockCheckResultActions } from "@/components/stock-check-result-actions";
import { fetchCheckStockPageDataBrowser, type CheckStockPageResult } from "@/lib/check-stock-fetch-browser";
import {
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

type Props = {
  symbol: string;
};

export function CheckStockView({ symbol }: Props) {
  const setSessionPayload = useCheckStockSession((s) => s.setPayload);
  const symU = symbol.trim().toUpperCase();

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
        <div className={styles.symbol}>{stock.symbol}</div>
        <h1 className={styles.name}>{check.name}</h1>
        <div className={`${styles.badge} ${badgeClass(check.status)}`}>{check.status}</div>
        <div className={styles.score}>{check.score}</div>
        <div className={styles.scoreSuffix}>/ 100 compliance score</div>
        <p className={styles.summary}>{check.summary}</p>
        {!check.details_available && (
          <p className={styles.detailsNote}>
            Some fundamentals are missing — treat this score as indicative and open full analysis for context.
          </p>
        )}
        <StockCheckResultActions symbol={stock.symbol} />
      </div>

      {tables ? (
        <div className={styles.expandWrap}>
          <StockDetailTablesCollapsible
            ratioRows={tables.ratioRows}
            methodologyCaption={tables.methodologyCaption}
            methodologyRows={tables.methodologyRows}
          />
        </div>
      ) : null}
    </div>
  );
}

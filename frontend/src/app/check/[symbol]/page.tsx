import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StockDetailTablesCollapsible } from "@/components/stock-detail-tables-collapsible";
import { StockCheckResultActions } from "@/components/stock-check-result-actions";
import { fetchCheckStockPageData } from "@/lib/check-stock-fetch";
import {
  buildMethodologyTableRowsFromMulti,
  buildPrimaryRatioTableRows,
  methodologyTableCaption,
} from "@/lib/stock-detail-screening-tables";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  return {
    title: `${symbol} — Halal check | Barakfi`,
    description: `Instant Shariah screening result for ${symbol}.`,
  };
}

function badgeClass(status: string): string {
  if (status === "Halal") return styles.badgeHalal;
  if (status === "Haram") return styles.badgeHaram;
  return styles.badgeDoubt;
}

export default async function CheckStockPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const data = await fetchCheckStockPageData(symbol);

  if (data.kind === "not_found") {
    notFound();
  }
  if (data.kind === "error") {
    return (
      <main className="shellPage">
        <div className={styles.page}>
          <p style={{ color: "var(--red)" }}>{data.message}</p>
          <Link href="/" className={styles.back}>
            ← Back home
          </Link>
        </div>
      </main>
    );
  }

  const { check, stock, screening, multi } = data;
  const ratioRows = buildPrimaryRatioTableRows(screening);
  const methodologyRows = multi ? buildMethodologyTableRowsFromMulti(multi) : null;
  const methodologyCaption = multi ? methodologyTableCaption(multi) : null;

  return (
    <main className="shellPage">
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

        <div className={styles.expandWrap}>
          <StockDetailTablesCollapsible
            ratioRows={ratioRows}
            methodologyCaption={methodologyCaption}
            methodologyRows={methodologyRows}
          />
        </div>
      </div>
    </main>
  );
}

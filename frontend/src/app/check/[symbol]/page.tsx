import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StockCheckResultPanel } from "@/components/stock-check-result-panel";
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
  const reasonLines = [...screening.reasons, ...screening.manual_review_flags];

  return (
    <main className="shellPage">
      <div className={styles.page}>
        <Link href="/" className={styles.back}>
          ← Back
        </Link>

        <StockCheckResultPanel
          check={check}
          symbol={stock.symbol}
          detailsAvailable={check.details_available}
          ratioRows={ratioRows}
          methodologyCaption={methodologyCaption}
          methodologyRows={methodologyRows}
          reasonLines={reasonLines}
        />
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getStocks } from "@/lib/api";
import { CompareTable } from "@/components/compare-table";
import styles from "@/app/screener.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compare Stocks — BarakFi",
  description:
    "Compare Shariah compliance, key financial ratios, and market context side by side for Indian stocks.",
  alternates: { canonical: "https://barakfi.in/compare" },
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ symbols?: string }>;
}) {
  const authState = await auth();
  if (!authState.userId) {
    const { symbols } = await searchParams;
    const redirectPath = symbols?.trim()
      ? `/compare?symbols=${encodeURIComponent(symbols)}`
      : "/compare";
    redirect(`/sign-in?redirect_url=${encodeURIComponent(redirectPath)}`);
  }

  const { symbols: rawSymbols } = await searchParams;
  const initialSymbols = rawSymbols
    ? rawSymbols
        .split(",")
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 3)
    : [];

  const stocks = await getStocks({ limit: 500, orderBy: "market_cap_desc", revalidateSeconds: 600 }).catch(() => []);

  return (
    <main className={`${styles.screenerPage} ${styles.screenerPageFlow}`}>
      <div className={styles.screenerContainer}>
        <CompareTable allStocks={stocks} initialSymbols={initialSymbols} mode="select" />
      </div>
    </main>
  );
}

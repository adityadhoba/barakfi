import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DM_Serif_Display, Inter } from "next/font/google";
import { getStocks } from "@/lib/api";
import { CompareHtmlPage } from "@/components/compare-html-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compare Results — Barakfi",
  description:
    "Review Shariah compliance, financial ratios, and market data side by side for selected Indian stocks.",
};

const compareSans = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--tools-font-sans",
});

const compareDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--tools-font-display",
});

export default async function CompareResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ symbols?: string }>;
}) {
  const { symbols: rawSymbols } = await searchParams;

  const requestedSymbols = rawSymbols
    ? rawSymbols
        .split(",")
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 3)
    : [];

  const authState = await auth();
  if (!authState.userId) {
    const requestedQuery = requestedSymbols.join(",");
    const redirectPath = requestedQuery
      ? `/compare/results?symbols=${requestedQuery}`
      : "/compare/results";
    redirect(`/sign-in?redirect_url=${encodeURIComponent(redirectPath)}`);
  }

  const stocks = await getStocks({ limit: 500, orderBy: "market_cap_desc", revalidateSeconds: 600 }).catch(() => []);

  return (
    <main className={`${compareSans.variable} ${compareDisplay.variable}`}>
      <CompareHtmlPage allStocks={stocks} initialSymbols={requestedSymbols} mode="results" />
    </main>
  );
}

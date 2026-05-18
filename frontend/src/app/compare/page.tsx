import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DM_Serif_Display, Inter } from "next/font/google";
import { getStocks } from "@/lib/api";
import { CompareHtmlPage } from "@/components/compare-html-page";
import { StockPageRouteShell } from "@/components/stock-page-route-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compare Stocks — BarakFi",
  description:
    "Compare Shariah compliance, key financial ratios, and market context side by side for Indian stocks.",
  alternates: { canonical: "https://barakfi.in/compare" },
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
    <main className={`${compareSans.variable} ${compareDisplay.variable}`}>
      <StockPageRouteShell>
        <CompareHtmlPage allStocks={stocks} initialSymbols={initialSymbols} mode="select" />
      </StockPageRouteShell>
    </main>
  );
}

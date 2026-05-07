import type { Metadata } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import { getStocks, type Stock } from "@/lib/api";
import { ToolsPageClient, type ToolTab } from "./tools-page-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Islamic Finance Tools — Purification, Zakat, Compare | Barakfi",
  description:
    "Use BarakFi’s calculators and investor workflows in one place: purification, zakat, compare stocks, and request coverage.",
  alternates: { canonical: "https://barakfi.in/tools" },
};

const toolsSans = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--tools-font-sans",
});

const toolsDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--tools-font-display",
});

function resolveInitialTab(rawTab: string | undefined): ToolTab {
  switch (rawTab) {
    case "zakat":
    case "compare":
    case "request":
    case "purification":
      return rawTab;
    default:
      return "purification";
  }
}

export default async function ToolsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }> | { tab?: string };
}) {
  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams;
  const initialTab = resolveInitialTab(resolvedSearchParams?.tab);
  const stocks = await getStocks({ limit: 500, orderBy: "market_cap_desc", revalidateSeconds: 600 }).catch(() => [] as Stock[]);
  return (
    <div className={`${toolsSans.variable} ${toolsDisplay.variable}`}>
      <ToolsPageClient stocks={stocks} initialTab={initialTab} />
    </div>
  );
}

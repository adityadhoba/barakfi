import type { Metadata } from "next";
import { getStocks, type Stock } from "@/lib/api";
import { ToolsPageClient } from "./tools-page-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Islamic Finance Tools — Purification, Zakat, Compare | Barakfi",
  description:
    "Use BarakFi’s calculators and investor workflows in one place: purification, zakat, compare stocks, and request coverage.",
  alternates: { canonical: "https://barakfi.in/tools" },
};

export default async function ToolsPage() {
  const stocks = await getStocks({ limit: 500, orderBy: "market_cap_desc", revalidateSeconds: 600 }).catch(() => [] as Stock[]);
  return <ToolsPageClient stocks={stocks} />;
}

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

const compareUiOverrides = `
  .comparePageWrap { max-width: 1520px; margin: 0 auto; padding-bottom: 72px; }
  .cmpHero { max-width: 1520px; margin: 0 auto; padding: 62px 72px 0; }
  .cmpTitle { font-size: clamp(56px, 6.2vw, 92px); line-height: 0.96; letter-spacing: -0.02em; }
  .cmpSub { font-size: 35px; font-size: 15px; line-height: 1.75; max-width: 760px; margin-top: 16px; }
  .cmpStats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid rgba(230,226,216,.12); border-bottom: 1px solid rgba(230,226,216,.12); margin-top: 34px; }
  .cmpStat { padding: 22px 20px; border-right: 1px solid rgba(230,226,216,.12); }
  .cmpStat:last-child { border-right: 0; }
  .cmpStatNum { font-size: 48px; }
  .cmpStatLabel { text-transform: uppercase; letter-spacing: .13em; font-size: 11px; margin-top: 4px; }
  .cmpSearchSection { max-width: 1520px; margin: 0 auto; padding: 34px 72px 0; }
  .cmpSearchGrid { grid-template-columns: 1fr 1fr 1fr 156px; gap: 14px; align-items: end; }
  .cmpSlotBox { min-height: 168px; padding: 16px 20px; }
  .cmpSlotInput { font-size: 32px; line-height: 1.06; padding: 8px 0 2px; }
  .cmpChipTicker { font-size: 16px; }
  .cmpChipName { font-size: 13px; }
  .cmpBtn { width: 156px; height: 168px; padding: 0 20px; font-size: 13px; letter-spacing: .14em; }
  .cmpBtnArrow { font-size: 32px; }
  .cmpPresets { max-width: 1520px; margin: 0 auto; padding: 16px 72px 0; }
  .cmpResults { max-width: 1520px; margin: 0 auto; padding: 44px 72px 84px; }
  @media (max-width: 900px) {
    .cmpHero, .cmpSearchSection, .cmpPresets, .cmpResults { padding-left: 20px; padding-right: 20px; }
    .cmpStats { grid-template-columns: 1fr 1fr; }
    .cmpSearchGrid { grid-template-columns: 1fr; }
    .cmpBtn { width: 100%; height: 56px; flex-direction: row; }
    .cmpTitle { font-size: clamp(44px, 12vw, 62px); }
  }
`;

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
      <style jsx global>{compareUiOverrides}</style>
    </main>
  );
}

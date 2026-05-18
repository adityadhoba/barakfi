import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { DM_Serif_Display, Inter } from "next/font/google";
import { getStocks } from "@/lib/api";
import { CompareHtmlPage } from "@/components/compare-html-page";
import { GlobalMarketTicker } from "@/components/global-market-ticker";
import { GlobalNavBar } from "@/components/global-nav-bar";
import styles from "./compare.module.css";
import toolStyles from "@/app/tools/tools.module.css";

const compareSans = Inter({ subsets: ["latin"] });
const compareDisplay = DM_Serif_Display({ subsets: ["latin"], weight: "400" });

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
    <main className={`${styles.page} ${compareSans.className} ${compareDisplay.className}`}>
      {/* Market Ticker */}
      <GlobalMarketTicker />

      {/* Global Navigation Bar */}
      <GlobalNavBar />

      {/* Always show compare page, with modal overlay for guests */}
      <div className={toolStyles.pageWrap}>
        <CompareHtmlPage allStocks={stocks} initialSymbols={initialSymbols} mode="select" />
      </div>

      {/* Modal overlay for guests */}
      {!authState.userId && (
        <div className={styles.gateModal}>
          <div className={styles.gateModalContent}>
            <h1 className={styles.gateTitle}>Sign in to Compare</h1>
            <p className={styles.gateDescription}>
              Compare Shariah compliance, financial ratios, and market metrics for Indian stocks.
            </p>
            <div className={styles.gateButtonsContainer}>
              <Link href="/sign-in" className={`${styles.gateButton} ${styles.gateButtonPrimary}`}>
                Sign In
              </Link>
              <Link href="/sign-up" className={`${styles.gateButton} ${styles.gateButtonSecondary}`}>
                Create Account
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

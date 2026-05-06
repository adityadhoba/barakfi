import type { Metadata } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import { getBulkScreeningResults, getCollections, getStocks, getSuperInvestors, type Collection, type Stock, type SuperInvestorSummary } from "@/lib/api";
import { ExplorePageClient, type ExploreFeaturedStock, type ExploreLearnCard, type ExploreAcademyCard } from "./explore-page-client";

export const dynamic = "force-dynamic";

const exploreSans = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--explore-font-sans",
});

const exploreDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--explore-font-display",
});

export const metadata: Metadata = {
  title: "Explore — Collections, Halal Stocks, Learn & Academy | Barakfi",
  description:
    "Explore curated stock collections, compliant Indian stocks, learning guides, super investors, and academy resources in one Barakfi discovery hub.",
  alternates: { canonical: "https://barakfi.in/explore" },
};

const LEARN_CARDS: ExploreLearnCard[] = [
  {
    href: "/learn/what-is-halal-investing",
    category: "Shariah Basics · Beginner",
    title: "What does it mean for a stock to be Shariah-compliant?",
    description: "A plain-language explanation of the four criteria used to screen stocks — debt ratio, interest income, business activity, and receivables — and why each matters in Islamic finance.",
    meta: "8 min read",
  },
  {
    href: "/methodology",
    category: "Screening Method",
    title: "How BarakFi screens stocks: the AAOIFI methodology explained",
    description: "A deep dive into the Accounting and Auditing Organization for Islamic Financial Institutions (AAOIFI) standard and how we apply it to NSE and BSE stocks.",
    meta: "12 min read",
  },
  {
    href: "/stocks/RELIANCE",
    category: "Case Study",
    title: "Is Reliance Industries Shariah-compliant? A full ratio analysis",
    description: "We walk through every ratio for India's largest company — explaining why RELIANCE currently shows \"Requires Review\" and what that means for your research.",
    meta: "10 min read",
  },
  {
    href: "/tools/purification",
    category: "Purification · Practical",
    title: "How to calculate dividend purification — step by step",
    description: "When a compliant stock earns small amounts of non-permissible income, shareholders need to purify their proportional share. This guide shows you how.",
    meta: "6 min read",
  },
  {
    href: "/tools/zakat",
    category: "Zakat",
    title: "How to calculate Zakat on your stock portfolio in India",
    description: "The two main scholarly approaches to Zakat on shares — the Zakatable Assets Method and the Market Value Method — explained with worked examples using Indian stocks.",
    meta: "9 min read",
  },
  {
    href: "/screener",
    category: "How-To Guide",
    title: "Using the BarakFi screener: a complete walkthrough",
    description: "From filtering by sector and compliance status to reading ratio breakdowns and building a watchlist — everything you need to get the most from the screener.",
    meta: "7 min read",
  },
  {
    href: "/collections/halal-it-stocks",
    category: "Case Study",
    title: "Why IT stocks are almost always Shariah-compliant",
    description: "The Indian IT sector — TCS, Infosys, Wipro, HCL — passes all four screening criteria almost universally. We explain why service businesses are structurally clean.",
    meta: "6 min read",
  },
];

const ACADEMY_CARDS: ExploreAcademyCard[] = [
  {
    href: "/learn/what-is-halal-investing",
    number: "01",
    level: "Beginner · Foundation",
    title: "Shariah Investing 101",
    description: "The starting point. What is Shariah-compliant investing, why does it matter, and how does screening work in the context of Indian equity markets?",
    lessons: 4,
  },
  {
    href: "/methodology",
    number: "02",
    level: "Beginner · Screening",
    title: "Reading Compliance Ratios",
    description: "Learn to read and interpret the four financial ratios used in Shariah screening — with real examples from TCS, Reliance, and HDFC Bank.",
    lessons: 4,
  },
  {
    href: "/tools/purification",
    number: "03",
    level: "Intermediate · Practical",
    title: "Purification & Zakat Tools",
    description: "Understand how to translate screening results into practical investor actions using purification and zakat calculators built for Indian portfolios.",
    lessons: 4,
  },
  {
    href: "/screener",
    number: "04",
    level: "Advanced · Workflow",
    title: "Building a Halal Research Process",
    description: "Move from one-off stock checks to a repeatable research workflow using collections, compare, watchlist, and screen-first portfolio review.",
    lessons: 4,
  },
];

function buildFeaturedStocks(stocks: Stock[], screening: Awaited<ReturnType<typeof getBulkScreeningResults>>): ExploreFeaturedStock[] {
  const screeningMap = new Map(screening.map((item) => [item.symbol.toUpperCase(), item.status]));
  return stocks.slice(0, 10).map((stock) => ({
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    price: stock.price,
    marketCap: stock.market_cap,
    exchange: stock.exchange,
    status: screeningMap.get(stock.symbol.toUpperCase()) ?? null,
  }));
}

export default async function ExplorePage() {
  const [collections, investors, stocks] = await Promise.all([
    getCollections().catch(() => [] as Collection[]),
    getSuperInvestors().catch(() => [] as SuperInvestorSummary[]),
    getStocks({ limit: 200, orderBy: "market_cap_desc", revalidateSeconds: 600 }).catch(() => [] as Stock[]),
  ]);

  const symbols = stocks.map((stock) => stock.symbol);
  const screeningResults = symbols.length > 0 ? await getBulkScreeningResults(symbols).catch(() => []) : [];
  const statusMap = new Map(screeningResults.map((result) => [result.symbol.toUpperCase(), result.status]));

  const indianStocks = stocks.filter((stock) => {
    const exchange = (stock.exchange || "").toUpperCase();
    return exchange === "NSE" || exchange === "BSE";
  });

  const halalStocks = indianStocks.filter((stock) => statusMap.get(stock.symbol.toUpperCase()) === "HALAL");
  const reviewStocks = indianStocks.filter((stock) => statusMap.get(stock.symbol.toUpperCase()) === "CAUTIOUS");
  const topSectors = Object.entries(
    halalStocks.reduce<Record<string, number>>((acc, stock) => {
      acc[stock.sector] = (acc[stock.sector] || 0) + 1;
      return acc;
    }, {}),
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const featuredCollections = collections;
  const featuredInvestors = investors.slice(0, 5);
  const featuredStocks = buildFeaturedStocks(halalStocks.slice(0, 12), screeningResults);
  const sectorCount = new Set(halalStocks.map((stock) => stock.sector)).size;

  return (
    <div className={`${exploreSans.variable} ${exploreDisplay.variable}`}>
      <ExplorePageClient
      collections={featuredCollections}
      collectionsTotal={collections.length}
      compliantCount={halalStocks.length}
      reviewCount={reviewStocks.length}
      screenedCount={indianStocks.length}
      sectorCount={sectorCount}
      sectors={topSectors}
      featuredStocks={featuredStocks}
      learnCards={LEARN_CARDS}
      investors={featuredInvestors}
      academyCards={ACADEMY_CARDS}
      />
    </div>
  );
}

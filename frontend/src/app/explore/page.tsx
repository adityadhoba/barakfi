import type { Metadata } from "next";
import { getBulkScreeningResults, getCollections, getStocks, getSuperInvestors, type Collection, type Stock, type SuperInvestorSummary } from "@/lib/api";
import { ExplorePageClient, type ExploreFeaturedStock, type ExploreLearnCard, type ExploreAcademyCard } from "./explore-page-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore — Collections, Halal Stocks, Learn & Academy | Barakfi",
  description:
    "Explore curated stock collections, compliant Indian stocks, learning guides, super investors, and academy resources in one Barakfi discovery hub.",
  alternates: { canonical: "https://barakfi.in/explore" },
};

const LEARN_CARDS: ExploreLearnCard[] = [
  {
    href: "/learn/what-is-halal-investing",
    category: "Foundations",
    title: "What is halal investing?",
    description: "Plain-language introduction to Islamic finance principles and how they map to listed equities.",
    meta: "5 min read",
  },
  {
    href: "/learn/halal-stocks-india",
    category: "India · Guide",
    title: "Halal stocks in India",
    description: "How NSE and BSE names are screened, what the thresholds mean, and where investors usually start.",
    meta: "8 min read",
  },
  {
    href: "/learn/is-reliance-halal",
    category: "Case study",
    title: "Is Reliance halal?",
    description: "A worked example of how conglomerates are evaluated under Shariah screening frameworks.",
    meta: "7 min read",
  },
  {
    href: "/learn/top-halal-stocks-india",
    category: "Large caps",
    title: "Top halal stocks investors screen first",
    description: "A practical shortlist of Indian names people most often check before building a portfolio.",
    meta: "6 min read",
  },
];

const ACADEMY_CARDS: ExploreAcademyCard[] = [
  {
    href: "/academy/what-is-halal-investing",
    number: "01",
    level: "Beginner",
    title: "What is Halal Investing?",
    description: "The big picture: what makes a business investable, what investors should avoid, and why screening exists.",
    lessons: 4,
  },
  {
    href: "/academy/shariah-screening-explained",
    number: "02",
    level: "Beginner",
    title: "Shariah Screening Explained",
    description: "Understand how sector filters and financial-ratio tests produce a verdict on Indian listed stocks.",
    lessons: 5,
  },
  {
    href: "/academy/dividend-purification",
    number: "03",
    level: "Intermediate",
    title: "Dividend Purification",
    description: "Learn how to calculate purification on dividends and how it ties into Barakfi’s toolset.",
    lessons: 3,
  },
  {
    href: "/academy/building-halal-portfolio",
    number: "04",
    level: "Advanced",
    title: "Building a Halal Portfolio",
    description: "Move from screening single names to constructing diversified, practical halal portfolios.",
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
  const topSectors = Object.entries(
    halalStocks.reduce<Record<string, number>>((acc, stock) => {
      acc[stock.sector] = (acc[stock.sector] || 0) + 1;
      return acc;
    }, {}),
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const featuredCollections = collections.slice(0, 6);
  const featuredInvestors = investors.slice(0, 6);
  const featuredStocks = buildFeaturedStocks(halalStocks.slice(0, 10), screeningResults);

  return (
    <ExplorePageClient
      collections={featuredCollections}
      collectionsTotal={collections.length}
      compliantCount={halalStocks.length}
      screenedCount={indianStocks.length}
      sectors={topSectors}
      featuredStocks={featuredStocks}
      learnCards={LEARN_CARDS}
      investors={featuredInvestors}
      investorsTotal={investors.length}
      academyCards={ACADEMY_CARDS}
    />
  );
}

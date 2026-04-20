import type { MetadataRoute } from "next";
import { getCollections, getStocks, getSuperInvestors } from "@/lib/api";

// ISR: regenerate sitemap at most once per hour.
// Do NOT use force-dynamic here — that would re-call the API on every
// Googlebot crawl, risking timeouts and incomplete sitemaps.
export const revalidate = 3600;

const CANONICAL_DOMAIN = "https://barakfi.in";
const ACADEMY_SLUGS = [
  "what-is-halal-investing",
  "shariah-screening-explained",
  "understanding-financial-ratios",
  "dividend-purification",
  "zakat-on-investments",
  "building-halal-portfolio",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: CANONICAL_DOMAIN, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${CANONICAL_DOMAIN}/screener`, lastModified: new Date(), changeFrequency: "daily", priority: 0.95 },
    { url: `${CANONICAL_DOMAIN}/halal-stocks`, lastModified: new Date(), changeFrequency: "daily", priority: 0.95 },
    { url: `${CANONICAL_DOMAIN}/learn`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${CANONICAL_DOMAIN}/learn/what-is-halal-investing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.82 },
    { url: `${CANONICAL_DOMAIN}/learn/halal-stocks-india`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.84 },
    { url: `${CANONICAL_DOMAIN}/learn/is-reliance-halal`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.83 },
    { url: `${CANONICAL_DOMAIN}/learn/top-halal-stocks-india`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.83 },
    { url: `${CANONICAL_DOMAIN}/compare`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${CANONICAL_DOMAIN}/trending`, lastModified: new Date(), changeFrequency: "daily", priority: 0.85 },
    { url: `${CANONICAL_DOMAIN}/collections`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${CANONICAL_DOMAIN}/super-investors`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.75 },
    { url: `${CANONICAL_DOMAIN}/tools`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${CANONICAL_DOMAIN}/tools/purification`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.75 },
    { url: `${CANONICAL_DOMAIN}/tools/zakat`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.75 },
    { url: `${CANONICAL_DOMAIN}/methodology`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${CANONICAL_DOMAIN}/shariah-compliance`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${CANONICAL_DOMAIN}/academy`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${CANONICAL_DOMAIN}/request-coverage`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${CANONICAL_DOMAIN}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${CANONICAL_DOMAIN}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${CANONICAL_DOMAIN}/disclaimer`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const [stocks, collections, investors] = await Promise.all([
      getStocks(),
      getCollections().catch(() => []),
      getSuperInvestors().catch(() => []),
    ]);
    const indian = stocks.filter(
      (s) => s.exchange?.toUpperCase() === "NSE" || s.exchange?.toUpperCase() === "BSE",
    );
    const stockPages: MetadataRoute.Sitemap = indian.map((stock) => ({
      url: `${CANONICAL_DOMAIN}/stocks/${encodeURIComponent(stock.symbol)}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));

    const collectionPages: MetadataRoute.Sitemap = collections.map((coll) => ({
      url: `${CANONICAL_DOMAIN}/collections/${encodeURIComponent(coll.slug)}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.72,
    }));

    const investorPages: MetadataRoute.Sitemap = investors.map((inv) => ({
      url: `${CANONICAL_DOMAIN}/super-investors/${encodeURIComponent(inv.slug)}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.68,
    }));

    const academyPages: MetadataRoute.Sitemap = ACADEMY_SLUGS.map((slug) => ({
      url: `${CANONICAL_DOMAIN}/academy/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.66,
    }));

    return [...staticPages, ...stockPages, ...collectionPages, ...investorPages, ...academyPages];
  } catch {
    return staticPages;
  }
}

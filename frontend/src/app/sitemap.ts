import type { MetadataRoute } from "next";
import { getStocks } from "@/lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const CANONICAL_DOMAIN = "https://barakfi.in";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: CANONICAL_DOMAIN, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${CANONICAL_DOMAIN}/screener`, lastModified: new Date(), changeFrequency: "daily", priority: 0.95 },
    { url: `${CANONICAL_DOMAIN}/halal-stocks`, lastModified: new Date(), changeFrequency: "daily", priority: 0.95 },
    { url: `${CANONICAL_DOMAIN}/compare`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${CANONICAL_DOMAIN}/watchlist`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${CANONICAL_DOMAIN}/trending`, lastModified: new Date(), changeFrequency: "daily", priority: 0.85 },
    { url: `${CANONICAL_DOMAIN}/collections`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${CANONICAL_DOMAIN}/super-investors`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.75 },
    { url: `${CANONICAL_DOMAIN}/etfs`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.75 },
    { url: `${CANONICAL_DOMAIN}/tools`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${CANONICAL_DOMAIN}/tools/purification`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.75 },
    { url: `${CANONICAL_DOMAIN}/tools/zakat`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.75 },
    { url: `${CANONICAL_DOMAIN}/methodology`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${CANONICAL_DOMAIN}/shariah-compliance`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${CANONICAL_DOMAIN}/academy`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${CANONICAL_DOMAIN}/news`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${CANONICAL_DOMAIN}/request-coverage`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${CANONICAL_DOMAIN}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${CANONICAL_DOMAIN}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${CANONICAL_DOMAIN}/disclaimer`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const stocks = await getStocks();
    const stockPages: MetadataRoute.Sitemap = stocks.map((stock) => ({
      url: `${CANONICAL_DOMAIN}/stocks/${encodeURIComponent(stock.symbol)}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));

    return [...staticPages, ...stockPages];
  } catch {
    return staticPages;
  }
}

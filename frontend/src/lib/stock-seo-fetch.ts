import { getPublicApiBaseUrl, unwrapBackendEnvelope } from "@/lib/api-base";

/** Matches marketing site + sitemap host in [`frontend/src/app/sitemap.ts`](frontend/src/app/sitemap.ts). */
export const STOCK_SEO_CANONICAL_SITE = "https://barakfi.in";

export type StockSeoFaqItem = { question: string; answer: string };

export type StockDetailsSeoPayload = {
  name: string;
  symbol: string;
  status: string;
  score: number;
  summary: string;
  highlights: string[];
  consensus: {
    passed?: number;
    failed?: number;
    doubtful?: number;
    total?: number;
    summary?: string;
  };
  confidence: { score?: number; level?: string };
  seo: {
    title: string;
    description: string;
    content: string;
    faq: StockSeoFaqItem[];
  };
  note?: string;
  last_updated?: string;
};

export async function fetchStockDetailsForSeo(symbol: string): Promise<StockDetailsSeoPayload | null> {
  const clean = symbol.trim();
  if (!clean) return null;
  const base = getPublicApiBaseUrl();
  const url = `${base}/stock-details?${new URLSearchParams({ symbol: clean.toUpperCase() }).toString()}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return unwrapBackendEnvelope<StockDetailsSeoPayload>(await res.json());
  } catch {
    return null;
  }
}

export function stockPageCanonicalUrl(symbol: string): string {
  return `${STOCK_SEO_CANONICAL_SITE}/stocks/${encodeURIComponent(symbol.trim().toUpperCase())}`;
}

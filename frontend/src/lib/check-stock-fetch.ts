import { getPublicApiBaseUrl } from "@/lib/api-base";
import { fetchCheckStockPageDataWithBase, type CheckStockPageResult } from "@/lib/check-stock-fetch-core";

const REVALIDATE_SEC = 60;
const FETCH_MS = 28_000;

export type { CheckStockPageResult };

export async function fetchCheckStockPageData(symbol: string): Promise<CheckStockPageResult> {
  const base = getPublicApiBaseUrl();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_MS);

  try {
    return await fetchCheckStockPageDataWithBase(base, symbol, fetch, {
      signal: controller.signal,
      fetchInit: { next: { revalidate: REVALIDATE_SEC } },
    });
  } finally {
    clearTimeout(t);
  }
}

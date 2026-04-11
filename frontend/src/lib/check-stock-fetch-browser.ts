"use client";

import { getPublicApiBaseUrl } from "@/lib/api-base";
import { fetchCheckStockPageDataWithBase, type CheckStockPageResult } from "@/lib/check-stock-fetch-core";

const FETCH_MS = 28_000;

export type { CheckStockPageResult };

/** Browser fetch for check page (no Next cache). */
export async function fetchCheckStockPageDataBrowser(symbol: string): Promise<CheckStockPageResult> {
  const base = getPublicApiBaseUrl();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_MS);
  try {
    return await fetchCheckStockPageDataWithBase(base, symbol, fetch, {
      signal: controller.signal,
      fetchInit: { cache: "no-store" },
    });
  } finally {
    clearTimeout(t);
  }
}

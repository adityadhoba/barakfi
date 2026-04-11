/**
 * Server-only stock detail loading: distinguishes 404 vs API errors,
 * uses ISR revalidation for public GETs (faster repeat visits).
 */

import { getPublicApiBaseUrl, parseFastapiFetchError, unwrapBackendEnvelope } from "@/lib/api-base";
import type { MultiMethodologyResult, ScreeningResult, Stock } from "@/lib/api";

const REVALIDATE_SEC = 90;
const FETCH_MS = 28_000;

export type StockDetailFetchResult =
  | { kind: "ok"; stock: Stock; screening: ScreeningResult }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

async function parseDetail(response: Response): Promise<string> {
  return parseFastapiFetchError(response);
}

/**
 * Load stock + screening for the stock detail page. Uses next.revalidate for caching.
 * Returns not_found only when the API reports 404 for both (stock missing in DB).
 */
export async function fetchStockAndScreenForPage(symbol: string): Promise<StockDetailFetchResult> {
  const base = getPublicApiBaseUrl();
  const enc = encodeURIComponent(symbol);
  const pathStock = `${base}/stocks/${enc}`;
  const pathScreen = `${base}/screen/${enc}`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_MS);

  try {
    const [resStock, resScreen] = await Promise.all([
      fetch(pathStock, { next: { revalidate: REVALIDATE_SEC }, signal: controller.signal }),
      fetch(pathScreen, { next: { revalidate: REVALIDATE_SEC }, signal: controller.signal }),
    ]);

    const s404 = resStock.status === 404;
    const c404 = resScreen.status === 404;

    if (s404 && c404) {
      return { kind: "not_found" };
    }

    if (s404 || c404) {
      return {
        kind: "error",
        message:
          "Stock data is inconsistent. Try again in a moment or return to the screener.",
      };
    }

    if (!resStock.ok || !resScreen.ok) {
      const d1 = !resStock.ok ? await parseDetail(resStock) : "";
      const d2 = !resScreen.ok ? await parseDetail(resScreen) : "";
      const detail = [d1, d2].filter(Boolean).join(" — ") || "Request failed";
      return {
        kind: "error",
        message:
          resStock.status >= 500 || resScreen.status >= 500
            ? `The service is temporarily unavailable. (${detail})`
            : `Could not load this stock. (${detail})`,
      };
    }

    const stock = unwrapBackendEnvelope<Stock>(await resStock.json());
    const screening = unwrapBackendEnvelope<ScreeningResult>(await resScreen.json());
    return { kind: "ok", stock, screening };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      kind: "error",
      message: aborted
        ? "The request timed out. The API may be waking up — try refreshing the page."
        : "Could not reach the API. Check your connection and try again.",
    };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Multi-methodology screening for stock page — cached briefly.
 */
export async function fetchMultiScreeningForPage(symbol: string): Promise<MultiMethodologyResult | null> {
  const base = getPublicApiBaseUrl();
  const enc = encodeURIComponent(symbol);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_MS);
  try {
    const res = await fetch(`${base}/screen/${enc}/multi`, {
      next: { revalidate: REVALIDATE_SEC },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return unwrapBackendEnvelope<MultiMethodologyResult>(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Lightweight fetch for `generateMetadata` (title + description). */
export async function fetchStockMetadataBundle(
  symbol: string,
): Promise<{ stock: Stock; statusLabel: string } | null> {
  const base = getPublicApiBaseUrl();
  const enc = encodeURIComponent(symbol);
  const pathStock = `${base}/stocks/${enc}`;
  const pathScreen = `${base}/screen/${enc}`;
  try {
    const [resStock, resScreen] = await Promise.all([
      fetch(pathStock, { next: { revalidate: 300 } }),
      fetch(pathScreen, { next: { revalidate: 300 } }),
    ]);
    if (!resStock.ok) return null;
    const stock = unwrapBackendEnvelope<Stock>(await resStock.json());
    let statusLabel = "Shariah screening";
    if (resScreen.ok) {
      const scr = unwrapBackendEnvelope<{ status?: string }>(await resScreen.json());
      const s = (scr.status || "").toUpperCase();
      if (s === "HALAL") statusLabel = "Halal";
      else if (s === "NON_COMPLIANT") statusLabel = "Haram";
      else if (s === "CAUTIOUS" || s === "REVIEW") statusLabel = "Doubtful";
    }
    return { stock, statusLabel };
  } catch {
    return null;
  }
}

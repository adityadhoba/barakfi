import { parseFastapiFetchError, unwrapBackendEnvelope } from "@/lib/api-base";
import type { CheckStockResponse, MultiMethodologyResult, ScreeningResult, Stock } from "@/lib/api";

export type CheckStockPageResult =
  | { kind: "ok"; check: CheckStockResponse; stock: Stock; screening: ScreeningResult; multi: MultiMethodologyResult | null }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

async function parseDetail(response: Response): Promise<string> {
  return parseFastapiFetchError(response);
}

type FetchInit = RequestInit & { next?: { revalidate?: number } };

/**
 * Shared logic for loading check page data (server + browser).
 * Pass `fetchImpl` and optional `signal` / Next cache options.
 */
export async function fetchCheckStockPageDataWithBase(
  base: string,
  symbol: string,
  fetchImpl: typeof fetch,
  options: { signal?: AbortSignal; fetchInit?: Omit<FetchInit, "signal"> } = {},
): Promise<CheckStockPageResult> {
  const enc = encodeURIComponent(symbol);
  const pathCheck = `${base}/check-stock?symbol=${enc}`;
  const pathStock = `${base}/stocks/${enc}`;
  const pathScreen = `${base}/screen/${enc}`;
  const pathMulti = `${base}/screen/${enc}/multi`;

  const { signal } = options;
  const extra = options.fetchInit ?? {};
  const init: FetchInit = { ...extra, ...(signal ? { signal } : {}) };

  try {
    const [resCheck, resStock, resScreen, resMulti] = await Promise.all([
      fetchImpl(pathCheck, init),
      fetchImpl(pathStock, init),
      fetchImpl(pathScreen, init),
      fetchImpl(pathMulti, init),
    ]);

    if (resCheck.status === 404 && resStock.status === 404) {
      return { kind: "not_found" };
    }

    if (!resCheck.ok || !resStock.ok || !resScreen.ok) {
      const parts = [
        !resCheck.ok ? await parseDetail(resCheck) : "",
        !resStock.ok ? await parseDetail(resStock) : "",
        !resScreen.ok ? await parseDetail(resScreen) : "",
      ].filter(Boolean);
      return { kind: "error", message: parts.join(" — ") || "Could not load screening." };
    }

    const check = unwrapBackendEnvelope<CheckStockResponse>(await resCheck.json());
    const stock = unwrapBackendEnvelope<Stock>(await resStock.json());
    const screening = unwrapBackendEnvelope<ScreeningResult>(await resScreen.json());
    const multi = resMulti.ok ? unwrapBackendEnvelope<MultiMethodologyResult>(await resMulti.json()) : null;

    return { kind: "ok", check, stock, screening, multi };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      kind: "error",
      message: aborted ? "Request timed out. Try again." : "Could not reach the API.",
    };
  }
}

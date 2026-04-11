import { getPublicApiBaseUrl } from "@/lib/api-base";
import type { CheckStockResponse, MultiMethodologyResult, ScreeningResult, Stock } from "@/lib/api";

const REVALIDATE_SEC = 60;
const FETCH_MS = 28_000;

export type CheckStockPageResult =
  | { kind: "ok"; check: CheckStockResponse; stock: Stock; screening: ScreeningResult; multi: MultiMethodologyResult | null }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

async function parseDetail(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return typeof body?.detail === "string" ? body.detail : response.statusText;
  } catch {
    return response.statusText;
  }
}

export async function fetchCheckStockPageData(symbol: string): Promise<CheckStockPageResult> {
  const base = getPublicApiBaseUrl();
  const enc = encodeURIComponent(symbol);
  const pathCheck = `${base}/check-stock?symbol=${enc}`;
  const pathStock = `${base}/stocks/${enc}`;
  const pathScreen = `${base}/screen/${enc}`;
  const pathMulti = `${base}/screen/${enc}/multi`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_MS);

  try {
    const [resCheck, resStock, resScreen, resMulti] = await Promise.all([
      fetch(pathCheck, { next: { revalidate: REVALIDATE_SEC }, signal: controller.signal }),
      fetch(pathStock, { next: { revalidate: REVALIDATE_SEC }, signal: controller.signal }),
      fetch(pathScreen, { next: { revalidate: REVALIDATE_SEC }, signal: controller.signal }),
      fetch(pathMulti, { next: { revalidate: REVALIDATE_SEC }, signal: controller.signal }),
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

    const check = (await resCheck.json()) as CheckStockResponse;
    const stock = (await resStock.json()) as Stock;
    const screening = (await resScreen.json()) as ScreeningResult;
    const multi = resMulti.ok ? ((await resMulti.json()) as MultiMethodologyResult) : null;

    return { kind: "ok", check, stock, screening, multi };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      kind: "error",
      message: aborted ? "Request timed out. Try again." : "Could not reach the API.",
    };
  } finally {
    clearTimeout(t);
  }
}

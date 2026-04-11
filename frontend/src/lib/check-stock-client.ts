/**
 * Browser-side fetch for Next.js route GET /api/check-stock?symbol=...
 * Supports both a flat JSON body and { success, data } envelope shapes.
 */

import type { CheckStockResponse } from "@/lib/api";

export type CheckStockClientResult = CheckStockResponse & { symbol: string };

function parsePayload(raw: unknown): CheckStockResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  let inner: Record<string, unknown> = o;
  if (o.success === true && o.data != null && typeof o.data === "object") {
    inner = o.data as Record<string, unknown>;
  }
  if (typeof inner.name !== "string" || typeof inner.status !== "string") return null;
  if (typeof inner.score !== "number" || !Number.isFinite(inner.score)) return null;
  if (typeof inner.summary !== "string") return null;
  const details_available =
    typeof inner.details_available === "boolean" ? inner.details_available : false;
  return {
    name: inner.name,
    status: inner.status,
    score: inner.score,
    summary: inner.summary,
    details_available,
  };
}

/**
 * Calls the Next.js API route (not the FastAPI host directly).
 */
export async function fetchCheckStockFromRoute(
  symbol: string,
): Promise<
  | { ok: true; data: CheckStockClientResult }
  | { ok: false; status: number; message: string }
> {
  const sym = symbol.trim().toUpperCase();
  const url = `/api/check-stock?${new URLSearchParams({ symbol: sym }).toString()}`;
  console.log("[check-stock-client] GET", url);

  try {
    const res = await fetch(url, { cache: "no-store" });
    const raw: unknown = await res.json().catch(() => ({}));
    console.log("[check-stock-client] response", res.status, raw);

    if (!res.ok) {
      const body = raw as { detail?: string };
      const message =
        typeof body?.detail === "string" ? body.detail : `Request failed (${res.status})`;
      return { ok: false, status: res.status, message };
    }

    const parsed = parsePayload(raw);
    if (!parsed) {
      console.warn("[check-stock-client] unrecognized JSON shape", raw);
      return { ok: false, status: 502, message: "Invalid response from server" };
    }

    return { ok: true, data: { ...parsed, symbol: sym } };
  } catch (err) {
    console.error("[check-stock-client] fetch error", err);
    return { ok: false, status: 0, message: "Network error" };
  }
}

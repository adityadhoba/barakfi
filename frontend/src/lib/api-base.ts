/**
 * Resolves the public FastAPI base URL for browser and server-side fetches.
 *
 * NEXT_PUBLIC_API_BASE_URL must be the API origin + `/api` prefix (FastAPI routes live under `/api`).
 * Common mistake: `https://barakfi.in` (Vercel frontend) — that breaks proxies and returns HTML/404/500.
 */
const LOCAL_DEFAULT = "http://127.0.0.1:8001/api";
const PROD_API = "https://api.barakfi.in/api";

function stripTrailingSlashes(s: string): string {
  return s.replace(/\/+$/, "");
}

/**
 * FastAPI `ApiEnvelopeMiddleware` wraps `/api/*` JSON as `{ success, data, error }`.
 * Browser and Next proxies that expect the legacy inner payload should call this
 * after `response.json()` when talking to the Python API.
 */
export function unwrapBackendEnvelope<T = unknown>(body: unknown): T {
  if (
    body !== null &&
    typeof body === "object" &&
    "success" in body &&
    (body as { success: unknown }).success === true &&
    "data" in body
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
}

/** Parse FastAPI JSON error body (envelope or legacy `{ detail }`). */
export function messageFromFastapiJsonBody(body: unknown, fallback: string): string {
  if (body !== null && typeof body === "object") {
    const o = body as Record<string, unknown>;
    if (typeof o.detail === "string") return o.detail;
    if (o.error !== null && typeof o.error === "object" && o.error !== undefined) {
      const m = (o.error as { message?: string }).message;
      if (typeof m === "string" && m.length > 0) return m;
    }
  }
  return fallback;
}

/** Read JSON from a failed fetch and extract a human-readable message. */
export async function parseFastapiFetchError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    return messageFromFastapiJsonBody(body, response.statusText);
  } catch {
    return response.statusText;
  }
}

export function adaptBackendJsonForProxy(body: unknown, ok: boolean): unknown {
  if (body !== null && typeof body === "object") {
    const o = body as Record<string, unknown>;
    if (o.success === true && "data" in o) {
      return o.data;
    }
    if (
      !ok &&
      o.success === false &&
      o.error !== null &&
      typeof o.error === "object" &&
      o.error !== undefined
    ) {
      const msg = (o.error as { message?: string }).message;
      if (typeof msg === "string" && msg.length > 0) {
        return { detail: msg };
      }
    }
  }
  return body;
}

export function getPublicApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (!raw) {
    return process.env.NODE_ENV === "production" ? PROD_API : LOCAL_DEFAULT;
  }

  const normalized = stripTrailingSlashes(raw);

  try {
    const u = new URL(normalized);
    const host = u.hostname.toLowerCase();

    // Marketing site only — always use the real API host
    if (host === "barakfi.in" || host === "www.barakfi.in") {
      return PROD_API;
    }

    const path = u.pathname.replace(/\/+$/, "") || "/";

    // https://api.barakfi.in or https://something.onrender.com → append /api
    if (path === "/") {
      return `${u.origin}/api`;
    }

    if (path === "/api" || path.startsWith("/api/")) {
      return `${u.origin}${path}`;
    }

    // Non-root path that isn't /api — trust env (unusual); avoid double /api
    return normalized;
  } catch {
    return process.env.NODE_ENV === "production" ? PROD_API : LOCAL_DEFAULT;
  }
}

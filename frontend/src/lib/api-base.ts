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

export function getPublicApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (!raw) {
    return process.env.NODE_ENV === "production" ? PROD_API : LOCAL_DEFAULT;
  }

  let normalized = stripTrailingSlashes(raw);

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

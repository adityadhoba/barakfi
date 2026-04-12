import { getPublicApiBaseUrl } from "@/lib/api-base";

const apiBaseUrl = getPublicApiBaseUrl();

/**
 * Fire-and-forget product analytics event.
 * Never throws — silently drops on failure.
 */
export function trackEvent(
  eventName: string,
  opts?: { symbol?: string; userId?: string; sessionId?: string; metadata?: Record<string, unknown> },
) {
  if (typeof window === "undefined") return;
  const body = {
    event_name: eventName,
    user_id: opts?.userId ?? null,
    session_id: opts?.sessionId ?? null,
    symbol: opts?.symbol ?? null,
    metadata: opts?.metadata ?? null,
  };
  fetch(`${apiBaseUrl}/product-events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

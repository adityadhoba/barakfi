import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { adaptBackendJsonForProxy, getPublicApiBaseUrl } from "@/lib/api-base";

const apiBaseUrl = getPublicApiBaseUrl();

function extractCompareLimitPayload(body: unknown): Record<string, unknown> | null {
  if (body && typeof body === "object") {
    const envelope = body as { error?: unknown };
    const candidate =
      envelope.error && typeof envelope.error === "object"
        ? (envelope.error as Record<string, unknown>)
        : body;
    if (
      candidate &&
      typeof candidate === "object" &&
      candidate.status === "limit_exhausted"
    ) {
      return {
        status: candidate.status,
        message:
          typeof candidate.message === "string"
            ? candidate.message
            : "You’ve reached today’s compare limit.",
        actions: Array.isArray(candidate.actions) ? candidate.actions : [],
        redirect_url:
          typeof candidate.redirect_url === "string" ? candidate.redirect_url : "/premium",
        resets_at:
          typeof candidate.resets_at === "string" ? candidate.resets_at : undefined,
      };
    }
  }
  return null;
}

/**
 * Proxy POST /api/compare/bulk -> backend /compare/bulk (same-origin for browser).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  const authState = await auth();
  const clerkUser = await currentUser();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const userId = authState.userId;
  if (userId) headers["x-clerk-user-id"] = userId;
  const email = clerkUser?.primaryEmailAddress?.emailAddress;
  if (email) headers["x-actor-email"] = email;
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers["x-forwarded-for"] = forwardedFor;

  try {
    const response = await fetch(`${apiBaseUrl}/compare/bulk`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const responseBody: unknown = await response.json().catch(() => ({}));
    const compareLimitPayload = extractCompareLimitPayload(responseBody);
    if (response.status === 429 && compareLimitPayload) {
      return NextResponse.json(compareLimitPayload, {
        status: response.status,
      });
    }
    return NextResponse.json(adaptBackendJsonForProxy(responseBody, response.ok), {
      status: response.status,
    });
  } catch {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}

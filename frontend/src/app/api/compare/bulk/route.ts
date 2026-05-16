import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { adaptBackendJsonForProxy, getPublicApiBaseUrl } from "@/lib/api-base";
import { buildBackendHeaders } from "@/lib/backend-auth";

const apiBaseUrl = getPublicApiBaseUrl();

type CompareUnlockResponse = {
  allowed: boolean;
  charged_count: number;
  reason?: string | null;
  message?: string | null;
  cta?: string | null;
  reports_used: number;
  reports_limit: number;
  reports_remaining: number;
};

function unwrapPayload<T>(body: unknown): T | null {
  if (body && typeof body === "object" && "data" in body) {
    return ((body as { data?: unknown }).data as T) ?? null;
  }
  return (body as T) ?? null;
}

function extractDetail(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const obj = body as Record<string, unknown>;
  if (typeof obj.detail === "string") return obj.detail;
  if (typeof obj.message === "string") return obj.message;
  if (obj.error && typeof obj.error === "object") {
    const e = obj.error as Record<string, unknown>;
    if (typeof e.message === "string") return e.message;
  }
  return "";
}

/**
 * Proxy POST /api/compare/bulk:
 * 1) reserves monthly report credits for compare symbols
 * 2) fetches comparison screening payload only if credits are available
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  const symbols = Array.isArray(body)
    ? body.map((value) => String(value || "").trim().toUpperCase()).filter(Boolean).slice(0, 3)
    : [];

  if (symbols.length < 2) {
    return NextResponse.json({ detail: "Select at least 2 symbols to compare" }, { status: 400 });
  }

  const authState = await auth();
  const token = await authState.getToken();
  const clerkUser = await currentUser();

  if (!token || !clerkUser) {
    return NextResponse.json({ detail: "Sign in to compare stocks." }, { status: 401 });
  }

  const actor = {
    authSubject: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? null,
  };

  try {
    const unlockRes = await fetch(`${apiBaseUrl}/reports/compare/unlock`, {
      method: "POST",
      headers: buildBackendHeaders({ token, actor, contentType: true }),
      cache: "no-store",
      body: JSON.stringify({ symbols }),
    });

    const unlockBody: unknown = await unlockRes.json().catch(() => ({}));
    const unlockPayload = unwrapPayload<CompareUnlockResponse>(unlockBody);

    if (!unlockRes.ok || !unlockPayload) {
      return NextResponse.json(adaptBackendJsonForProxy(unlockBody, unlockRes.ok), {
        status: unlockRes.status,
      });
    }

    if (!unlockPayload.allowed) {
      return NextResponse.json(
        {
          status: "limit_exhausted",
          message:
            unlockPayload.message ||
            "You do not have enough monthly report credits to run this comparison.",
          actions: ["Come back next month", "Join BarakFi Pro"],
          redirect_url: "/premium",
          reports_used: unlockPayload.reports_used,
          reports_limit: unlockPayload.reports_limit,
          reports_remaining: unlockPayload.reports_remaining,
          reason: unlockPayload.reason || "MONTHLY_LIMIT_REACHED",
          cta: unlockPayload.cta || "JOIN_PRO_WAITLIST",
        },
        { status: 429 },
      );
    }

    const headers = buildBackendHeaders({ token, actor, contentType: true });

    const primaryRes = await fetch(`${apiBaseUrl}/compare/bulk`, {
      method: "POST",
      headers,
      body: JSON.stringify(symbols),
      cache: "no-store",
    });
    const primaryBody: unknown = await primaryRes.json().catch(() => ({}));

    let compareRes = primaryRes;
    let compareBody = primaryBody;

    // Backward-compatible fallback for stricter backend payload contracts.
    if (!primaryRes.ok) {
      const detail = extractDetail(primaryBody).toLowerCase();
      const shouldRetry =
        primaryRes.status === 422 ||
        detail.includes("stock not found") ||
        detail.includes("validation") ||
        detail.includes("invalid");

      if (shouldRetry) {
        const fallbackPayload = symbols.map((symbol) => ({ symbol, exchange: "NSE" }));
        const fallbackRes = await fetch(`${apiBaseUrl}/compare/bulk`, {
          method: "POST",
          headers,
          body: JSON.stringify(fallbackPayload),
          cache: "no-store",
        });
        const fallbackBody: unknown = await fallbackRes.json().catch(() => ({}));
        compareRes = fallbackRes;
        compareBody = fallbackBody;
      }
    }

    if (!compareRes.ok) {
      return NextResponse.json(adaptBackendJsonForProxy(compareBody, compareRes.ok), {
        status: compareRes.status,
      });
    }

    const comparePayload = unwrapPayload<unknown[]>(compareBody) ?? [];

    return NextResponse.json({
      data: comparePayload,
      usage: {
        charged_count: unlockPayload.charged_count,
        reports_used: unlockPayload.reports_used,
        reports_limit: unlockPayload.reports_limit,
        reports_remaining: unlockPayload.reports_remaining,
      },
    });
  } catch {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}

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
  reports_used?: number | null;
  reports_limit?: number | null;
  reports_remaining?: number | null;
};

function unwrapPayload<T>(body: unknown): T | null {
  if (body && typeof body === "object" && "data" in body) {
    return ((body as { data?: unknown }).data as T) ?? null;
  }
  return (body as T) ?? null;
}

function toHeaderRecord(headers: HeadersInit): Record<string, string> {
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  return headers;
}

function extractMovedSymbol(detail: string): string | null {
  const match = detail.match(/moved\s+to\s+([A-Z0-9._-]+)/i);
  return match?.[1]?.toUpperCase() ?? null;
}

async function fetchSingleScreening(
  symbol: string,
  headers: Record<string, string>,
): Promise<unknown | null> {
  const res = await fetch(`${apiBaseUrl}/screen/${encodeURIComponent(symbol)}?exchange=NSE`, {
    method: "GET",
    headers,
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as unknown;
  if (res.ok) {
    return unwrapPayload<unknown>(body) ?? body;
  }

  const detail =
    body && typeof body === "object" && "detail" in (body as Record<string, unknown>)
      ? String((body as { detail?: unknown }).detail ?? "")
      : "";
  const movedTo = extractMovedSymbol(detail);

  if (res.status === 409 && movedTo && movedTo !== symbol.toUpperCase()) {
    const retryRes = await fetch(
      `${apiBaseUrl}/screen/${encodeURIComponent(movedTo)}?exchange=NSE`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      },
    );
    const retryBody = (await retryRes.json().catch(() => ({}))) as unknown;
    if (retryRes.ok) {
      return unwrapPayload<unknown>(retryBody) ?? retryBody;
    }
  }

  return null;
}

async function fetchSingleScreenings(
  symbols: string[],
  headers: HeadersInit,
): Promise<unknown[] | null> {
  const headerRecord = toHeaderRecord(headers);
  const settled = await Promise.all(
    symbols.map((symbol) => fetchSingleScreening(symbol, headerRecord)),
  );

  const filtered = settled.filter((item): item is unknown => item != null);
  return filtered.length >= 2 ? filtered : null;
}

/**
 * Proxy POST /api/compare/bulk:
 * 1) tries to reserve monthly compare credits
 * 2) fetches compare payload from stable screening endpoints
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
    const headers = buildBackendHeaders({ token, actor, contentType: true });
    let unlockPayload: CompareUnlockResponse | null = null;

    const unlockRes = await fetch(`${apiBaseUrl}/reports/compare/unlock`, {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({ symbols }),
    });

    const unlockBody: unknown = await unlockRes.json().catch(() => ({}));
    unlockPayload = unwrapPayload<CompareUnlockResponse>(unlockBody);

    if (!unlockRes.ok) {
      // Backward compatibility: some backend deployments may not have compare unlock yet.
      if (unlockRes.status !== 404) {
        return NextResponse.json(adaptBackendJsonForProxy(unlockBody, unlockRes.ok), {
          status: unlockRes.status,
        });
      }
      unlockPayload = {
        allowed: true,
        charged_count: 0,
        reports_used: null,
        reports_limit: null,
        reports_remaining: null,
      };
    }

    if (unlockPayload && !unlockPayload.allowed) {
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

    // Prefer stable bulk screen endpoint to avoid compare/bulk path drift across API versions.
    const screeningRes = await fetch(`${apiBaseUrl}/screen/bulk`, {
      method: "POST",
      headers,
      body: JSON.stringify(symbols),
      cache: "no-store",
    });
    const screeningBody: unknown = await screeningRes.json().catch(() => ({}));

    let comparePayload = screeningRes.ok ? unwrapPayload<unknown[]>(screeningBody) ?? [] : null;

    if (!comparePayload || comparePayload.length < 2) {
      // Last-resort fallback for strict parsers / schema drift and renamed symbols.
      const perSymbol = await fetchSingleScreenings(symbols, headers);
      if (perSymbol && perSymbol.length >= 2) {
        comparePayload = perSymbol;
      }
    }

    if (!comparePayload || comparePayload.length < 2) {
      const detail =
        !screeningRes.ok && screeningBody && typeof screeningBody === "object" && "detail" in (screeningBody as Record<string, unknown>)
          ? String((screeningBody as { detail?: unknown }).detail ?? "")
          : "";
      return NextResponse.json(
        {
          detail: detail || "Unable to compare the selected stocks right now.",
          reports_used: unlockPayload?.reports_used ?? null,
          reports_limit: unlockPayload?.reports_limit ?? null,
          reports_remaining: unlockPayload?.reports_remaining ?? null,
        },
        { status: screeningRes.ok ? 502 : screeningRes.status },
      );
    }

    return NextResponse.json({
      data: comparePayload,
      usage: {
        charged_count: unlockPayload?.charged_count ?? 0,
        reports_used: unlockPayload?.reports_used ?? null,
        reports_limit: unlockPayload?.reports_limit ?? null,
        reports_remaining: unlockPayload?.reports_remaining ?? null,
      },
    });
  } catch {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}

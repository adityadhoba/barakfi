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

async function fetchSingleScreenings(
  symbols: string[],
  headers: HeadersInit,
): Promise<unknown[] | null> {
  const settled = await Promise.all(
    symbols.map(async (symbol) => {
      const res = await fetch(`${apiBaseUrl}/screen/${encodeURIComponent(symbol)}?exchange=NSE`, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as unknown;
      if (!res.ok) return null;
      return unwrapPayload<unknown>(body) ?? body;
    }),
  );

  const filtered = settled.filter((item): item is unknown => item != null);
  return filtered.length >= 2 ? filtered : null;
}

/**
 * Proxy POST /api/compare/bulk:
 * 1) reserves monthly report credits for compare symbols
 * 2) fetches screening payload through stable endpoints for compare rendering
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

    const unlockRes = await fetch(`${apiBaseUrl}/reports/compare/unlock`, {
      method: "POST",
      headers,
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

    // Permanent stabilization: avoid brittle /compare/bulk payload contracts.
    // Use the same bulk screening engine as screener pages.
    const screeningRes = await fetch(`${apiBaseUrl}/screen/bulk`, {
      method: "POST",
      headers,
      body: JSON.stringify(symbols),
      cache: "no-store",
    });
    const screeningBody: unknown = await screeningRes.json().catch(() => ({}));

    let comparePayload = screeningRes.ok ? unwrapPayload<unknown[]>(screeningBody) ?? [] : null;

    if (!comparePayload || comparePayload.length < 2) {
      // Last-resort fallback: per-symbol pulls.
      const perSymbol = await fetchSingleScreenings(symbols, headers);
      if (perSymbol && perSymbol.length >= 2) {
        comparePayload = perSymbol;
      }
    }

    if (!comparePayload || comparePayload.length < 2) {
      return NextResponse.json(
        {
          detail: "Unable to compare the selected stocks right now.",
          reports_used: unlockPayload.reports_used,
          reports_limit: unlockPayload.reports_limit,
          reports_remaining: unlockPayload.reports_remaining,
        },
        { status: screeningRes.ok ? 502 : screeningRes.status },
      );
    }

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

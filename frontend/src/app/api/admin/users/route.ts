import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { buildBackendHeaders } from "@/lib/backend-auth";
import { getPublicApiBaseUrl, adaptBackendJsonForProxy } from "@/lib/api-base";

const apiBaseUrl = getPublicApiBaseUrl();

/**
 * Proxy GET /api/admin/users → backend /admin/users
 */
export async function GET(request: NextRequest) {
  const authState = await auth();
  const clerkUser = await currentUser();
  const token = await authState.getToken();

  if (!token || !clerkUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Forward query params (offset, limit)
    const { searchParams } = new URL(request.url);
    const response = await fetch(`${apiBaseUrl}/admin/users?${searchParams.toString()}`, {
      headers: buildBackendHeaders({
        token,
        actor: { authSubject: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress },
      }),
      cache: "no-store",
    });

    const responseBody = await response.json().catch(() => ({ detail: "Backend returned non-JSON" }));

    if (!response.ok) {
      console.error("[admin/users GET] Backend error:", response.status, responseBody);
    }

    return NextResponse.json(adaptBackendJsonForProxy(responseBody, response.ok), { status: response.status });
  } catch (error) {
    console.error("[admin/users GET] Proxy error:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

/**
 * Proxy PUT /api/admin/users → backend /admin/users/{id}/role or /admin/users/{id}/active
 * Body must include: { userId, action: "role"|"active", ...payload }
 */
export async function PUT(request: NextRequest) {
  const authState = await auth();
  const clerkUser = await currentUser();
  const token = await authState.getToken();

  if (!token || !clerkUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, action, ...payload } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: "userId and action are required" }, { status: 400 });
    }

    if (!["role", "active"].includes(action)) {
      return NextResponse.json({ error: "action must be role or active" }, { status: 400 });
    }

    const endpoint = action === "role"
      ? `/admin/users/${userId}/role`
      : `/admin/users/${userId}/active`;

    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      method: "PUT",
      headers: buildBackendHeaders({
        token,
        actor: { authSubject: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress },
        contentType: true,
      }),
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json().catch(() => ({ detail: "Backend returned non-JSON" }));

    if (!response.ok) {
      console.error("[admin/users PUT] Backend error:", response.status, responseBody);
    }

    return NextResponse.json(adaptBackendJsonForProxy(responseBody, response.ok), { status: response.status });
  } catch (error) {
    console.error("[admin/users PUT] Proxy error:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

/**
 * Proxy POST /api/admin/users → backend /admin/users/{id}/quota/reset
 * Body must include: { userId, action: "quota_reset" }
 */
export async function POST(request: NextRequest) {
  const authState = await auth();
  const clerkUser = await currentUser();
  const token = await authState.getToken();

  if (!token || !clerkUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, action } = body as { userId?: number; action?: string };

    if (!userId || action !== "quota_reset") {
      return NextResponse.json({ error: "userId and action=quota_reset are required" }, { status: 400 });
    }

    const response = await fetch(`${apiBaseUrl}/admin/users/${userId}/quota/reset`, {
      method: "POST",
      headers: buildBackendHeaders({
        token,
        actor: { authSubject: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress },
      }),
    });

    const responseBody = await response.json().catch(() => ({ detail: "Backend returned non-JSON" }));
    return NextResponse.json(adaptBackendJsonForProxy(responseBody, response.ok), { status: response.status });
  } catch (error) {
    console.error("[admin/users POST] Proxy error:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

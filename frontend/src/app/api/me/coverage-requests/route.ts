import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { buildBackendHeaders } from "@/lib/backend-auth";
import { getPublicApiBaseUrl, adaptBackendJsonForProxy } from "@/lib/api-base";

const apiBaseUrl = getPublicApiBaseUrl();

/** Proxy GET/POST /api/me/coverage-requests → backend */
export async function GET() {
  const authState = await auth();
  const clerkUser = await currentUser();
  const token = await authState.getToken();

  if (!token || !clerkUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(`${apiBaseUrl}/me/coverage-requests`, {
      headers: buildBackendHeaders({
        token,
        actor: { authSubject: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress },
      }),
      cache: "no-store",
    });

    const responseBody = await response.json().catch(() => ({ detail: "Backend returned non-JSON" }));

    return NextResponse.json(adaptBackendJsonForProxy(responseBody, response.ok), { status: response.status });
  } catch (error) {
    console.error("[me/coverage-requests GET] Proxy error:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const authState = await auth();
  const clerkUser = await currentUser();
  const token = await authState.getToken();

  if (!token || !clerkUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const response = await fetch(`${apiBaseUrl}/me/coverage-requests`, {
      method: "POST",
      headers: buildBackendHeaders({
        token,
        actor: { authSubject: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress },
        contentType: true,
      }),
      body: JSON.stringify(body),
    });

    const responseBody = await response.json().catch(() => ({ detail: "Backend returned non-JSON" }));

    return NextResponse.json(adaptBackendJsonForProxy(responseBody, response.ok), { status: response.status });
  } catch (error) {
    console.error("[me/coverage-requests POST] Proxy error:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

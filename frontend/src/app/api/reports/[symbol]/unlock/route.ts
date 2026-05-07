import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { buildBackendHeaders } from "@/lib/backend-auth";
import { adaptBackendJsonForProxy, getPublicApiBaseUrl } from "@/lib/api-base";

const apiBaseUrl = getPublicApiBaseUrl();

export async function POST(
  _request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  const authState = await auth();
  const clerkUser = await currentUser();
  const token = await authState.getToken();

  if (!token || !clerkUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { symbol } = await context.params;
    const response = await fetch(`${apiBaseUrl}/reports/${encodeURIComponent(symbol)}/unlock`, {
      method: "POST",
      headers: buildBackendHeaders({
        token,
        actor: { authSubject: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress },
      }),
      cache: "no-store",
    });

    const body = await response.json().catch(() => ({ detail: "Backend returned non-JSON" }));
    return NextResponse.json(adaptBackendJsonForProxy(body, response.ok), { status: response.status });
  } catch (error) {
    console.error("[report unlock] Proxy error:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

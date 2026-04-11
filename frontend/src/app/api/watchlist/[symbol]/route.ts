import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { buildBackendHeaders } from "@/lib/backend-auth";
import { getPublicApiBaseUrl, adaptBackendJsonForProxy } from "@/lib/api-base";

const apiBaseUrl = getPublicApiBaseUrl();

export async function DELETE(
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
    const response = await fetch(`${apiBaseUrl}/me/watchlist/${encodeURIComponent(symbol)}`, {
      method: "DELETE",
      headers: buildBackendHeaders({
        token,
        actor: { authSubject: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress },
      }),
      cache: "no-store",
    });

    const responseBody = await response.json().catch(() => ({ detail: "Backend returned non-JSON" }));

    if (!response.ok) {
      console.error("[watchlist DELETE] Backend error:", response.status, responseBody);
    }

    return NextResponse.json(adaptBackendJsonForProxy(responseBody, response.ok), { status: response.status });
  } catch (error) {
    console.error("[watchlist DELETE] Proxy error:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

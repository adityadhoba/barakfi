import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { buildBackendHeaders } from "@/lib/backend-auth";
import { getPublicApiBaseUrl } from "@/lib/api-base";

const apiBaseUrl = getPublicApiBaseUrl();

/**
 * Proxy GET /api/admin/roles → backend /admin/roles
 */
export async function GET() {
  const authState = await auth();
  const clerkUser = await currentUser();
  const token = await authState.getToken();

  if (!token || !clerkUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(`${apiBaseUrl}/admin/roles`, {
      headers: buildBackendHeaders({
        token,
        actor: { authSubject: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress },
      }),
      cache: "no-store",
    });

    const responseBody = await response.json().catch(() => ({ detail: "Backend returned non-JSON" }));

    if (!response.ok) {
      console.error("[admin/roles GET] Backend error:", response.status, responseBody);
    }

    return NextResponse.json(responseBody, { status: response.status });
  } catch (error) {
    console.error("[admin/roles GET] Proxy error:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

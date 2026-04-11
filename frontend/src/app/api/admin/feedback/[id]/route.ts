import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { buildBackendHeaders } from "@/lib/backend-auth";
import { getPublicApiBaseUrl } from "@/lib/api-base";

const apiBaseUrl = getPublicApiBaseUrl();

/** Proxy PATCH /api/admin/feedback/:id → backend */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authState = await auth();
  const clerkUser = await currentUser();
  const token = await authState.getToken();

  if (!token || !clerkUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const response = await fetch(`${apiBaseUrl}/admin/feedback/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: buildBackendHeaders({
        token,
        actor: { authSubject: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress },
        contentType: true,
      }),
      body: JSON.stringify(body),
    });

    const responseBody = await response.json().catch(() => ({ detail: "Backend returned non-JSON" }));

    if (!response.ok) {
      console.error("[admin/feedback PATCH] Backend error:", response.status, responseBody);
    }

    return NextResponse.json(responseBody, { status: response.status });
  } catch (error) {
    console.error("[admin/feedback PATCH] Proxy error:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

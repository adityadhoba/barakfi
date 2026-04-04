import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { buildBackendHeaders } from "@/lib/backend-auth";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8001/api";

/** Proxy GET /api/admin/feedback → backend /admin/feedback */
export async function GET(request: NextRequest) {
  const authState = await auth();
  const clerkUser = await currentUser();
  const token = await authState.getToken();

  if (!token || !clerkUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const response = await fetch(`${apiBaseUrl}/admin/feedback?${searchParams.toString()}`, {
      headers: buildBackendHeaders({
        token,
        actor: { authSubject: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress },
      }),
      cache: "no-store",
    });

    const responseBody = await response.json().catch(() => ({ detail: "Backend returned non-JSON" }));

    if (!response.ok) {
      console.error("[admin/feedback GET] Backend error:", response.status, responseBody);
    }

    return NextResponse.json(responseBody, { status: response.status });
  } catch (error) {
    console.error("[admin/feedback GET] Proxy error:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

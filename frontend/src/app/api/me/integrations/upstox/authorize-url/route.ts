import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { buildBackendHeaders } from "@/lib/backend-auth";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8001/api";

/** Proxy GET /api/me/integrations/upstox/authorize-url → backend (Clerk session). */
export async function GET() {
  const authState = await auth();
  const clerkUser = await currentUser();
  const token = await authState.getToken();

  if (!token || !clerkUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(`${apiBaseUrl}/me/integrations/upstox/authorize-url`, {
      headers: buildBackendHeaders({
        token,
        actor: { authSubject: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress },
      }),
      cache: "no-store",
    });

    const responseBody = await response.json().catch(() => ({ detail: "Backend returned non-JSON" }));

    return NextResponse.json(responseBody, { status: response.status });
  } catch (error) {
    console.error("[upstox authorize-url] Proxy error:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

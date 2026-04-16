import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { buildBackendHeaders } from "@/lib/backend-auth";
import { getPublicApiBaseUrl, adaptBackendJsonForProxy } from "@/lib/api-base";

const apiBaseUrl = getPublicApiBaseUrl();

export async function GET(request: NextRequest) {
  const authState = await auth();
  const clerkUser = await currentUser();
  const token = await authState.getToken();

  if (!token || !clerkUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const response = await fetch(`${apiBaseUrl}/admin/early-access?${searchParams.toString()}`, {
      headers: buildBackendHeaders({
        token,
        actor: { authSubject: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress },
      }),
      cache: "no-store",
    });

    const responseBody = await response.json().catch(() => ({
      detail: "Backend returned non-JSON",
    }));

    if (!response.ok) {
      console.error("[admin/early-access GET] Backend error:", response.status, responseBody);
    }

    return NextResponse.json(adaptBackendJsonForProxy(responseBody, response.ok), {
      status: response.status,
    });
  } catch (error) {
    console.error("[admin/early-access GET] Proxy error:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

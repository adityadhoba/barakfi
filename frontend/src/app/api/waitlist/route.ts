import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { buildBackendHeaders } from "@/lib/backend-auth";
import { adaptBackendJsonForProxy, getPublicApiBaseUrl } from "@/lib/api-base";

const apiBaseUrl = getPublicApiBaseUrl();

export async function POST(request: Request) {
  const authState = await auth();
  const clerkUser = await currentUser();
  const token = await authState.getToken().catch(() => null);

  try {
    const body = await request.json();
    const response = await fetch(`${apiBaseUrl}/waitlist`, {
      method: "POST",
      headers: buildBackendHeaders({
        token,
        actor: token && clerkUser
          ? { authSubject: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress }
          : undefined,
        contentType: true,
      }),
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const responseBody = await response.json().catch(() => ({ detail: "Backend returned non-JSON" }));
    return NextResponse.json(adaptBackendJsonForProxy(responseBody, response.ok), { status: response.status });
  } catch (error) {
    console.error("[waitlist] Proxy error:", error);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

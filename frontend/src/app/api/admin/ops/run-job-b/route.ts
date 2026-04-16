import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { buildBackendHeaders } from "@/lib/backend-auth";
import { getPublicApiBaseUrl, adaptBackendJsonForProxy } from "@/lib/api-base";

const apiBaseUrl = getPublicApiBaseUrl();

/** Proxy POST /api/admin/ops/run-job-b → backend (subprocess Job B). */
export async function POST() {
  const authState = await auth();
  const clerkUser = await currentUser();
  const token = await authState.getToken();

  if (!token || !clerkUser) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(`${apiBaseUrl}/admin/ops/run-job-b`, {
      method: "POST",
      headers: buildBackendHeaders({
        token,
        actor: { authSubject: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress },
        contentType: true,
      }),
      body: "{}",
      cache: "no-store",
    });

    const responseBody = await response.json().catch(() => ({ detail: "Backend returned non-JSON" }));

    if (!response.ok) {
      console.error("[admin/ops/run-job-b] Backend error:", response.status, responseBody);
    }

    return NextResponse.json(adaptBackendJsonForProxy(responseBody, response.ok), { status: response.status });
  } catch (error) {
    console.error("[admin/ops/run-job-b] Proxy error:", error);
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}

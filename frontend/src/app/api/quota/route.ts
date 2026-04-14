import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPublicApiBaseUrl, adaptBackendJsonForProxy } from "@/lib/api-base";

const apiBaseUrl = getPublicApiBaseUrl();

/**
 * Proxy GET /api/quota → backend /quota (same-origin for browser; forwards actor headers).
 */
export async function GET(request: Request) {
  const out = new Headers();
  const authState = await auth();
  const clerkUser = await currentUser();
  const userId = authState.userId || request.headers.get("x-clerk-user-id");
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress || request.headers.get("x-actor-email");
  if (userId) out.set("x-clerk-user-id", userId);
  if (email) out.set("x-actor-email", email);
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) out.set("x-forwarded-for", fwd);

  try {
    const response = await fetch(`${apiBaseUrl}/quota`, {
      headers: out,
      cache: "no-store",
    });
    const body: unknown = await response.json().catch(() => ({}));
    return NextResponse.json(adaptBackendJsonForProxy(body, response.ok), {
      status: response.status,
    });
  } catch {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}

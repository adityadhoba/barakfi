import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { adaptBackendJsonForProxy, getPublicApiBaseUrl } from "@/lib/api-base";

const apiBaseUrl = getPublicApiBaseUrl();

/**
 * Proxy POST /api/compare/bulk -> backend /compare/bulk (same-origin for browser).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  const authState = await auth();
  const clerkUser = await currentUser();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const userId = authState.userId;
  if (userId) headers["x-clerk-user-id"] = userId;
  const email = clerkUser?.primaryEmailAddress?.emailAddress;
  if (email) headers["x-actor-email"] = email;
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers["x-forwarded-for"] = forwardedFor;

  try {
    const response = await fetch(`${apiBaseUrl}/compare/bulk`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const responseBody: unknown = await response.json().catch(() => ({}));
    return NextResponse.json(adaptBackendJsonForProxy(responseBody, response.ok), {
      status: response.status,
    });
  } catch {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}

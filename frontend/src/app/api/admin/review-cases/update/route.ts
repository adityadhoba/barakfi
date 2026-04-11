import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { buildBackendHeaders } from "@/lib/backend-auth";
import { getPublicApiBaseUrl, adaptBackendJsonForProxy } from "@/lib/api-base";

const apiBaseUrl = getPublicApiBaseUrl();

export async function POST(request: NextRequest) {
  const { getToken } = await auth();
  const clerkUser = await currentUser();
  const token = await getToken();

  if (!token || !clerkUser) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const response = await fetch(`${apiBaseUrl}/admin/review-cases/update`, {
    method: "POST",
    headers: buildBackendHeaders({
      token,
      actor: { authSubject: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress },
      contentType: true,
    }),
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await response.json();
  return NextResponse.json(adaptBackendJsonForProxy(data, response.ok), { status: response.status });
}

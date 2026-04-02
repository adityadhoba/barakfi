import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { buildBackendHeaders } from "@/lib/backend-auth";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8001/api";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authState = await auth();
  const clerkUser = await currentUser();
  const token = await authState.getToken();

  if (!token || !clerkUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const response = await fetch(`${apiBaseUrl}/me/saved-screeners/${id}`, {
    method: "DELETE",
    headers: buildBackendHeaders({
      token,
      actor: { authSubject: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress },
    }),
    cache: "no-store",
  });

  const responseBody = await response.json();
  return NextResponse.json(responseBody, { status: response.status });
}

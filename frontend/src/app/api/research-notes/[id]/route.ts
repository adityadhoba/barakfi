import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { buildBackendHeaders } from "@/lib/backend-auth";
import { getPublicApiBaseUrl, adaptBackendJsonForProxy } from "@/lib/api-base";

const apiBaseUrl = getPublicApiBaseUrl();

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { getToken } = await auth();
  const clerkUser = await currentUser();
  const token = await getToken();

  if (!token || !clerkUser) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const response = await fetch(`${apiBaseUrl}/me/research-notes/${id}`, {
    method: "DELETE",
    headers: buildBackendHeaders({
      token,
      actor: { authSubject: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress },
    }),
    cache: "no-store",
  });

  const data = await response.json();
  return NextResponse.json(adaptBackendJsonForProxy(data, response.ok), { status: response.status });
}

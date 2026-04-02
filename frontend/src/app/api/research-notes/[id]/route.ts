import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { buildBackendHeaders } from "@/lib/backend-auth";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8001/api";

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
  return NextResponse.json(data, { status: response.status });
}

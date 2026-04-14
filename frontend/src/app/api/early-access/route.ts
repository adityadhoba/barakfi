import { NextResponse } from "next/server";
import { adaptBackendJsonForProxy, getPublicApiBaseUrl } from "@/lib/api-base";

const apiBaseUrl = getPublicApiBaseUrl();

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  try {
    const response = await fetch(`${apiBaseUrl}/early-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

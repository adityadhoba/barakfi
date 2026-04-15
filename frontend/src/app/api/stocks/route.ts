import { NextRequest, NextResponse } from "next/server";
import { getPublicApiBaseUrl, adaptBackendJsonForProxy } from "@/lib/api-base";

const API_BASE = getPublicApiBaseUrl();

/**
 * Proxy GET /api/stocks to the backend.
 * Used by the client-side search autocomplete.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams.toString();
    const url = `${API_BASE}/stocks${params ? `?${params}` : ""}`;
    const res = await fetch(url, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json([], { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(adaptBackendJsonForProxy(data, res.ok), {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}

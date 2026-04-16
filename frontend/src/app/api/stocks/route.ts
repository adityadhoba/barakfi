import { NextResponse } from "next/server";
import { getPublicApiBaseUrl, adaptBackendJsonForProxy } from "@/lib/api-base";

const API_BASE = getPublicApiBaseUrl();

/**
 * Proxy GET /api/stocks to the backend.
 * Used by the client-side search autocomplete.
 */
export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/stocks`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json([], { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(adaptBackendJsonForProxy(data, res.ok), {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}

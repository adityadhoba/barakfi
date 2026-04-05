import { NextResponse } from "next/server";
import { getPublicApiBaseUrl } from "@/lib/api-base";

const API_BASE = getPublicApiBaseUrl();

/**
 * Proxy GET /api/stocks to the backend.
 * Used by the client-side search autocomplete.
 */
export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/stocks`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json([], { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}

import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8001/api";

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

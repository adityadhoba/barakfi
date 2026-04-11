import { NextRequest, NextResponse } from "next/server";
import { getPublicApiBaseUrl, adaptBackendJsonForProxy } from "@/lib/api-base";

const API_BASE = getPublicApiBaseUrl();

/**
 * Proxy GET /api/check-stock?symbol=INFY to the FastAPI backend.
 */
export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  if (!symbol || !symbol.trim()) {
    return NextResponse.json({ detail: "symbol is required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${API_BASE}/check-stock?${new URLSearchParams({ symbol: symbol.trim() }).toString()}`,
      { next: { revalidate: 60 }, cache: "force-cache" },
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(adaptBackendJsonForProxy(body, res.ok), { status: res.status });
    }
    return NextResponse.json(adaptBackendJsonForProxy(body, res.ok), {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch {
    return NextResponse.json({ detail: "Upstream error" }, { status: 502 });
  }
}

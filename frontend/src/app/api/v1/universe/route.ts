/**
 * Next.js proxy for /api/v1/universe
 * Forwards the request to the FastAPI backend v1 endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPublicApiBaseUrl } from "@/lib/api-base";

export async function GET(req: NextRequest) {
  const base = getPublicApiBaseUrl().replace(/\/api\/?$/, "");
  const { searchParams } = req.nextUrl;
  const query = searchParams.toString();
  const url = `${base}/api/v1/universe${query ? `?${query}` : ""}`;

  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 502 }
    );
  }
}

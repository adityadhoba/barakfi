/**
 * Next.js proxy for /api/v1/stocks/{exchange}/{symbol}
 */

import { NextRequest, NextResponse } from "next/server";
import { getPublicApiBaseUrl } from "@/lib/api-base";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ exchange: string; symbol: string }> }
) {
  const { exchange, symbol } = await params;
  const base = getPublicApiBaseUrl().replace(/\/api\/?$/, "");
  const url = `${base}/api/v1/stocks/${exchange.toUpperCase()}/${symbol.toUpperCase()}`;

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

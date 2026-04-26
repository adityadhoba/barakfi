import { NextRequest, NextResponse } from "next/server";
import { getStocks } from "@/lib/api";

/**
 * Paginated stocks endpoint for the screener infinite loader.
 * GET /api/stocks-page?offset=100&limit=100
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "100", 10) || 100));

  try {
    const windowSize = offset + limit;
    const stocks = await getStocks({
      limit: windowSize,
      orderBy: "market_cap_desc",
      revalidateSeconds: 300,
    });
    const page = stocks.slice(offset, offset + limit);
    return NextResponse.json(page, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

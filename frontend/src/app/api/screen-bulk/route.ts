import { NextRequest, NextResponse } from "next/server";
import { getBulkScreeningResults } from "@/lib/api";

/**
 * Bulk screening results proxy for the screener infinite loader.
 * GET /api/screen-bulk?symbols=RELIANCE,TCS,INFY
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const symbolsParam = searchParams.get("symbols") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 200); // cap to prevent abuse

  if (symbols.length === 0) {
    return NextResponse.json([]);
  }

  try {
    const results = await getBulkScreeningResults(symbols);
    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

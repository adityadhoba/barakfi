import { NextResponse } from "next/server";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8001/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await context.params;
  const response = await fetch(`${apiBaseUrl}/screen/${encodeURIComponent(symbol)}`, {
    cache: "no-store",
  });

  const responseBody = await response.json();
  return NextResponse.json(responseBody, { status: response.status });
}

import { NextResponse } from "next/server";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8001/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await context.params;
  try {
    const response = await fetch(`${apiBaseUrl}/screen/${encodeURIComponent(symbol)}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { detail: `Screening failed for ${symbol}` },
        { status: response.status },
      );
    }

    const responseBody = await response.json();
    return NextResponse.json(responseBody, { status: response.status });
  } catch {
    return NextResponse.json(
      { detail: "Backend unavailable" },
      { status: 502 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/**
 * POST /api/revalidate-screener
 *
 * Called by the screening_recompute.py pipeline after it finishes recomputing
 * screening scores. Triggers on-demand ISR revalidation for the screener page
 * so users see fresh data immediately, without waiting for the 5-minute TTL.
 *
 * Protected by REVALIDATE_SECRET environment variable.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");
  const expectedSecret = process.env.REVALIDATE_SECRET;

  if (!expectedSecret) {
    return NextResponse.json({ error: "REVALIDATE_SECRET not configured" }, { status: 500 });
  }

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidatePath("/screener");
  return NextResponse.json({ revalidated: true, timestamp: new Date().toISOString() });
}

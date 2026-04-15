import { NextResponse } from "next/server";
import { getPublicApiBaseUrl } from "@/lib/api-base";

const BACKEND_URL = getPublicApiBaseUrl();

/**
 * Optional cron endpoint to keep a sleeping backend awake.
 * Enable a scheduler for this route only when your backend plan can sleep.
 */
export async function GET() {
  try {
    const healthUrl = BACKEND_URL.replace("/api", "/health");
    const res = await fetch(healthUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    const data = await res.json();
    return NextResponse.json({ ok: true, backend: data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { getPublicApiBaseUrl } from "@/lib/api-base";

const BACKEND_URL = getPublicApiBaseUrl();

/**
 * Cron endpoint to keep Render backend alive.
 * Render free tier sleeps after 15 minutes of inactivity.
 * Vercel cron hits this every 14 minutes to prevent cold starts.
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

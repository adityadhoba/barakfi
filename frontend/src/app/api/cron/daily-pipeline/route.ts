import { NextRequest, NextResponse } from "next/server";
import { getPublicApiBaseUrl } from "@/lib/api-base";

/** Vercel Pro/Enterprise; Hobby caps lower — see docs/data-freshness.md. */
export const maxDuration = 300;

/**
 * Vercel Cron: verifies `Authorization: Bearer ${CRON_SECRET}`, then calls the API
 * `POST /api/internal/daily-refresh` with `X-Internal-Service-Token`.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const internal = process.env.INTERNAL_SERVICE_TOKEN;
  if (!internal) {
    return NextResponse.json({ ok: false, error: "INTERNAL_SERVICE_TOKEN is not configured" }, { status: 503 });
  }

  const base = getPublicApiBaseUrl();
  const url = `${base.replace(/\/+$/, "")}/internal/daily-refresh`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-Internal-Service-Token": internal,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(280_000),
    });
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = { raw: text.slice(0, 500) };
    }
    if (!res.ok) {
      return NextResponse.json({ ok: false, upstreamStatus: res.status, body }, { status: 502 });
    }
    return NextResponse.json({ ok: true, body });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}

import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getAuthenticatedWatchlist, getBulkScreeningResults } from "@/lib/api";
import { buildBackendHeaders } from "@/lib/backend-auth";
import { getPublicApiBaseUrl, unwrapBackendEnvelope } from "@/lib/api-base";
import { WatchlistHtmlPage } from "@/components/watchlist-html-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Watchlist — BarakFi",
  description:
    "Track saved BarakFi stocks in one place with live prices, compliance labels, and a dedicated watchlist workflow.",
  alternates: { canonical: "/watchlist" },
  robots: { index: true, follow: true },
};

export default async function WatchlistPage() {
  const authState = await auth();
  const clerkUser = await currentUser();
  const token = await authState.getToken();

  if (!clerkUser || !token) {
    return <WatchlistHtmlPage signedIn={false} entries={[]} />;
  }

  // Fetch directly from backend on the server route.
  // Internal /api/watchlist proxy depends on browser cookie auth and can return
  // empty for server-to-server calls even when the user is signed in.
  const watchlist = await (async () => {
    try {
      const response = await fetch(`${getPublicApiBaseUrl()}/me/watchlist`, {
        method: "GET",
        headers: buildBackendHeaders({ token }),
        cache: "no-store",
      });
      if (!response.ok) return [];
      const body = await response.json().catch(() => []);
      return unwrapBackendEnvelope(body) as Awaited<ReturnType<typeof getAuthenticatedWatchlist>>;
    } catch {
      return [];
    }
  })();
  const symbols = watchlist.map((entry) => entry.stock.symbol);
  const screeningResults = symbols.length > 0 ? await getBulkScreeningResults(symbols).catch(() => []) : [];
  const screeningMap = new Map(screeningResults.map((result) => [result.symbol, result]));

  const entries = watchlist.map((entry) => ({
    ...entry,
    screening: screeningMap.get(entry.stock.symbol) || null,
  }));

  return <WatchlistHtmlPage signedIn={true} entries={entries} />;
}

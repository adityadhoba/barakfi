import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getAuthenticatedWatchlist, getBulkScreeningResults } from "@/lib/api";
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

  const watchlist = await getAuthenticatedWatchlist(token).catch(() => []);
  const symbols = watchlist.map((entry) => entry.stock.symbol);
  const screeningResults = symbols.length > 0 ? await getBulkScreeningResults(symbols).catch(() => []) : [];
  const screeningMap = new Map(screeningResults.map((result) => [result.symbol, result]));

  const entries = watchlist.map((entry) => ({
    ...entry,
    screening: screeningMap.get(entry.stock.symbol) || null,
  }));

  return <WatchlistHtmlPage signedIn={true} entries={entries} />;
}
